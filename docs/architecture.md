# Architecture

Ontorum is organized around a Python backend and a React frontend.

## Backend

- **Framework**: FastAPI served with Uvicorn.
- **Database**: Neo4j accessed through the official driver.
- **Ontology Loader**: `backend/ontology_loader.py` reads `narragrammar.json` and generates dynamic
  enums for node and relationship types. The specification can be replaced by
  setting the `ONTOLOGY_PATH` environment variable.
- **Data Models**: `backend/models.py` defines a generic `Node` model used to
  store graph nodes. The `database` module contains CRUD operations and export
  utilities.
- **API**: `backend/api.py` exposes REST endpoints for nodes, relationships,
  and integration with large language models.
- **LLM Integration**: `backend/llm.py` connects to the OpenAI API to generate
  candidate nodes based on the ontology rules.
- **Grammar Manager**: `backend/grammar_manager.py` allows switching between different grammar files at runtime.
- **Graph Statistics**: `backend/graph_statistics.py` computes counts and distributions returned by `/api/graph/statistics`.
- **Analysis Router**: `backend/analysis.py` exposes candidate analysis endpoints mounted at `/api/analysis`.

## Frontend

The React application under `frontend/` visualizes the graph and interacts with
 the API. Development commands are provided in `frontend/package.json`.

## Tests

Unit tests live in the `tests/` directory and cover the database layer, API
routes, graph grammar and LLM utilities.

