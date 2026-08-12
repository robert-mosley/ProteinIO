---
name: Backend deployment imports
description: Environment-specific dependency and LangChain import compatibility notes for production startup.
---

Published startup uses the workspace Python environment and imports the full AI stack eagerly. Keep LangChain message imports on `langchain_core.messages`, which is the compatible import path for the installed LangChain 0.3-era packages.

**Why:** The backend can fail before serving any route when a transitive package changes its public import paths; this surfaced during deployment validation.

**How to apply:** When changing or refreshing Python dependencies, run the exact Uvicorn command and test a root HTTP response before publishing. Treat eager scientific/AI imports as deployment-critical.
