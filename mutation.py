from llm import current_pdb
from io import StringIO
from get_mutation_info import *
from openmm import unit
from openmm.app import PDBFile, Simulation, ForceField, Modeller
from openmm.app import NoCutoff, HBonds
from openmm import LangevinMiddleIntegrator
from pdbfixer import PDBFixer

# One-letter to three-letter amino acid code mapping (PDBFixer/OpenMM want
# three-letter codes for its applyMutations call).
AA_1TO3 = {
    "A": "ALA", "R": "ARG", "N": "ASN", "D": "ASP", "C": "CYS",
    "Q": "GLN", "E": "GLU", "G": "GLY", "H": "HIS", "I": "ILE",
    "L": "LEU", "K": "LYS", "M": "MET", "F": "PHE", "P": "PRO",
    "S": "SER", "T": "THR", "W": "TRP", "Y": "TYR", "V": "VAL",
}

AA_PROPERTIES = {
    "A": {"name": "Alanine", "size": "small", "polarity": "nonpolar", "charge": "neutral"},
    "R": {"name": "Arginine", "size": "large", "polarity": "polar", "charge": "positive"},
    "N": {"name": "Asparagine", "size": "medium", "polarity": "polar", "charge": "neutral"},
    "D": {"name": "Aspartate", "size": "medium", "polarity": "polar", "charge": "negative"},
    "C": {"name": "Cysteine", "size": "small", "polarity": "nonpolar", "charge": "neutral"},
    "Q": {"name": "Glutamine", "size": "medium", "polarity": "polar", "charge": "neutral"},
    "E": {"name": "Glutamate", "size": "medium", "polarity": "polar", "charge": "negative"},
    "G": {"name": "Glycine", "size": "tiny", "polarity": "nonpolar", "charge": "neutral"},
    "H": {"name": "Histidine", "size": "medium", "polarity": "polar", "charge": "positive (often)"},
    "I": {"name": "Isoleucine", "size": "large", "polarity": "nonpolar", "charge": "neutral"},
    "L": {"name": "Leucine", "size": "large", "polarity": "nonpolar", "charge": "neutral"},
    "K": {"name": "Lysine", "size": "large", "polarity": "polar", "charge": "positive"},
    "M": {"name": "Methionine", "size": "large", "polarity": "nonpolar", "charge": "neutral"},
    "F": {"name": "Phenylalanine", "size": "large", "polarity": "nonpolar", "charge": "neutral"},
    "P": {"name": "Proline", "size": "medium", "polarity": "nonpolar", "charge": "neutral"},
    "S": {"name": "Serine", "size": "small", "polarity": "polar", "charge": "neutral"},
    "T": {"name": "Threonine", "size": "small", "polarity": "polar", "charge": "neutral"},
    "W": {"name": "Tryptophan", "size": "very large", "polarity": "nonpolar", "charge": "neutral"},
    "Y": {"name": "Tyrosine", "size": "large", "polarity": "polar", "charge": "neutral"},
    "V": {"name": "Valine", "size": "medium", "polarity": "nonpolar", "charge": "neutral"},
}


def describe_mutation(old_residue, new_residue, position):
    """Generate a plain-English description of the mutation's chemical change."""
    old_props = AA_PROPERTIES[old_residue]
    new_props = AA_PROPERTIES[new_residue]

    changes = []
    if old_props["polarity"] != new_props["polarity"]:
        changes.append(f"polarity changes from {old_props['polarity']} to {new_props['polarity']}")
    if old_props["charge"] != new_props["charge"]:
        changes.append(f"charge changes from {old_props['charge']} to {new_props['charge']}")
    if old_props["size"] != new_props["size"]:
        changes.append(f"side chain size changes from {old_props['size']} to {new_props['size']}")

    summary = (
        f"Position {position}: {old_props['name']} ({old_residue}) -> "
        f"{new_props['name']} ({new_residue})."
    )
    if changes:
        summary += " This mutation " + "; ".join(changes) + "."
    else:
        summary += " This is a relatively conservative substitution -- similar size, polarity, and charge."

    return summary


def apply_point_mutation(pdb_string, chain_id, position, old_residue, new_residue,
                          minimize_steps=200):
    """
    Apply a single point mutation to a PDB structure and locally relax it.

    Args:
        pdb_string: the original PDB structure as a string
        chain_id: which chain the mutation is on (e.g. "A")
        position: residue number (as it appears in the PDB numbering)
        old_residue: original amino acid, one-letter code (e.g. "K")
        new_residue: mutant amino acid, one-letter code (e.g. "R")
        minimize_steps: number of energy minimization steps to run

    Returns:
        dict with:
            pdb_string: the mutant structure as a PDB-format string
            description: plain-English description of the change
    """
    fixer = PDBFixer(fileobj=StringIO(pdb_string))

    old_three = AA_1TO3[old_residue]
    new_three = AA_1TO3[new_residue]
    mutation_spec = f"{old_three}-{position}-{new_three}"

    fixer.applyMutations([mutation_spec], chain_id)
    fixer.findMissingResidues()
    fixer.findMissingAtoms()
    fixer.addMissingAtoms()
    fixer.addMissingHydrogens(7.0)

    forcefield = ForceField("amber14-all.xml", "amber14/tip3pfb.xml")
    modeller = Modeller(fixer.topology, fixer.positions)

    system = forcefield.createSystem(
        modeller.topology,
        nonbondedMethod=NoCutoff,
        constraints=HBonds,
    )
    integrator = LangevinMiddleIntegrator(
        300 * unit.kelvin, 1 / unit.picosecond, 0.002 * unit.picoseconds
    )
    simulation = Simulation(modeller.topology, system, integrator)
    simulation.context.setPositions(modeller.positions)

    simulation.minimizeEnergy(maxIterations=minimize_steps)

    minimized_positions = simulation.context.getState(getPositions=True).getPositions()

    output = StringIO()
    PDBFile.writeFile(modeller.topology, minimized_positions, output)
    pdb_string = output.getvalue()

    description = describe_mutation(old_residue, new_residue, position)

    return {
        "pdb_string": pdb_string,
        "description": description,
    }