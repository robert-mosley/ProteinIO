import dataclasses
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from proteins import *
from generator import *
from analyze import *
from fastapi.middleware.cors import CORSMiddleware
from llm import *
from fastapi.responses import FileResponse
from pathlib import Path

app = FastAPI()
origins = [
    "http://localhost:8000",
    "http://localhost:5000",
    "http://10.0.0.19:8000",
    "http://10.0.0.19:5000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

messages = []

class ChatQuery(BaseModel):
    query: str
    session_id: str

class ProteinQuery(BaseModel):
    query: str

class MissenseQuery(BaseModel):
    uniprot: str
    mutation: str

class UnknownMutation(BaseModel):
    sequence: str
    index: int
    mut: str

@app.post("/getProtein")
async def get_protein(protein: ProteinQuery):
    protein = ProteinService().search(protein.query)

    return {
        "protein": {
            "accession": protein.uniprot["primaryAccession"],
            "name": protein.uniprot["proteinDescription"]["recommendedName"]["fullName"]["value"],
            "sequence": protein.uniprot["sequence"]["value"],
            "length": protein.uniprot["sequence"]["length"],
        },
        "structures": protein.structures,
        "mutations": [dataclasses.asdict(m) for m in protein.mutations],
    }

@app.post("/chat")
async def chat(question: ChatQuery):
    messages.append(HumanMessage(content=question.query))
    state = {"messages": messages, "llm_calls": 0, "session_id": question.session_id}
    response = await agent.ainvoke(state)
    called_my_tool = False

    for msg in response["messages"]:
        for tool_call in getattr(msg, "tool_calls", []):
            print(tool_call)
            if tool_call["name"] == "queryProtein":
                called_my_tool = True
    result = response["messages"][-1].content
    if called_my_tool == True:
        pdb = "yes"
    else:
        pdb = "no"
    return {
        "response": result[0]["text"],
        "pdb": pdb
    }


@app.post("/search_missense")
def search_missense(query: MissenseQuery):
    alpha = AlphaMissenseService()
    return alpha.search(query.uniprot, query.mutation)

@app.post("/search_unknown_mutation")
def search_unknown(variant: UnknownMutation):
    esms = ESMService()
    return esms.mutation(variant.sequence, variant.index, variant.mut)

@app.post("/proteinDesign")
def design_protein(sequence):
    prodes = ProteinDesign()
    return prodes.protein_generation(sequence)

@app.post("/generateStructure")
def structure(sequence):
    prodes = ProteinDesign()
    return prodes.generate_structure(sequence)

@app.post("/queryProtein")
def queryProtein(query):
    prodes = ProteinDesign()
    fp = fold_protein()
    seq = fp.generate_protein(query)["sequence"]
    family = fp.generate_protein(query)["family"]
    return {
        "sequence": seq,
        "family": family,
        "pdb": prodes.generate_structure(seq)
    }

@app.get("/pdb")
def get_pdb():
    path = Path("mutant.pdb")
    print(path.resolve())
    print(path.exists())

    return FileResponse(path)