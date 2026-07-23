import requests

NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
gene = "THI2"
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
print(response)
print(ids)

