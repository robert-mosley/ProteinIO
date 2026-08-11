from gradio_client import Client

import re

def extract_sequence(raw_output):
    raw_output = raw_output.strip()

    if "> Superfamily=<" in raw_output:
        seq = raw_output.split("> Superfamily=<", 1)[0]
        seq = re.sub(r"[^ACDEFGHIKLMNPQRSTVWY]", "", seq.upper())
        return seq

    match = re.search(r"Seq=<([ACDEFGHIKLMNPQRSTVWY]+)>", raw_output, re.IGNORECASE)
    if match:
        return match.group(1)

    matches = re.findall(r"[ACDEFGHIKLMNPQRSTVWY]{30,}", raw_output.upper())
    if matches:
        return max(matches, key=len)

    return ""

class fold_protein():
    def __init__(self):
        self.client = Client("robertthecreator/proteinIO")
    def generate_protein(self, protein_prompt):
        raw, seq = self.client.predict(
            protein_prompt,
            200,
            api_name="/generate_protein",
        )

        raw = extract_sequence(raw)

        return {
            "raw": raw,
            "sequence": raw
        }