from Bio.PDB import PDBParser, Superimposer
from Bio.Align import PairwiseAligner
from Bio.SeqUtils import seq1
import numpy as np

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

def align_sequences(seq1_string, seq2_string):

    aligner = PairwiseAligner()

    aligner.match_score = 1
    aligner.mismatch_score = -1
    aligner.open_gap_score = -2
    aligner.extend_gap_score = -0.5

    alignment = aligner.align(
        seq1_string,
        seq2_string
    )[0]

    return alignment

def build_residue_mapping(
    alignment,
    residues1,
    residues2
):

    aligned_seq1 = str(alignment[0])
    aligned_seq2 = str(alignment[1])

    mapping = []

    i = 0
    j = 0

    identical = 0
    aligned_residues = 0

    for aa1, aa2 in zip(aligned_seq1, aligned_seq2):

        res1 = None
        res2 = None

        if aa1 != "-":

            if i < len(residues1):
                res1 = residues1[i]

            i += 1

        if aa2 != "-":

            if j < len(residues2):
                res2 = residues2[j]

            j += 1

        if res1 is not None and res2 is not None:

            aligned_residues += 1

            if aa1 == aa2:
                identical += 1

            mapping.append({
                "residue1": res1,
                "residue2": res2,
                "aa1": aa1,
                "aa2": aa2
            })

    if aligned_residues > 0:
        sequence_identity = identical / aligned_residues
    else:
        sequence_identity = 0.0

    return mapping, aligned_residues, sequence_identity

def calculate_rmsd(mapping):

    atoms1 = []
    atoms2 = []

    valid_mapping = []

    for item in mapping:

        residue1 = item["residue1"]
        residue2 = item["residue2"]

        if "CA" not in residue1:
            continue

        if "CA" not in residue2:
            continue

        atoms1.append(residue1["CA"])
        atoms2.append(residue2["CA"])

        valid_mapping.append(item)

    if len(atoms1) < 3:

        return None, valid_mapping

    super_imposer = Superimposer()

    super_imposer.set_atoms(
        atoms1,
        atoms2
    )

    rmsd = super_imposer.rms

    return rmsd, valid_mapping

def find_best_chain_pair(chains1, chains2):

    best_pair = None
    best_score = -float("inf")

    for chain1 in chains1:

        for chain2 in chains2:

            alignment = align_sequences(
                chain1["sequence"],
                chain2["sequence"]
            )

            score = alignment.score

            if score > best_score:

                best_score = score

                best_pair = (
                    chain1,
                    chain2
                )

    return best_pair

def compare_structures(
    pdb1_path,
    pdb2_path
):

    parser = PDBParser(QUIET=True)

    structure1 = parser.get_structure(
        "protein1",
        pdb1_path
    )

    structure2 = parser.get_structure(
        "protein2",
        pdb2_path
    )

    model1 = structure1[0]
    model2 = structure2[0]

    chains1 = get_protein_chains(model1)
    chains2 = get_protein_chains(model2)

    if not chains1:

        raise ValueError(
            "No protein chains found in first PDB."
        )

    if not chains2:

        raise ValueError(
            "No protein chains found in second PDB."
        )

    best_pair = find_best_chain_pair(
        chains1,
        chains2
    )

    if best_pair is None:

        raise ValueError(
            "Could not find matching protein chains."
        )

    chain1, chain2 = best_pair

    alignment = align_sequences(
        chain1["sequence"],
        chain2["sequence"]
    )

    mapping, aligned_residues, sequence_identity = (
        build_residue_mapping(
            alignment,
            chain1["residues"],
            chain2["residues"]
        )
    )

    rmsd, valid_mapping = calculate_rmsd(
        mapping
    )

    residue_mapping = []

    for item in valid_mapping:

        residue1 = item["residue1"]
        residue2 = item["residue2"]

        residue_mapping.append({

            "protein1": {

                "chain": residue1.get_parent().id,

                "residue_number": residue1.id[1],

                "residue_name": residue1.resname,

                "amino_acid": item["aa1"]

            },

            "protein2": {

                "chain": residue2.get_parent().id,

                "residue_number": residue2.id[1],

                "residue_name": residue2.resname,

                "amino_acid": item["aa2"]

            }

        })

    return {

        "rmsd": (
            round(float(rmsd), 2)
            if rmsd is not None
            else None
        ),

        "aligned_residues": aligned_residues,

        "sequence_identity": round(
            float(sequence_identity),
            2
        ),

        "chain1": chain1["chain_id"],

        "chain2": chain2["chain_id"],

        "protein1_length": len(
            chain1["sequence"]
        ),

        "protein2_length": len(
            chain2["sequence"]
        ),

        "residue_mapping": residue_mapping

    }

if __name__ == "__main__":

    result = compare_structures(
        "protein1.pdb",
        "protein2.pdb"
    )

    import json

    print(
        json.dumps(
            result,
            indent=2
        )
    )