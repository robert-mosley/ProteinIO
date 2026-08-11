# ProteinIO

## A research workspace for exploring proteins, structures, and clinical variants

ProteinIO is a full-stack bioinformatics application that turns a gene or protein query into an interactive research workspace. It brings together protein sequence data, experimentally determined structures, and ClinVar variant records in one focused interface designed for biology researchers.

The project demonstrates how to build a practical scientific product around live public data APIs — not a static dashboard or mocked demo.

## Why this project stands out

ProteinIO shows the engineering skills recruiters look for in a modern product:

- **Real scientific data integration** across UniProt, RCSB Protein Data Bank, and NCBI ClinVar
- **A typed React + TypeScript frontend** backed by a FastAPI service
- **Interactive 3D molecular visualization** powered by Mol*, the viewer technology used by RCSB PDB
- **Clinical variant exploration** with searchable, selectable mutation records and a mutation workspace
- **Resilient API orchestration** that combines multiple upstream services into one consistent response
- **Clear separation of concerns** between the presentation layer, API layer, and data-source services
- **Responsive dark research UI** designed for dense scientific information without sacrificing readability

## Product capabilities

### Protein search

Search by gene symbol, accession, or protein name. ProteinIO retrieves:

- UniProt accession
- Recommended protein name
- Amino acid sequence
- Sequence length

### Structure exploration

The workspace loads the first available experimental structure automatically and supports:

- Interactive Mol* 3D rendering
- Rotate, zoom, pan, and residue selection
- Switching between structures without leaving the workspace
- RCSB metadata such as structure title and experimental method
- Direct PDB downloads
- RCSB structure links
- An explicit empty state when no experimental structure is available

### Mutation research

Mutation records are loaded from ClinVar and displayed from the backend response — never fabricated in the frontend. Each record includes:

- Clinical variant title
- ClinVar accession
- Data source
- Clinical significance when available
- Search across title, accession, source, and significance
- Single-click selection
- Double-click mutation workspace

The mutation workspace provides a focused view of the selected record, including a clearly labeled future-facing AI Analysis section rather than inventing biological predictions.

### AI assistant foundation

The repository includes an AI assistant foundation built around LangGraph and Anthropic tool calling. The tool layer is designed to let an assistant retrieve the same protein, structure, and mutation data used by the product.

## Architecture

```text
React + TypeScript + Vite
        │
        │ same-origin /api proxy
        ▼
FastAPI
        │
        ├── UniProtService  → UniProt REST API
        ├── PDBService      → RCSB Search + Data APIs
        └── ClinVarService  → NCBI E-utilities
```

### Backend

- `app.py` — FastAPI application and `/getProtein` endpoint
- `proteins.py` — typed data models and service classes for external scientific APIs
- `llm.py` — LangGraph/Anthropic tool-calling foundation

### Frontend

- `web/src/pages/Dashboard.tsx` — application shell and shared state
- `web/src/components/CenterViewer.tsx` — viewer card and structure selection state
- `web/src/components/ProteinViewer.tsx` — reusable Mol* viewer
- `web/src/components/tabs/ProteinTab.tsx` — protein metadata and sequence
- `web/src/components/tabs/StructuresTab.tsx` — structure cards and viewer actions
- `web/src/components/tabs/MutationsTab.tsx` — mutation search and selection
- `web/src/components/MutationWorkspace.tsx` — selected mutation detail drawer

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

## Run locally

### Prerequisites

- Python 3.12+
- Node.js 20+
- npm

### 1. Install backend dependencies

```bash
python -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
```

### 2. Start the backend

```bash
source venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 8000
```

The API is available at `http://localhost:8000`.

### 3. Install and start the frontend

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

## Configuration

The optional AI tooling reads environment variables through `python-dotenv`. Keep credentials in environment variables or a local `.env` file that is never committed.

The core protein, structure, and ClinVar search workflow uses public upstream APIs and does not require an API key.

## Engineering notes

- The frontend consumes the backend response directly and keeps mutation data source-of-truth in the API layer.
- Structure selection is held in React state and passed into the reusable viewer component as a `pdbUrl` prop.
- When the selected PDB URL changes, Mol* clears the previous structure and loads the new one.
- External API failures are not silently converted into fake scientific data.
- Empty structure and mutation results have explicit user-facing states.
- The backend limits structure metadata loading to a small result set to keep the workspace responsive.

## Future roadmap

- Residue-level highlighting connected to selected clinical variants
- More precise sequence-to-structure mapping
- AI-assisted literature and evidence summaries with citations
- Saved workspaces and shareable research sessions
- Background caching and request telemetry for larger-scale use
- Automated tests for upstream API response variations

## Project status

ProteinIO is an actively developed research-product prototype. The core search, data aggregation, mutation workspace, and interactive structure viewer are implemented; the roadmap identifies the next steps toward a production-grade scientific research platform.

## License

Add the project license that matches your intended distribution before publishing this repository.