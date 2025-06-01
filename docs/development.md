# Development Guide

This guide describes how to configure the environment and run the
Ontorum project in development.

## Prerequisites

- Python 3.11 or later
- Node.js 18 or later (for the frontend)
- A running Neo4j instance with Bolt access

## Environment Variables

Create a `.env` file in the repository root. The following variables are
used by the backend:

```
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
OPENAI_API_KEY=<optional>
# Optional path to a custom ontology specification. The default grammar
# loaded by the backend is `narragrammar.json`.
ONTOLOGY_PATH=backend/narragrammar.json
```

## Installing Dependencies

```
pip3 install -r requirements.txt --break-system-packages
cd frontend && npm install
```

If your environment sets `npm_config_http_proxy` or `npm_config_https_proxy`,
they may trigger warnings during frontend commands. Remove those variables or
delete the related npm config entries:

```bash
unset npm_config_http_proxy npm_config_https_proxy
npm config delete http-proxy >/dev/null 2>&1 || true
npm config delete https-proxy >/dev/null 2>&1 || true
```

## Running the Backend

```
python -m uvicorn backend.api:app --reload --port 8000
```

## Running the Frontend

```
cd frontend
npm run dev
```

## Running Tests

The test suite relies on the environment variables above. Execute:

```
pytest
```

Frontend components are tested with Jest. Run those tests with:

```
cd frontend
npm test
```

## Keyboard Shortcuts

While running the frontend you can quickly toggle UI panes. The same actions are also available via buttons in the header toolbar:

- **Ctrl+B** – Show or hide the **create** pane on the left.
- **Ctrl+D** – Show or hide the **details** pane on the right.
- **Ctrl+S** – Show or hide the **footer** pane at the bottom.

When a pane is hidden the graph expands to take the available space.
These shortcuts are available on both the main graph page and the grammar editor.


The **create** pane, **details** pane and the **footer** support manual resizing. Drag the thin handle along their edges to adjust their width or height. All panes reset to their default size when reopened.

The footer opens to a default height of `30vh`. Drag its top edge to adjust the
height while it is visible. Collapsing and reopening the footer resets it back
to the default size. The footer cannot be resized smaller than `100px`.

The statistics panels within the footer have a fixed internal layout. If the
footer is shorter than these panels require, scroll within the footer pane to
view the hidden sections. Only the pane height changes during resizing; the
panel contents keep their proportions.


