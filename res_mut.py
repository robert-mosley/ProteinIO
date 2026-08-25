import httpx
import asyncio


HMMER_URL = "https://www.ebi.ac.uk/Tools/hmmer/api/v1"


async def mutation_seq(sequence, protein_change):

    sequence = sequence.replace("\n", "").replace(" ", "")

    # Apply mutation
    pos = int(protein_change[1:-1])
    final_res = protein_change[-1]

    mutated_sequence = (
        sequence[:pos - 1]
        + final_res
        + sequence[pos:]
    )

    # Search ORIGINAL sequence
    async with httpx.AsyncClient() as client:

        response = await client.post(
            "https://www.ebi.ac.uk/Tools/hmmer/api/v1/search/phmmer",
            json={
                "database": "uniprot",
                "input": sequence,
            },
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            timeout=30,
        )

        response.raise_for_status()

        job_id = response.json()["id"]

        # Poll
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
            "original_sequence": sequence,
            "mutated_sequence": mutated_sequence,
            "pdb_string": pdb_response.text,
        }
result = asyncio.run(
    mutation_seq(
        """MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPK
VKAHGKKVLGAFSDGLAHLDNLKGTFATLSELHCDKLHVDPENFRLLGNVLVCVLAHHFG
KEFTPPVQAAYQKVVAGVANALAHKYH""",
        "P6V"
    )
)

print(result["pdb_string"])