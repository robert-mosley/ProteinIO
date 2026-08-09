import re
import xml.etree.ElementTree as ET
from Bio import Entrez
from Bio.Align import PairwiseAligner
from Bio.Seq import Seq
import json

import requests

Entrez.email = "robertm5984@gmail.com"


AA3_TO_1 = {
    "ALA": "A",
    "ARG": "R",
    "ASN": "N",
    "ASP": "D",
    "CYS": "C",
    "GLN": "Q",
    "GLU": "E",
    "GLY": "G",
    "HIS": "H",
    "ILE": "I",
    "LEU": "L",
    "LYS": "K",
    "MET": "M",
    "PHE": "F",
    "PRO": "P",
    "SER": "S",
    "THR": "T",
    "TRP": "W",
    "TYR": "Y",
    "VAL": "V",
}


def _parse_pdb(pdb_url: str):
    """
    Extract PDB ID and ATOM residues from a PDB string.
    """

    pdb_id = None
    chains = {}
    data = requests.get(pdb_url).text

    for line in data.splitlines():

        # -----------------------------------------------------
        # PDB ID
        # -----------------------------------------------------

        if line.startswith("HEADER"):
            # Usually the PDB ID is in columns 63-66
            candidate = line[62:66].strip()

            if candidate:
                pdb_id = candidate.upper()

        elif line.startswith("IDCODE"):
            candidate = line[10:14].strip()

            if candidate:
                pdb_id = candidate.upper()

        # -----------------------------------------------------
        # ATOM records
        # -----------------------------------------------------

        if line.startswith(("ATOM", "HETATM")):

            if len(line) < 27:
                continue

            chain_id = line[21].strip() or "_"

            res_name = line[17:20].strip().upper()

            try:
                res_num = int(line[22:26].strip())
            except ValueError:
                continue

            # Ignore alternate locations except blank/A
            alt_loc = line[16]

            if alt_loc not in (" ", "A"):
                continue

            if res_name not in AA3_TO_1:
                continue

            if chain_id not in chains:
                chains[chain_id] = {}

            chains[chain_id][res_num] = AA3_TO_1[res_name]

    return pdb_id, chains


def _extract_clinvar_variant(accession: str):
    print(
        f"Fetching mutation details for {accession} from NCBI..."
    )

    # ---------------------------------------------------------
    # 1. Find the ClinVar UID
    # ---------------------------------------------------------

    handle = Entrez.esearch(
        db="clinvar",
        term=accession,
        retmode="xml",
    )

    result = Entrez.read(handle)
    handle.close()

    print(result)

    ids = result["IdList"]

    if not ids:
        raise ValueError(
            f"No ClinVar record found for {accession}"
        )

    clinvar_uid = ids[0]

    print(f"ClinVar UID: {clinvar_uid}")

    # ---------------------------------------------------------
    # 2. Get ClinVar summary
    # ---------------------------------------------------------

    handle = Entrez.esummary(
        db="clinvar",
        id=clinvar_uid,
        retmode="json",
    )

    summary = handle.read()
    handle.close()

    if isinstance(summary, bytes):
        summary = summary.decode("utf-8")

    summary = json.loads(summary)

    record = summary["result"][clinvar_uid]

    print("ClinVar record:")
    print(record)

    # ---------------------------------------------------------
    # 3. Get the title
    # ---------------------------------------------------------

    title = record.get("title", "")

    print(f"ClinVar title: {title}")

    # Example:
    #
    # NM_005228.5(EGFR):c.679T>G (p.Ser227Ala)
    #

    match = re.search(
        r"p\.\(?"
        r"([A-Za-z]{3})"
        r"(\d+)"
        r"([A-Za-z]{3})"
        r"\)?",
        title,
    )

    if not match:
        # Also support p.S227A
        match = re.search(
            r"p\.\(?"
            r"([A-Z])"
            r"(\d+)"
            r"([A-Z])"
            r"\)?",
            title,
        )

    if not match:
        raise ValueError(
            f"Could not find protein-level mutation "
            f"in ClinVar title:\n{title}"
        )

    old_res = match.group(1)
    position = int(match.group(2))
    new_res = match.group(3)

    old_res = AA3_TO_1.get(
        old_res,
        old_res,
    )

    new_res = AA3_TO_1.get(
        new_res,
        new_res,
    )

    print(
        f"Mutation: "
        f"{old_res}{position}{new_res}"
    )

    return {
        "old_residue": old_res,
        "position": position,
        "new_residue": new_res,
    }

def _map_sequence_position_to_pdb(
    chains,
    old_residue,
    protein_position,
):
    """
    Find the PDB residue corresponding to the protein
    sequence position.

    For structures where the PDB numbering starts at a
    different number, this searches each chain for the
    corresponding residue based on sequence position.

    Returns:

        chain_id, pdb_res_num
    """

    for chain_id, residues in chains.items():

        ordered_residues = sorted(residues.items())

        # Convert PDB chain to sequence
        sequence = "".join(
            residue
            for _, residue in ordered_residues
        )

        if protein_position > len(sequence):
            continue

        pdb_res_num = ordered_residues[
            protein_position - 1
        ][0]

        pdb_residue = ordered_residues[
            protein_position - 1
        ][1]

        if pdb_residue == old_residue:
            return chain_id, pdb_res_num

    return None, None


def get_pdb_mutation_details(
    accession: str,
    pdb_string: str,
):
    """
    Convert a ClinVar VCV accession + PDB string into:

    {
        "pdb_id": "...",
        "chain_id": "...",
        "pdb_res_num": ...,
        "old_residue": "...",
        "new_residue": "..."
    }
    """

    if not accession:
        raise ValueError("ClinVar accession is required.")

    if not pdb_string:
        raise ValueError("PDB string is required.")

    # ---------------------------------------------------------
    # 1. Get mutation from ClinVar
    # ---------------------------------------------------------

    variant = _extract_clinvar_variant(accession)

    # ---------------------------------------------------------
    # 2. Parse supplied PDB
    # ---------------------------------------------------------
    print("Pdb Strinnng is this" + pdb_string)

    pdb_id, chains = _parse_pdb(pdb_string)

    if not pdb_id:
        raise ValueError(
            "Could not determine PDB ID from pdb_string."
        )

    if not chains:
        raise ValueError(
            "No protein residues found in pdb_string."
        )

    # ---------------------------------------------------------
    # 3. Find PDB chain/residue
    # ---------------------------------------------------------

    chain_id, pdb_res_num = _map_sequence_position_to_pdb(
        chains=chains,
        old_residue=variant["old_residue"],
        protein_position=variant["position"],
    )

    if chain_id is None:
        raise ValueError(
            f"Could not map ClinVar residue "
            f"{variant['old_residue']}{variant['position']} "
            f"to PDB {pdb_id}."
        )

    # ---------------------------------------------------------
    # 4. EXACT RETURN FORMAT
    # ---------------------------------------------------------

    return {
        "pdb_id": pdb_id.upper(),
        "chain_id": chain_id,
        "pdb_res_num": pdb_res_num,
        "old_residue": variant["old_residue"],
        "new_residue": variant["new_residue"],
    }