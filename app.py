import dataclasses
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from proteins import *
from generator import *
from analyze import *
from fastapi.middleware.cors import CORSMiddleware
from get_mutation_info import get_pdb_mutation_details
from mutation import *
from llm import *
import llm as llm_module
from fastapi.responses import FileResponse
from pathlib import Path
from typing import Optional
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

messages = {}
session_current_pdbs = {}


def get_messages(session_id):
    return messages.get(session_id, [])

class ChatQuery(BaseModel):
    query: str
    session_id: str
    pdb: Optional[str] = None
    current_pdb: Optional[str] = None

class ProteinQuery(BaseModel):
    query: str

class MutationRequest(BaseModel):
    sequence: str
    position: int
    new_residue: str

class MissenseQuery(BaseModel):
    uniprot: str
    mutation: str

class MutationQuery(BaseModel):
    accession: str

class CurrentPdbQuery(BaseModel):
    pdb: str
    session_id: Optional[str] = None

@app.post("/getProtein")
async def get_protein(protein: ProteinQuery):
    res = await ProteinService().search(protein.query)

    return {
        "protein": {
            "accession": res.uniprot["primaryAccession"],
            "name": res.uniprot["proteinDescription"]["recommendedName"]["fullName"]["value"],
            "sequence": res.uniprot["sequence"]["value"],
            "length": res.uniprot["sequence"]["length"],
        },
        "structures": res.structures,
        "mutations": [dataclasses.asdict(m) for m in res.mutations],
    }

@app.post("/set_current_pdb")
async def set_current_pdb(payload: CurrentPdbQuery):
    if payload.session_id:
        session_current_pdbs[payload.session_id] = payload.pdb
    llm_module.pdb_string = payload.pdb
    return {
        "ok": True,
        "session_id": payload.session_id,
        "pdb": payload.pdb,
    }

@app.post("/chat")
async def chat(question: ChatQuery):
    if question.session_id not in messages:
        messages[question.session_id] = []

    current_pdb = question.current_pdb or question.pdb or session_current_pdbs.get(question.session_id)
    if current_pdb:
        session_current_pdbs[question.session_id] = current_pdb
        llm_module.pdb_string = current_pdb

    messages[question.session_id].append(HumanMessage(content=question.query))
    state = {
        "messages": messages[question.session_id],
        "llm_calls": 0,
        "session_id": question.session_id,
        "pdb": current_pdb,
        "current_pdb": current_pdb,
    }
    response = await agent.ainvoke(state)
    called_my_tool = False

    for msg in response["messages"]:
        for tool_call in getattr(msg, "tool_calls", []):
            print(tool_call)
            if tool_call["name"] == "queryProtein":
                called_my_tool = True
    result = response["messages"][-1].content

    if isinstance(result, list):
        response_text = "".join(
            part.get("text", "") for part in result if isinstance(part, dict) and part.get("text")
        )
    elif isinstance(result, str):
        response_text = result
    else:
        response_text = str(result)

    # Extract pocket data from agent response
    pockets_data = None
    pockets_list = None
    if response.get("pockets"):
        raw_pockets = response["pockets"]
        print(f"Extracted pockets from response: {raw_pockets}")
        if isinstance(raw_pockets, list):
            pockets_list = raw_pockets
            if len(raw_pockets) > 0:
                first_pocket = raw_pockets[0]
                if isinstance(first_pocket, dict):
                    residue_ids = first_pocket.get("residue_ids", "")

                    # residue_ids format: "A_103 A_180 B_42"
                    if residue_ids:
                        first_residue = residue_ids.split()[0]  # Get first one: "A_103"
                        if "_" in first_residue:
                            chain, res_num = first_residue.split("_", 1)
                            try:
                                pockets_data = {"chain": chain, "residue": int(res_num)}
                            except ValueError:
                                print(f"Could not parse residue number from: {res_num}")
        elif isinstance(raw_pockets, dict):
            pockets_list = [raw_pockets]
            residue_ids = raw_pockets.get("residue_ids", "")
            if residue_ids:
                first_residue = residue_ids.split()[0]
                if "_" in first_residue:
                    chain, res_num = first_residue.split("_", 1)
                    try:
                        pockets_data = {"chain": chain, "residue": int(res_num)}
                    except ValueError:
                        print(f"Could not parse residue number from: {res_num}")

    active_pdb = response.get("current_pdb") or response.get("pdb") or current_pdb
    if active_pdb:
        session_current_pdbs[question.session_id] = active_pdb
        llm_module.pdb_string = active_pdb

    generated_pdb = None
    if called_my_tool:
        generated_pdb = response.get("pdb")

    print(pockets_data)

    return {
        "response": response_text,
        "pockets": pockets_data,
        "pockets_list": pockets_list,
        "generated_pdb": generated_pdb,
    }
@app.post("/search_missense")
def search_missense(query: MissenseQuery):
    alpha = AlphaMissenseService()
    return alpha.search(query.uniprot, query.mutation)

@app.post("/proteinDesign")
def design_protein(sequence):
    prodes = ProteinDesign()
    return prodes.protein_generation(sequence)

@app.post("/generateStructure")
def structure(sequence):
    api_url = "https://ebi.ac.uk"
    response = requests.get(api_url, params={"id": sequence})
    pdbUrl = response[0]["pdbUrl"]

    return {"url": pdbUrl}

@app.post("/queryProtein")
async def queryProtein(query):
    prodes = ProteinDesign()
    fp = fold_protein()
    seq = fp.generate_protein(query)["sequence"]
    family = fp.generate_protein(query)["family"]
    current_pdb = prodes.generate_structure(seq)
    llm_module.pdb_string = current_pdb
    return {
        "sequence": seq,
        "family": family,
        "pdb": current_pdb
    }

@app.post("/mutation_query")
async def mutation_query(accession: MutationQuery, session_id: Optional[str] = None):
    details = get_pdb_mutation_details(accession.accession, session_current_pdbs.get(session_id, llm_module.pdb_string))
    result = apply_point_mutation(
        pdb_string=details["pdb_string"],
        chain_id=details["chain_id"],
        position=details["pdb_res_num"],
        old_residue=details["old_residue"],
        new_residue=details["new_residue"],
    )
    print(result)
    return {"description": result["description"], "pdb_string": result["pdb_string"]}

@app.post("/mutation")
async def mutation_seq(sequence, protein_change):
    res_num = protein_change[1:-1]
    init_res = protein_change[1]
    final_res = protein_change[-1]
    sequence[res_num] = final_res

    async with httpx.AsyncClient() as client:
        response = await client.get("https://ebi.ac.uk", params={"sequence": sequence}, timeout=20)
        response.raise_for_status()
        job_data = response.json()

        job_id = job_data.get("job_id")
        status_url = f"https://ebi.ac.uk/status/{job_id}"

        while True:
            status_response = client.get(status_url)
            status_data = status_response.json()
            job_status = status_data.get("status")

            print(f"Job status: {job_status}...")
            if job_status == "COMPLETED":
                break
            elif job_status in ["FAILED", "CANCELLED"]:
                return "Search job failed on the server."

            await asyncio.sleep(5)

        results_url = (
            f"https://ebi.ac.uk/results/{job_id}"
        )
        results_response = client.get(results_url)
        results_data = results_response.json()

        found_alphafold = False
        for entry in results_data.get("uniprot_entries", []):
            for structure in entry.get("structures", []):
                if structure.get("model_provider") == "AlphaFold DB":
                    pdb_url = structure.get("model_url")
                    uniprot_acc = entry.get("uniprot_accession")

                    print(f"\nFound AlphaFold Match for UniProt: {uniprot_acc}")
                    print(f"Downloading PDB structure: {pdb_url}")

                    file_data = await client.get(pdb_url).text
                    return file_data

@app.get("/health")
async def health():
    return {"status": "ok"}