import sqlite3
from esm.sdk.api import ESMProtein, GenerationConfig
from esm.models.esm3 import ESM3
import requests
import torch
import io
from esm.pretrained import load_local_model
#clear cache
"""
torch.cuda.empty_cache()
#clear memory
torch.cuda.reset_peak_memory_stats()

device = torch.device("cpu")

pd_model = load_local_model(
    "esm3_sm_open_v1",
    device=device,
)

pd_model = pd_model.to(
    device=torch.device("cuda"),
    dtype=torch.bfloat16,
)

pd_model.eval()
"""
class AlphaMissenseService():
    def __init__(self):
        self.conn = sqlite3.connect("alphamissense.db")

    def search(self, uniprot_id, variant):
        cursor = self.conn.cursor()
        cursor.execute("""
SELECT *
FROM variants
WHERE uniprot_id = ?
AND protein_variant = ?
""", (uniprot_id, variant))

        row = cursor.fetchone()

        cursor.close()
        self.conn.close()
        return {
            "uniprot_id": row[0],
            "protein_variant": row[1],
            "score": row[2],
            "classification": row[3]
        }

class ESMService():
    def mutation(self, sequence, index, mut):
        protein = ESMProtein(sequence=sequence)
        tensor = pd_model.infer_protein_tensor(protein)
        logits = tensor.logits

        prev = sequence[index]
        prev_token_id = pd_model.tokenizer.encoder(prev)[0]
        mut_token_id = pd_model.tokenizer.encoder(mut)[0]

        score1 = logits[index, prev_token_id].item()
        score2 = logits[index, mut_token_id].item()
        llr = score2 - score1

        return {"llr": llr}

from esm.sdk.api import ESMProtein, GenerationConfig
from esm.models.esm3 import ESM3

class ProteinDesign():
    def protein_generation(self, sequence):
        protein = ESMProtein(sequence=sequence)
        config = GenerationConfig(temperature=0.7, top_p=0.9)
        with torch.inference_mode():
            predicted_protein = pd_model.generate(
                protein,
                config
            )

        return predicted_protein.sequence
    def generate_structure(self, sequence):
        protein = ESMProtein(sequence=sequence)

        protein.coordinates = None

        config = GenerationConfig(
            track="structure",
            num_steps=max(1, len(sequence) // 8),
            temperature=0.7,
        )

        predicted_protein = pd_model.generate(
            protein,
            config
        )
        pdb_buffer = io.StringIO()
        predicted_protein.to_pdb(pdb_buffer)
        print(pdb_buffer.getvalue())
        return pdb_buffer.getvalue()
