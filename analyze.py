import sqlite3
from esm.sdk.api import ESMProtein, GenerationConfig
from esm.models.esm3 import ESM3
import torch

pd_model = ESM3.from_pretrained("esm3_sm_open_v1")
print("model_loaded")

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
        return {
            "uniprot_id": row[0],
            "protein_variant": row[1],
            "score": row[2],
            "classification": row[3]
        }

class ESMService():
    def __init__(self):
        self.model = ESM3.from_pretrained("esm3_sm_open_v1")

    def mutation(self, sequence, index, mut):
        protein = ESMProtein(sequence=sequence)
        tensor = self.model.infer_protein_tensor(protein)
        logits = tensor.logits

        prev = sequence[index]
        prev_token_id = self.model.tokenizer.encoder(prev)[0]
        mut_token_id = self.model.tokenizer.encoder(mut)[0]

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
        designed_protein = pd_model.generate(protein, config)
        return designed_protein.sequence
    def generate_structure(self, sequence):
        protein = ESMProtein(sequence=sequence)

        # Mask structure so ESM3 predicts it
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

        return predicted_protein.to_pdb("mutant.pdb")