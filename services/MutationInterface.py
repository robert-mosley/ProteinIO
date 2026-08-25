from Bio.PDB import NeighborSearch, PDBParser
import io
from proteins import *

class MutationService:
    def __init__(self, protein, mutation):
        self.protein = protein
        self.mutation = mutation
        self.uniprot = UniProtService()

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

    
    def load_structure(pdb_text: str):

        parser = PDBParser(QUIET=True)

        structure = parser.get_structure(
            "protein",
            io.StringIO(pdb_text)
        )

        return structure

    def find_domain(self, position):
        protein = self.uniprot.search(self.protein)
        domains = self.uniprot.get_domains(protein)

        for domain in domains:
            if domain["start"] <= position <= domain["end"]:
                return domain

        return None

    def find_mutation_residues(
        structure,
        position: int,
        original_one_letter: str
    ):

        model = next(structure.get_models())

        three_letter = {
            "A": "ALA",
            "R": "ARG",
            "N": "ASN",
            "D": "ASP",
            "C": "CYS",
            "E": "GLU",
            "Q": "GLN",
            "G": "GLY",
            "H": "HIS",
            "I": "ILE",
            "L": "LEU",
            "K": "LYS",
            "M": "MET",
            "F": "PHE",
            "P": "PRO",
            "S": "SER",
            "T": "THR",
            "W": "TRP",
            "Y": "TYR",
            "V": "VAL"
        }

        expected = three_letter[original_one_letter]

        matches = []

        for chain in model.get_chains():

            for residue in chain:

                # Standard amino acid
                if residue.id[0] != " ":
                    continue

                if residue.id[1] != position:
                    continue

                if residue.resname != expected:
                    continue

                matches.append({
                    "chain": chain.id,
                    "residue": residue
                })

        return matches

    def get_nearby_residues(structure, chain_id: str, position: int, radius: float = 5.0):
        model = next(structure.get_models())
        chain = model[chain_id]
        residue = chain[position]

        atoms = list(model.get_atoms())
        neighbor_search = NeighborSearch(atoms)
        nearby = set()

        for atom in residue.get_atoms():
            if atom.element == "H":
                continue

            neighbors = neighbor_search.search(
                atom.coord,
                radius,
                level="R"
            )

            for neighbor in neighbors:
                if neighbor is residue:
                    continue
                nearby.add(neighbor)

        return nearby

    def find_interfaces(
        structure,
        cutoff=5.0
    ):

        model = next(structure.get_models())

        chains = list(model.get_chains())

        interfaces = []

        for i in range(len(chains)):

            for j in range(i + 1, len(chains)):

                chain_a = chains[i]
                chain_b = chains[j]

                atoms_a = [
                    atom
                    for residue in chain_a
                    if residue.id[0] == " "
                    for atom in residue
                    if atom.element != "H"
                ]

                atoms_b = [
                    atom
                    for residue in chain_b
                    if residue.id[0] == " "
                    for atom in residue
                    if atom.element != "H"
                ]

                search_b = NeighborSearch(atoms_b)

                contacts = []

                for atom_a in atoms_a:

                    neighbors = search_b.search(
                        atom_a.coord,
                        cutoff,
                        level="A"
                    )

                    residue_a = atom_a.get_parent()

                    for atom_b in neighbors:

                        residue_b = atom_b.get_parent()

                        distance = atom_a - atom_b

                        contacts.append({
                            "chain_a": chain_a.id,
                            "residue_a": residue_a.resname,
                            "position_a": residue_a.id[1],
                            "atom_a": atom_a.name,

                            "chain_b": chain_b.id,
                            "residue_b": residue_b.resname,
                            "position_b": residue_b.id[1],
                            "atom_b": atom_b.name,

                            "distance": round(
                                distance,
                                3
                            )
                        })

                if contacts:

                    interfaces.append({
                        "chain_a": chain_a.id,
                        "chain_b": chain_b.id,
                        "contacts": contacts
                    })

        return interfaces

    def summarize_interfaces(interfaces):
        results = []
        for interface in interfaces:

            residues_a = {}
            residues_b = {}
            for contact in interface["contacts"]:

                key_a = (
                    contact["chain_a"],
                    contact["position_a"],
                    contact["residue_a"]
                )
                key_b = (
                    contact["chain_b"],
                    contact["position_b"],
                    contact["residue_b"]
                )

                residues_a[key_a] = True
                residues_b[key_b] = True

            results.append({
                "chain_a": interface["chain_a"],
                "chain_b": interface["chain_b"],

                "residues_a": [
                    {
                        "chain": c,
                        "position": p,
                        "residue": r
                    }
                    for c, p, r
                    in residues_a.keys()
                ],

                "residues_b": [
                    {
                        "chain": c,
                        "position": p,
                        "residue": r
                    }
                    for c, p, r
                    in residues_b.keys()
                ]
            })

        return results

    def mutation_interface_context(
        mutation_chain,
        mutation_position,
        interfaces
    ):

        results = []

        for interface in interfaces:

            for residue in interface["residues_a"]:

                if (
                    residue["chain"] == mutation_chain
                    and
                    residue["position"] == mutation_position
                ):
                    results.append({
                        "interface": True,
                        "chain": mutation_chain,
                        "partner_chain": interface["chain_b"],
                        "partner_residues":
                            interface["residues_b"]
                    })

            for residue in interface["residues_b"]:

                if (
                    residue["chain"] == mutation_chain
                    and
                    residue["position"] == mutation_position
                ):
                    results.append({
                        "interface": True,
                        "chain": mutation_chain,
                        "partner_chain": interface["chain_a"],
                        "partner_residues":
                            interface["residues_a"]
                    })

        return results