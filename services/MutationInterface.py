from Bio.PDB import NeighborSearch, PDBParser
import io
from proteins import *

class MutationService:
    def __init__(self, protein, mutation):
        self.protein = protein
        self.mutation = mutation
        self.uniprot = UniProtService()

    @staticmethod
    def _parse_single_mutation(protein_change: str):
        one_letter = {
            "ALA": "A", "ARG": "R", "ASN": "N", "ASP": "D",
            "CYS": "C", "GLN": "Q", "GLU": "E", "GLY": "G",
            "HIS": "H", "ILE": "I", "LEU": "L", "LYS": "K",
            "MET": "M", "PHE": "F", "PRO": "P", "SER": "S",
            "THR": "T", "TRP": "W", "TYR": "Y", "VAL": "V",
        }

        normalized = re.sub(r"^p\.", "", protein_change.strip(), flags=re.IGNORECASE)
        match = re.fullmatch(r"([A-Z])(\d+)([A-Z])", normalized.upper())
        if not match:
            match = re.fullmatch(
                r"([A-Za-z]{3})(\d+)([A-Za-z]{3})",
                normalized,
            )
            if match:
                old = one_letter.get(match.group(1).upper())
                new = one_letter.get(match.group(3).upper())
                if old and new:
                    return {
                        "original": old,
                        "position": int(match.group(2)),
                        "new": new,
                    }

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

    
    @staticmethod
    def parse_mutations(protein_change: str):
        changes = [
            change.strip()
            for change in re.split(r"\s*(?:,|/|;)\s*", protein_change or "")
            if change.strip()
        ]
        if not changes:
            raise ValueError(f"Invalid mutation format: {protein_change}")
        return [MutationService._parse_single_mutation(change) for change in changes]

    @staticmethod
    def parse_mutation(protein_change: str):
        mutations = MutationService.parse_mutations(protein_change)
        if len(mutations) != 1:
            raise ValueError(f"Invalid mutation format: {protein_change}")
        return mutations[0]

    @staticmethod
    def load_structure(pdb_text: str):

        parser = PDBParser(QUIET=True)

        structure = parser.get_structure(
            "protein",
            io.StringIO(pdb_text)
        )

        return structure

    @staticmethod
    def find_domain(position, domains):
        for domain in domains:
            if domain["start"] <= position <= domain["end"]:
                return domain

        return None

    @staticmethod
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
            standard_residues = [
                residue for residue in chain if residue.id[0] == " "
            ]

            # Prefer the PDB's explicit residue numbering.
            candidates = [
                residue for residue in standard_residues
                if residue.id[1] == position
            ]

            # Structure fragments often start at a different PDB number.
            # Fall back to sequence order so a UniProt position can still be
            # mapped to the actual residue number used by Mol*.
            if not candidates and position <= len(standard_residues):
                candidates = [standard_residues[position - 1]]

            for residue in candidates:
                if residue.resname != expected:
                    continue

                matches.append({
                    "chain": chain.id,
                    "residue": residue,
                })

        return matches

    @staticmethod
    def find_nearby_residues(structure, chain_id: str, position: int, radius: float = 5.0):
        model = next(structure.get_models())
        chain = model[chain_id]
        residue = next(
            (
                candidate
                for candidate in chain
                if candidate.id[0] == " " and candidate.id[1] == position
            ),
            None,
        )
        if residue is None:
            return []

        atoms = list(model.get_atoms())
        neighbor_search = NeighborSearch(atoms)
        nearby = {}

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
                neighbor_chain = neighbor.get_parent().id
                neighbor_position = neighbor.id[1]
                key = (neighbor_chain, neighbor_position, neighbor.resname)
                nearby[key] = {
                    "chain": neighbor_chain,
                    "position": neighbor_position,
                    "residue": neighbor.resname,
                }

        return sorted(
            nearby.values(),
            key=lambda item: (item["chain"], item["position"], item["residue"]),
        )

    @staticmethod
    def get_nearby_residues(structure, chain_id: str, position: int, radius: float = 5.0):
        return MutationService.find_nearby_residues(structure, chain_id, position, radius)

    @staticmethod
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

    @staticmethod
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

    @staticmethod
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