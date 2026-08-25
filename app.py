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
from services.MutationInterface import *

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
current_protein = None

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
    protein_change: str

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
    global current_protein
    current_protein = protein.query

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

    text = "The current protein is " + current_protein + " response to user: " + question.query

    messages[question.session_id].append(HumanMessage(content=text))
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
async def mutation_seq(req: MutationRequest):
    req.sequence = req.sequence.replace("\n", "").replace(" ", "")
    protein_changes = [
        change.strip()
        for change in req.protein_change.split(",")
        if change.strip()
    ]
    for protein_change in protein_changes:
        print(protein_change[1:-1])
        pos = int(protein_change[1:-1])
        final_res = protein_change[-1]

        req.sequence = (
            req.sequence[:pos - 1]
            + final_res
            + req.sequence[pos:]
        )

    mutation_sequence = req.sequence

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://www.ebi.ac.uk/Tools/hmmer/api/v1/search/phmmer",
            json={
                "database": "uniprot",
                "input": req.sequence,
            },
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            timeout=30,
        )

        response.raise_for_status()
        job_id = response.json()["id"]
        result_url = (
            f"https://www.ebi.ac.uk/Tools/hmmer/api/v1/result/{job_id}"
        )

        while True:
            try:
                result_response = await client.get(
                    result_url,
                    headers={"Accept": "application/json"},
                    timeout=120,
                )

                result_response.raise_for_status()
                result_data = result_response.json()

                status = result_data["status"]

                print(f"Job status: {status}")
                if status == "SUCCESS":
                    break
                if status in ["FAILURE", "ERROR", "CANCELLED"]:
                    raise RuntimeError(result_data)

            except httpx.ReadTimeout:
                print("Timeout; retrying...")

            await asyncio.sleep(10)

        hits = result_data["result"]["hits"]
        best_hit = hits[0]
        uniprot_acc = best_hit["metadata"]["uniprot_accession"]

        print("UniProt:", uniprot_acc)

        pdb_url = (
            f"https://alphafold.ebi.ac.uk/files/"
            f"AF-{uniprot_acc}-F1-model_v6.pdb"
        )

        pdb_response = await client.get(
            pdb_url,
            timeout=60,
        )

        if pdb_response.status_code != 200:
            return {
                "error": "AlphaFold structure not found",
                "uniprot_accession": uniprot_acc,
            }

        return {
            "uniprot_accession": uniprot_acc,
            "original_sequence": req.sequence,
            "mutated_sequence": mutated_sequence,
            "pdb_string": pdb_response.text,
        }

async def analyze_mutation(
    protein,
    pdb_text,
    protein_change
):

    # -------------------------
    # Parse mutation
    # -------------------------

    mutation = MutationService.parse_mutation(
        protein_change
    )

    position = mutation["position"]
    original = mutation["original"]
    new = mutation["new"]

    # -------------------------
    # Validate sequence
    # -------------------------

    sequence = (
        protein
        .get("sequence", {})
        .get("value", "")
    )

    if not sequence:

        raise ValueError(
            "Protein sequence not found"
        )

    if position > len(sequence):

        raise ValueError(
            f"Mutation position {position} "
            f"is outside sequence length "
            f"{len(sequence)}"
        )

    actual_residue = sequence[
        position - 1
    ]

    if actual_residue != original:

        raise ValueError(
            f"{protein_change} does not match "
            f"the UniProt sequence. "
            f"Position {position} contains "
            f"{actual_residue}, not {original}."
        )

    uniprot = UniProtService()

    domains = await uniprot.get_domains(
        protein
    )

    domain = MutationService.find_domain(
        position,
        domains
    )

    structure = MutationService.load_structure(
        pdb_text
    )

    matches = MutationService.find_mutation_residues(
        structure,
        position,
        original
    )

    if not matches:

        raise ValueError(
            f"Could not find {original}{position} "
            f"in structure"
        )
    structural_results = []

    for match in matches:
        chain_id = match["chain"]
        residue = match["residue"]
        nearby = MutationService.find_nearby_residues(
            structure,
            residue,
            radius=5.0
        )

        raw_interfaces = MutationService.find_interfaces(
            structure,
            cutoff=5.0
        )

        interfaces = MutationService.summarize_interfaces(
            raw_interfaces
        )

        mutation_interfaces = (
            MutationService.mutation_interface_context(
                chain_id,
                position,
                interfaces
            )
        )

        structural_results.append({
            "chain": chain_id,

            "residue": {
                "name": residue.resname,
                "position": position
            },

            "nearby_residues": nearby,

            "interfaces":
                mutation_interfaces
        })

    return {
        "mutation": {
            "protein_change":
                protein_change,
            "original":
                original,
            "position":
                position,
            "new":
                new
        },

        "protein": {
            "name": protein
                .get("proteinDescription", {}),
            "sequence_length":
                len(sequence)
        },

        "domain": domain,

        "structure": structural_results
    }

@app.get("/health")
async def health():
    return {"status": "ok"}