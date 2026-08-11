# ProteinIO

## An AI-powered research workspace for proteins, structures, mutations, and druggable pockets

# Demo

https://github.com/user-attachments/assets/64234651-82d1-4dc7-acdf-2a1f3a99e99d

ProteinIO is a full-stack computational biology platform that turns a protein or gene query into an interactive research workspace. It combines live protein records, experimental structures, clinical variants, AI-assisted research, pocket prediction, and structure mutation workflows in one focused interface.

This project is built to demonstrate more than a polished frontend. It connects scientific data services, machine-learning workflows, molecular structure tooling, and an AI agent behind a typed web application.

## Why this project stands out

ProteinIO demonstrates the engineering and product skills recruiters look for in a modern scientific application:

- **Real bioinformatics integrations** across UniProt, RCSB Protein Data Bank, NCBI ClinVar, and Open Targets
- **A typed React + TypeScript frontend** backed by an asynchronous FastAPI API
- **Interactive 3D molecular visualization** powered by Mol*, the viewer technology used by RCSB PDB
- **An AI research assistant** built with LangGraph and Google Gemini tool calling
- **Structure-aware AI workflows** that preserve the active PDB across sessions and conversations
- **Protein generation and structure prediction** workflows powered by an ESM-based design layer
- **Pocket prediction with P2Rank** and residue highlighting in the molecular viewer
- **Mutation analysis workflows** using ClinVar records, AlphaMissense scores, sequence alignment, and OpenMM/PDBFixer
- **Explicit scientific boundaries** that distinguish retrieved evidence from predictions and avoid fabricating biology

## Product capabilities

### Protein search

Search by gene symbol, accession, or protein name. ProteinIO retrieves and normalizes:

- UniProt accession
- Recommended protein name
- Amino acid sequence
- Sequence length
- Related experimental structures from RCSB PDB
- ClinVar variant records for the matched gene

### Structure exploration

The workspace loads experimental structures into a reusable Mol* viewer and supports:

- Rotate, zoom, pan, and residue selection
- Automatic loading of the first available structure
- Switching between structures without navigating away
- RCSB structure metadata and experimental method
- Direct PDB downloads
- A dark viewer theme matched to the research workspace
- Explicit empty states when no experimental structure is available

The active PDB is shared with the backend so the AI assistant and mutation workflows can operate on the structure currently being explored.

### Mutation research

Mutation records are returned by the backend from ClinVar and rendered from the live response. Each record can include:

- Variant description
- ClinVar accession
- Source
- Clinical significance
- Search across title, accession, source, and significance
- Single-click selection
- Double-click mutation workspace
- Direct ClinVar links

The mutation workspace provides the selected record's source, accession, clinical significance, and description. It deliberately labels future analysis as a future capability rather than inventing biological conclusions.

### AI research assistant

The assistant uses session-aware chat state and tool calling to help researchers:

- Ask questions about the active protein
- Retrieve protein context
- Search proteins associated with a disease through Open Targets
- Generate a protein from a scientific natural-language specification
- Load or generate a structure for the current session
- Predict binding pockets with P2Rank
- Return pocket data for download
- Highlight a pocket's first residue in the viewer when a valid residue can be identified

The assistant is instructed to distinguish verified biological knowledge from computational predictions and to state uncertainty when appropriate.

### Protein design and structure generation

The backend exposes experimental design workflows for:

- Protein generation from a sequence or natural-language design request
- Structure generation for a designed sequence
- Returning generated sequences and PDB content to the frontend
- Loading generated structures into the same viewer used for experimental structures

### Variant and mutation analysis

ProteinIO includes a computational mutation path that can:

- Resolve a ClinVar accession to mutation details
- Parse PDB chains and residue numbering
- Align protein sequence information when needed
- Apply a point mutation with PDBFixer
- Add missing atoms and hydrogens
- Minimize the resulting structure with OpenMM
- Return a mutated PDB and a plain-English chemical-change description
- Query AlphaMissense scores and classifications for supported variants

## Architecture

```text
React + TypeScript + Vite
        │
        │ same-origin /api proxy
        ▼
FastAPI + async service layer
        │
        ├── UniProtService       → UniProt REST API
        ├── PDBService           → RCSB Search + Data APIs
        ├── ClinVarService       → NCBI E-utilities
        ├── AlphaMissenseService → local AlphaMissense SQLite data
        ├── ProteinDesign        → ESM-based generation / structure workflow
        ├── Mutation workflow    → PDBFixer + OpenMM
        └── AI agent             → LangGraph + Google Gemini tools
```

### Backend

- `app.py` — FastAPI application, sessions, API routes, and active-PDB state
- `proteins.py` — async scientific API clients and protein/structure/mutation models
- `llm.py` — LangGraph agent, Gemini model integration, tool definitions, and pocket workflow
- `generator.py` — protein-generation client and sequence extraction helpers
- `analyze.py` — AlphaMissense lookup, ESM3 scoring, and protein-design structure generation
- `get_mutation_info.py` — ClinVar/PDB parsing and mutation-to-structure mapping
- `mutation.py` — amino-acid property descriptions, PDB mutation, and OpenMM minimization
- `p2rank/` — P2Rank executable and resources used for binding-pocket prediction

### Frontend

- `web/src/pages/Dashboard.tsx` — application shell and shared selection state
- `web/src/components/CenterViewer.tsx` — viewer card and active-structure state
- `web/src/components/ProteinViewer.tsx` — reusable Mol* viewer component
- `web/src/components/tabs/ProteinTab.tsx` — protein metadata and sequence
- `web/src/components/tabs/StructuresTab.tsx` — structure cards and viewer actions
- `web/src/components/tabs/MutationsTab.tsx` — searchable mutation records
- `web/src/components/MutationWorkspace.tsx` — selected mutation detail drawer
- `web/src/components/tabs/AIAssistantTab.tsx` — chat, pocket results, downloads, and highlighting
- `web/src/services/` — API, chat, session, protein, and mutation service boundaries

## API

### `POST /getProtein`

Request:

```json
{
  "query": "EGFR"
}
```

Response shape:

```json
{
  "protein": {
    "accession": "P0CY46",
    "name": "Epidermal growth factor receptor",
    "sequence": "...",
    "length": 1210
  },
  "structures": [
    {
      "id": "1M17",
      "title": "...",
      "method": "X-RAY DIFFRACTION",
      "download_url": "https://files.rcsb.org/download/1M17.pdb"
    }
  ],
  "mutations": [
    {
      "source": "ClinVar",
      "accession": "VCV004870300",
      "title": "NM_005228.5(EGFR):c.3005T>A (p.Met1002Lys)",
      "clinical_significance": "Uncertain significance"
    }
  ]
}
```

### `POST /chat`

Request:

```json
{
  "query": "Predict binding pockets in the current structure",
  "session_id": "session-id",
  "current_pdb": "https://files.rcsb.org/download/1M17.pdb"
}
```

Response fields can include:

- `response` — assistant answer
- `pockets` — first residue suitable for viewer highlighting
- `pockets_list` — normalized P2Rank pocket records
- `generated_pdb` — generated or mutated PDB content when returned by a tool

### Additional routes

- `POST /set_current_pdb` — associate an active PDB with a session
- `POST /search_missense` — query AlphaMissense variant information
- `POST /proteinDesign` — generate a designed protein sequence
- `POST /generateStructure` — generate a structure from a sequence
- `POST /queryProtein` — generate a protein and structure from a design prompt
- `POST /mutation_query` — resolve and apply a ClinVar mutation to the active structure

## Run locally

### Prerequisites

- Python 3.12+
- Node.js 20+
- npm
- A working P2Rank installation for pocket prediction
- Sufficient memory and model access for ESM-based workflows

### 1. Install backend dependencies

```bash
python -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
```

### 2. Configure optional AI access

The AI assistant reads environment variables through `python-dotenv`. Create a local `.env` file or configure environment variables in your runtime. Keep credentials out of version control.

The core UniProt, RCSB, and ClinVar search workflow uses public upstream APIs. AI and model-powered features may require provider access and downloaded model assets.

### 3. Start the backend

```bash
source venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 8000
```

The API is available at `http://localhost:8000`.

### 4. Install and start the frontend

In a second terminal:

```bash
cd web
npm install
npm run dev -- --port 5000
```

Open `http://localhost:5000`.

The Vite development server proxies `/api` requests to the FastAPI backend, so the browser uses same-origin requests during development.

## Frontend commands

Run these from `web/`:

```bash
npm run dev      # start the development server
npm run build    # create a production build
npm run preview  # preview the production build
```

## Configuration and data requirements

- Public scientific searches do not require an application database.
- AlphaMissense lookups expect the local `alphamissense.db` SQLite dataset.
- Pocket prediction requires the P2Rank executable and its runtime resources.
- ESM-based workflows may download model weights on first use.
- AI chat requires the configured Google Generative AI environment.
- Large-model and molecular-minimization features can require substantially more memory than the search-only workflow.

## Engineering notes

- The frontend consumes the backend response directly and keeps scientific records sourced from the API layer.
- Async HTTP clients prevent the FastAPI event loop from blocking during UniProt, RCSB, and ClinVar requests.
- Session IDs keep chat history and active PDB context scoped to an individual workspace.
- The active PDB is explicitly synchronized before structure-aware AI operations.
- Pocket records are normalized before being displayed or used for residue highlighting.
- Mutation application is separated from mutation description so structure edits and explanatory output remain independently testable.
- Empty scientific results are represented as explicit UI states rather than replaced with fake records.
- The AI system prompt requires uncertainty and distinguishes predictions from verified biological knowledge.

## Future roadmap

- Residue-level mapping between ClinVar variants, UniProt sequence positions, and PDB numbering
- More robust handling of alternate chains, insertion codes, and missing residues
- Persistent research sessions and shareable investigation links
- Evidence-backed AI summaries with paper and database citations
- Background jobs for long-running structure generation and energy minimization
- Automated tests with recorded upstream API fixtures
- Observability for upstream latency, model execution time, and failed scientific workflows

## Project status

ProteinIO is an actively developed computational-biology prototype. The project currently combines live protein search, experimental and generated structures, clinical variant exploration, an AI tool-calling assistant, pocket prediction, and mutation modeling. The roadmap identifies the work needed to make these research workflows more reproducible and production-ready.

## License

Add the project license that matches your intended distribution before publishing this repository.
