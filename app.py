from fastapi import FastAPI
from pydantic import BaseModel
from proteins import *
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
origins = [
    "http://localhost:8000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
messages = []

class ProteinQuery(BaseModel):
    query: str

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
        "mutations": protein.mutations,
    }
"""
@app.get("/chat")
async def chat(question):
    messages.append(HumanMessage(content=question))
    state = {"messages": messages}
    response = agent.invoke(state)
    return {
        "response": response["messages"][-1].content
    }
"""