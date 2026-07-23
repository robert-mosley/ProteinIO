import requests
from dataclasses import dataclass
from typing import List, Dict, Optional

NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
UNIPROT_URL = "https://rest.uniprot.org/uniprotkb/search"
SEARCH_URL = "https://search.rcsb.org/rcsbsearch/v2/query"
DETAIL_URL = "https://data.rcsb.org/rest/v1/core/entry"
BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

@dataclass
class Structure:
    id: str
    title: str
    method: str
    download_url: str

@dataclass
class Mutation:
    accession: str
    title: str

@dataclass
class Protein:
    query: str
    uniprot: Dict
    structures: List[Structure]
    mutations: List[Mutation]

class UniProtService:
    def search(self, query):
        response = requests.get(UNIPROT_URL, params={
            "query": query,
            "format": "json",
            "size": 5
        })
        response.raise_for_status()

        data = response.json()

        if not data["results"]:
            raise ValueError(f"No UniProt entry found for '{query}'")

        return data["results"][0]


class ClinVarService:
    def search(self, gene: str) -> List[Mutation]:
        response = requests.get(
            f"{NCBI_BASE}/esearch.fcgi",
            params={
                "db": "clinvar",
                "term": gene,
                "retmode": "json"
            }
        )

        response.raise_for_status()
        ids = response.json()["esearchresult"]["idlist"]
        if not ids:
            return []
        
        summary = requests.get(
            f"{NCBI_BASE}/esummary.fcgi",
            params={
                "db": "clinvar",
                "id": ",".join(ids[:20]),
                "retmode": "json"
            }
        )
        summary.raise_for_status()
        data = summary.json()
        mutations = []
        for uid in data["result"]["uids"]:
            item = data["result"][uid]
            mutations.append(Mutation(accession=item.get("accession", ""),title=item.get("title", "")))

        return mutations

class Mutations:
    def search(self, gene):
        params = {
            "db": "clinvar",
            "term": gene,
            "retmode": "json"
        }

        r = requests.get(f"{BASE}/esearch.fcgi", params=params)
        r.raise_for_status()

        return r.json()["esearchresult"]["idlist"]

    def fetch(self, ids):
        if not ids:
            return None

        params = {
            "db": "clinvar",
            "id": ",".join(ids),
            "retmode": "xml"
        }
        r = requests.get(f"{BASE}/efetch.fcgi", params=params)
        r.raise_for_status()

        return r.text

class PDBService:
    def search(self, gene_name: str):
        query = {
            "query": {
                "type": "terminal",
                "service": "text",
                "parameters": {
                    "attribute": "rcsb_entity_source_organism.rcsb_gene_name.value",
                    "operator": "exact_match",
                    "value": gene_name
                }
            },
            "return_type": "entry"
        }

        response = requests.post(
            SEARCH_URL,
            json=query
        )

        response.raise_for_status()

        data = response.json()

        return [
            item["identifier"]
            for item in data.get("result_set", [])
        ]

    def get_structure(self, pdb_id: str):
        response = requests.get(f"{DETAIL_URL}/{pdb_id}")
        response.raise_for_status()
        data = response.json()

        return {
            "id": data["rcsb_id"],
            "title": data["struct"]["title"],
            "method": data["exptl"][0]["method"],
            "download_url": f"https://files.rcsb.org/download/{pdb_id}.pdb"
        }
class ProteinService:
    def __init__(self):
        self.uniprot = UniProtService()
        self.clinvar = ClinVarService()
        self.pdb = PDBService()

    def search(self, query) -> Protein:
        uniprot = self.uniprot.search(query)
        structures = []
        pdb_ids = self.pdb.search(query)
        for pdb_id in pdb_ids[:5]:
            try:
                structures.append(
                    self.pdb.get_structure(pdb_id)
                )
            except Exception:
                pass

        mutations = self.clinvar.search(query)

        return Protein(
            query=query,
            uniprot=uniprot,
            structures=structures,
            mutations=mutations
        )

