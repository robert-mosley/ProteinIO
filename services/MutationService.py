from Bio.PDB import NeighborSearch, PDBParser
import io
from proteins import *
from Bio.SeqUtils import seq1

def parse_mutation(protein_change: str):
    match = re.fullmatch(
        r"([A-Z])(\d+)([A-Z])",
        protein_change.upper()
    )

    if not match:
        raise ValueError(
            f"Invalid mutation format: {protein_change}"
        )

    original = match.group(1)
    position = int(match.group(2))
    new = match.group(3)

    return {
        "original": original,
        "position": position,
        "new": new
    }

def get_protein_residues(chain):
    residues = []
    for residue in chain:
        if residue.id[0] != " ":
            continue

        try:
            aa = seq1(residue.resname)
        except KeyError:
            continue
        if len(aa) == 1:
            residues.append(residue)

    return residues

def residues_to_sequence(residues):
    sequence = ""
    for residue in residues:
        try:
            sequence += seq1(residue.resname)
        except KeyError:
            sequence += "X"

    return sequence

def get_protein_chains(model):

    chains = []

    for chain in model:

        residues = get_protein_residues(chain)

        if len(residues) > 0:
            chains.append({
                "chain_id": chain.id,
                "residues": residues,
                "sequence": residues_to_sequence(residues)
            })

    return chains

def find_domain(self, position):
    protein = self.uniprot.search(self.protein)
    domains = self.uniprot.get_domains(protein)

    for domain in domains:
        if domain["start"] <= position <= domain["end"]:
            return domain

    return None