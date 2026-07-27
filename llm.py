import os
from langgraph.graph import StateGraph, START, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.messages import AnyMessage, SystemMessage, AIMessage, HumanMessage, ToolMessage
from langchain.tools import tool
import operator
from typing import TypedDict, Annotated
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
from generator import fold_protein
from analyze import *
from proteins import *
from events import manager
import asyncio
import json

CURRENT_SESSION = None

load_dotenv()
app = FastAPI()
model = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash-lite",
    temperature=0
)

class MessageState(TypedDict):
    messages: Annotated[list[AnyMessage], operator.add]
    llm_calls: int
    session_id: str

@tool
def queryProtein(query, session_id):
    """
    Generate a novel protein from a natural language specification.

    The input should be a detailed protein design prompt rather than the user's
    original request.

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

    prodes = ProteinDesign()
    fp = fold_protein()
    print(query)
    gen = fp.generate_protein(query)
    return {
        "sequence": gen["sequence"],
        "family": gen["family"],
    }

@tool
def protein_getter(query):
    "Retrieve information about a certain protein such a structures information and mutations."
    protein = ProteinService().search(query)
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
        },
        "structures": structures,
        "mutations": mutations,
    }

tools = [protein_getter, queryProtein]
model_tools = model.bind_tools(tools)

tools_by_name = {tool.name: tool for tool in tools}


async def ask_model_with_tools(state):
    response = await model_tools.ainvoke(
        [
            SystemMessage(content="""Implement a mutation workspace for ProteinIO. Do not modify any unrelated files or redesign the application.

When the user selects a mutation (e.g. L858R), show a "Generate Mutant Structure" button.

When clicked:
- Use the currently loaded wild-type PDB.
- Apply the point mutation with PDBFixer.
- Preserve the backbone.
- Add missing atoms/hydrogens.
- Run a short OpenMM energy minimization.
- Return the mutant PDB and a short description of the mutation.
- Automatically load the mutant PDB into the Mol* viewer.
- Allow switching between the wild-type and mutant structures.
- Handle residue numbering or chain mismatches gracefully with clear error messages.

Do not use AI to generate the mutation. Use PDBFixer and OpenMM only."""),
        ] + state["messages"]
    )
    return {
        "messages": [response],
        "llm_calls": state.get("llm_calls", 0) + 1
    }
async def tool_call(state: dict):
    result = []
    for tool_call in state["messages"][-1].tool_calls:
        tool = tools_by_name[tool_call["name"]]
        observation = await tool.ainvoke(tool_call["args"])

        result.append(ToolMessage(content=json.dumps(observation), tool_call_id=tool_call["id"]))
    return {"messages": result}

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