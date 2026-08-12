import os
import tempfile
import pandas as pd
import httpx
from langgraph.graph import StateGraph, START, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import AnyMessage, SystemMessage, AIMessage, HumanMessage, ToolMessage
from langchain.tools import tool
import operator
from typing import TypedDict, Annotated
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
from generator import fold_protein
from analyze import *
from proteins import *
import asyncio
import json
from pathlib import Path

CURRENT_SESSION = None
pdb_string = None

load_dotenv()
app = FastAPI()
model = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash-lite",
    temperature=0,
    google_api_key=os.environ["GEMINI_API_KEY"]
)

async def resolve_pdb_text(pdb_value):
    if not pdb_value:
        return None

    if isinstance(pdb_value, str) and pdb_value.startswith(("http://", "https://")):
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(pdb_value)
            response.raise_for_status()
            return response.text

    return pdb_value

class MessageState(TypedDict):
    messages: Annotated[list[AnyMessage], operator.add]
    llm_calls: int
    session_id: str
    pockets: str | None
    pdb: str | None
    current_pdb: str | None

@tool
async def predict_pockets(state: MessageState):
    """Predict ligand-binding pockets for the protein structure currently loaded 
    in the session. Call this whenever the user asks to find binding pockets 
    in a protein."""
    pdb_source = state.get("current_pdb") or state.get("pdb") or pdb_string
    pdb_text = await resolve_pdb_text(pdb_source)

    if not pdb_text:
        raise ValueError(
            "No protein structure is currently available for p2rank analysis."
        )

    # Find P2Rank relative to this Python file
    BASE_DIR = Path(__file__).resolve().parent
    P2RANK_DIR = BASE_DIR / "p2rank"
    PRANK = P2RANK_DIR / "prank.sh"

    # Debugging / Render logs
    print("BASE_DIR:", BASE_DIR)
    print("P2RANK_DIR:", P2RANK_DIR)
    print("P2RANK EXISTS:", P2RANK_DIR.exists())
    print("PRANK EXISTS:", PRANK.exists())

    if not P2RANK_DIR.exists():
        raise FileNotFoundError(
            f"P2Rank directory not found: {P2RANK_DIR}"
        )

    if not PRANK.exists():
        raise FileNotFoundError(
            f"prank.sh not found: {PRANK}"
        )

    with tempfile.TemporaryDirectory() as tmpdir:
        pdb_path = os.path.join(tmpdir, "protein.pdb")

        with open(pdb_path, "w") as f:
            f.write(pdb_text)

        process = await asyncio.create_subprocess_exec(
            "./prank.sh",
            "predict",
            "-f",
            pdb_path,
            "-o",
            tmpdir,
            cwd="p2rank"
        )

        await process.wait()

        prediction_file = os.path.join(
            tmpdir,
            "protein.pdb_predictions.csv"
        )
        atom_count = pdb_text.count("ATOM")



        if not os.path.exists(prediction_file):
            raise ValueError("P2Rank did not produce a prediction file.")

        pockets_df = pd.read_csv(prediction_file)
        print("Predicted pockets (raw):", pockets_df)
        print(pdb_text[:500])

        # Normalize column names and string values so downstream parsing is robust
        raw_records = pockets_df.to_dict(orient="records")
        cleaned_records = []
        for rec in raw_records:
            cleaned = {}
            for k, v in rec.items():
                if isinstance(k, str):
                    nk = k.strip()
                else:
                    nk = k
                if isinstance(v, str):
                    nv = v.strip()
                else:
                    nv = v
                cleaned[nk] = nv

            # Normalize residue_ids spacing (e.g. " C_32 C_34" -> "C_32 C_34")
            if "residue_ids" in cleaned and isinstance(cleaned["residue_ids"], str):
                cleaned["residue_ids"] = " ".join(cleaned["residue_ids"].split())

            cleaned_records.append(cleaned)

        return {"pockets": cleaned_records}

@tool
async def searchProteinFromDisease(disease_name: str):
    """search proteins by querying the disDenNet database for a given disease name and returning a list of associated proteins."""
    BASE_URL = "https://api.platform.opentargets.org/api/v4/graphql"
    query = """
    query SearchDisease($name: String!) {
        search(queryString: $name) {
        hits {
            id
            name
        }
        }
    }
    """

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            BASE_URL,
            json={
                "query": query,
                "variables": {
                    "name": disease_name
                }
            }
        )

    return response.json()

@tool
async def queryProtein(query, session_id):
    """
    Generate a novel protein from a natural language specification.

    The input should be a detailed protein design prompt rather than the user's
    original request. It should onlt include the protein which is usually just 4 capital letters.

    The prompt should include:
    - The desired biological function.
    - Target protein family or fold if known.
    - Desired binding target, substrate, or ligand.
    - Organism or expression host if relevant.
    - Desired localization (cytosolic, membrane, secreted, etc.).
    - Desired structural properties (monomeric, multimeric, soluble, thermostable).
    - Any catalytic activity or functional motifs.
    - Any constraints that improve the design.

    Write the prompt in scientific language suitable for a protein language model.
    Do not include explanations, markdown, or conversational text.
    """

    probes = ProteinDesign()
    fp = fold_protein()
    print(query)
    gen = fp.generate_protein(query)
    global pdb_string
    pdb_string = probes.generate_structure(gen["sequence"])

    return {
        "sequence": gen["sequence"],
        "pdb": pdb_string,
        "current_pdb": pdb_string,
    }

@tool
async def protein_getter(query):
    "Retrieve information about a certain protein such a structures information and mutations. Don't use to find binding pockets"
    protein = await ProteinService().search(query)
    protein_info = protein.uniprot["primaryAccession"]
    structures = []
    mutations = []

    for s in protein.structures:
        structures.append(s)

    for m in protein.mutations:
        mutations.append(m)

    return {
        "protein": {
            "accession": protein.uniprot["primaryAccession"],
            "name": protein.uniprot["proteinDescription"]["recommendedName"]["fullName"]["value"],
            "sequence": protein.uniprot["sequence"]["value"],
            "length": protein.uniprot["sequence"]["length"],
        }
    }

tools = [predict_pockets, protein_getter, queryProtein, searchProteinFromDisease]
model_tools = model.bind_tools(tools)

tools_by_name = {tool.name: tool for tool in tools}


async def ask_model_with_tools(state):
    response = await model_tools.ainvoke(
        [
            SystemMessage(content="""You are ProteinIO,
an AI assistant for protein research.

Help users understand proteins,
mutations,
protein structure,
protein function,
and experimental results.

Do not fabricate scientific claims.

Use the available tools when appropriate. 

If uncertain,
say you are uncertain."""),
        ] + state["messages"]
    )
    return {
        "messages": [response],
        "llm_calls": state.get("llm_calls", 0) + 1
    }
async def tool_call(state: MessageState):
    result = []
    pdb = state.get("pdb")  # Preserve existing value if there is one
    current_pdb = state.get("current_pdb") or pdb or pdb_string
    pockets = state.get("pockets")

    for tool_call in state["messages"][-1].tool_calls:
        tool = tools_by_name[tool_call["name"]]
        print(tool)
        observation = await tool.ainvoke(tool_call["args"])

        if isinstance(observation, dict):
            if "pdb" in observation:
                pdb = observation["pdb"]
            if "current_pdb" in observation:
                current_pdb = observation["current_pdb"]
            if isinstance(observation.get("pockets"), list):
                pockets = observation["pockets"]

        result.append(
            ToolMessage(
                content=json.dumps(observation),
                tool_call_id=tool_call["id"],
            )
        )

    return {
        "messages": result,
        "pdb": pdb,
        "current_pdb": current_pdb,
        "pockets": pockets,
    }

async def should_continue(state: dict):
    messages = state["messages"]
    last_message = messages[-1]

    if last_message.tool_calls:
        return "tool_node"

    return END

agent_graph = StateGraph(MessageState)
agent_graph.add_node("llm_call", ask_model_with_tools)
agent_graph.add_node("tool_node", tool_call)

agent_graph.add_edge(START, "llm_call")
agent_graph.add_conditional_edges("llm_call", should_continue, ["tool_node", END])
agent_graph.add_edge("tool_node", "llm_call")
agent = agent_graph.compile()