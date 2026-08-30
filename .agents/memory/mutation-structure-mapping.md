---
name: Mutation structure mapping
description: Durable constraints for connecting ClinVar mutation annotations to PDB structures.
---

Structural mutation analysis cannot assume that a broad display query resolves to the same biological record as every ClinVar result. The selected mutation's returned sequence should be supplied to analysis, external sequence mismatches should be reported as warnings, and the analyzer should try all structures returned for the protein before declaring that a mutation is unmapped.

**Why:** Live ClinVar searches can return compound or cross-record annotations, and the first PDB result may be a short fragment that does not cover the selected residue.

**How to apply:** Keep the mutation's UniProt position separate from the actual PDB residue number. Highlight the PDB number in the viewer and surface any upstream annotation warning in the mutation workspace.