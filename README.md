# Ontorum

Ontorum is a graph-based ontology management system. It stores nodes and
relationships in Neo4j and exposes a REST API built with FastAPI. A React
frontend provides an interactive view of the graph. The project can also
generate nodes with the help of large language models.

## Getting Started

1. Install Python dependencies:
   ```bash
   pip3 install -r requirements.txt --break-system-packages
   ```
2. Install frontend dependencies:
   ```bash
   cd frontend && npm install
   ```
3. Create a `.env` file with your Neo4j credentials. See
   [`docs/development.md`](docs/development.md) for the full list of variables.
4. Launch the API server:
   ```bash
   python -m uvicorn backend.api:app --reload --port 8000
   ```
5. In another terminal, start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```
   The Vite development server now binds to `0.0.0.0`, allowing
   devices on your local network to access the running frontend.

## Directory Layout

- `backend/` – Python backend source code
- `frontend/` – React application
- `tests/` – Pytest suite
- `docs/` – Additional documentation

## Documentation

Detailed documentation lives in the [`docs/`](docs/) directory. Start with
[`docs/architecture.md`](docs/architecture.md) and
[`docs/development.md`](docs/development.md). The full API is described in
[`docs/api.md`](docs/api.md).
For details on the new toolbar actions available in the header see
[`docs/header_toolbar.md`](docs/header_toolbar.md).
Behavior of the panels when selecting a node is described in
[`docs/node_selection_behavior.md`](docs/node_selection_behavior.md).

Guidance on how relationship orientation works in the grammar can be found in
[`docs/relationship_directionality.md`](docs/relationship_directionality.md).

[`docs/add_relationship_panel.md`](docs/add_relationship_panel.md) explains the options in the relationship form.


## Testing

Run all backend tests with:

```bash
pytest
```

Run frontend tests with:

```bash
cd frontend
npm test
```

