import httpx
import requests
from dataclasses import dataclass
from typing import List, Dict, Optional

NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
UNIPROT_URL = "https://rest.uniprot.org/uniprotkb/search"
SEARCH_URL = "https://search.rcsb.org/rcsbsearch/v2/query"
DETAIL_URL = "https://data.rcsb.org/rest/v1/core/entry"
BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
current_pdb = None

@dataclass
class Structure:
    id: str
    title: str
    method: str
    download_url: str

@dataclass
class Mutation:
    source: str
    accession: str
    title: str
    clinical_significance: Optional[str] = None

@dataclass
class Protein:
    query: str
    uniprot: Dict
    structures: List[Structure]
    mutations: List[Mutation]

class UniProtService:
    async def search(self, query):
        async with httpx.AsyncClient() as client:
            response = await client.get(UNIPROT_URL, params={
                "query": query,
                "format": "json",
                "size": 5
            }, timeout=20)
        response.raise_for_status()

        data = response.json()

        if not data["results"]:
            raise ValueError(f"No UniProt entry found for '{query}'")

        return data["results"][0]

    async def get_variants(self, protein: dict) -> list[Mutation]:
        mutations = []
        for feature in protein.get("features", []):

            if feature.get("type") != "Natural variant":
                continue

            mutations.append(
                Mutation(
                    source="UniProt",
                    accession=feature.get("featureId", ""),
                    title=feature.get("description", ""),
                    clinical_significance=None
                )
            )

        return mutations


class ClinVarService:
    async def search(self, gene: str) -> list[Mutation]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{NCBI_BASE}/esearch.fcgi",
                params={
                    "db": "clinvar",
                    "term": gene,
                    "retmode": "json"
                },
                timeout=20
            )

        response.raise_for_status()

        ids = response.json()["esearchresult"]["idlist"]

        if not ids:
            return []

        async with httpx.AsyncClient() as client:
            summary = await client.get(
                f"{NCBI_BASE}/esummary.fcgi",
                params={
                    "db": "clinvar",
                    "id": ",".join(ids[:20]),
                    "retmode": "json"
                },
                timeout=20
            )

        summary.raise_for_status()

        data = summary.json()

        mutations = []

        for uid in data["result"]["uids"]:
            item = data["result"][uid]
            print(item)

            classification = item.get("germline_classification", {})

            mutations.append(
                Mutation(
                    source="ClinVar",
                    accession=item.get("accession", ""),
                    title=item.get("title", ""),
                    clinical_significance=classification.get("description")
                )
            )

        return mutations

class Mutations:
    async def search(self, gene):
        params = {
            "db": "clinvar",
            "term": gene,
            "retmode": "json"
        }

        async with httpx.AsyncClient() as client:
            r = await client.get(f"{BASE}/esearch.fcgi", params=params, timeout=20)
        r.raise_for_status()

        return r.json()["esearchresult"]["idlist"]

    async def fetch(self, ids):
        if not ids:
            return None

        params = {
            "db": "clinvar",
            "id": ",".join(ids),
            "retmode": "xml"
        }
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{BASE}/efetch.fcgi", params=params, timeout=20)
        r.raise_for_status()

        return r.text

class PDBService:
    async def search(self, gene_name: str):
        query = {
            "query": {
                "type": "terminal",
                "service": "full_text",
                "parameters": {
                    "value": gene_name
                }
            },
            "return_type": "entry",
            "request_options": {
                "results_verbosity": "minimal",
                "paginate": {"start": 0, "rows": 10}
            }
        }
        print(gene_name)
        async with httpx.AsyncClient() as client:
            response = await client.post(
                SEARCH_URL,
                json=query,
                timeout=20
            )

        # RCSB returns 204 No Content when there are no results
        if response.status_code == 204 or not response.text.strip():
            return []

        response.raise_for_status()

        data = response.json()

        return [
            item["identifier"]
            for item in data.get("result_set", [])
        ]

    async def get_structure(self, pdb_id: str):
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{DETAIL_URL}/{pdb_id}", timeout=20)
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

    async def search(self, query) -> Protein:
        uniprot = await self.uniprot.search(query)
        structures = []
        pdb_ids = await self.pdb.search(query)
        for pdb_id in pdb_ids[:5]:
            try:
                structures.append(
                    await self.pdb.get_structure(pdb_id)
                )
            except Exception:
                pass
        gene_name = None
        if uniprot.get("genes"):
            gene_name = uniprot["genes"][0]["geneName"]["value"]

        mutations = await self.clinvar.search(gene_name)

        return Protein(
            query=query,
            uniprot=uniprot,
            structures=structures,
            mutations=mutations
        )