# API Reference

This document describes the REST API implemented in `backend/api.py`. The API is built with **FastAPI** and exposes endpoints for managing nodes, relationships, and performing auxiliary operations such as database import/export and LLM powered generation.

All endpoints are prefixed with `/api`. Example: `POST /api/nodes`.

## Models

### NodeCreate
Payload for creating a new node.
```json
{
  "name": "Example Node",
  "type": "PARTICULAR",
  "description": "Optional description"
}
```
`type` must be one of the values returned by `/api/schema/node-types`.

### NodeUpdate
Payload for updating an existing node. All fields are optional.
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

### NodeResponse
Response format for node related endpoints.
```json
{
  "id": "<neo4j-id>",
  "elementId": "<same-as-id>",
  "name": "Example Node",
  "type": "particular",
  "description": "..."
}
```

### RelationshipCreate
```json
{
  "type": "RELATIONSHIP_TYPE",
  "source": "<source-node-id>",
  "target": "<target-node-id>",
  "properties": {
    "weight": 1.0
  }
}
```

### RelationshipResponse
Returned for relationship endpoints.
```json
{
  "id": "<relationship-id>",
  "type": "RELATIONSHIP_TYPE",
  "source": "<source-node-id>",
  "target": "<target-node-id>",
  "properties": {"weight": 1.0}
}
```

### LLMGenerateRequest
```json
{
  "instruction": {
    "relationship_type": "RELATED_TO",
    "source_type": "PARTICULAR",
    "target_type": "UNIVERSAL",
    "is_source": true,
    "additional_instructions": "Optional free form text"
  },
  "context": {
    "node_type": "PARTICULAR",
    "node_id": "uuid",
    "node_name": "Example",
    "node_description": "Optional"
  }
}
```

### LLMGenerateResponse
```json
{
  "candidates": [
    {"name": "A", "type": "PARTICULAR", "description": "..."}
  ],
  "message": "Successfully generated candidates"
}
```

### LLMEditDescriptionRequest
Payload for editing a node's description using the LLM.
```json
{
  "node_id": "string",
  "instruction": "Optional: Specific instruction for the LLM (e.g., 'Make this description more concise focusing on its key attributes.') Defaults to 'Make this longer'."
}
```

### GraphStatsResponse
Response format for graph statistics. The exact structure may vary but typically includes counts and distributions.
```json
{
  "node_count": 120,
  "relationship_count": 350,
  "node_types_distribution": {
    "PARTICULAR": 80,
    "UNIVERSAL": 40
  },
  "relationship_types_distribution": {
    "IS_A": 150,
    "RELATED_TO": 200
  }
}
```
(Note: This is an example structure; actual fields may differ based on `GraphStats` model in `backend/graph_statistics.py`)

### GrammarSelectRequest
Payload for selecting the active grammar.
```json
{
  "name": "grammar_name_to_select"
}
```

### GrammarDuplicateRequest
Payload for duplicating an existing grammar.
```json
{
  "name": "existing_grammar_name",
  "new_name": "new_grammar_name_for_duplicate"
}
```

## Endpoints

### Nodes
- `POST /api/nodes` → create a new node. Returns `NodeResponse`.
- `GET /api/nodes/{id}` → retrieve a node by its ID. Returns `NodeResponse` or 404.
- `PUT /api/nodes/{id}` → update an existing node's name and description. Returns `NodeResponse`.
- `GET /api/nodes/type/{node_type}` → list all nodes of a given type.
- `DELETE /api/nodes/{id}` → remove a node and its relationships.

### Relationships
- `POST /api/relationships` → create a relationship. Payload is `RelationshipCreate`.
- `GET /api/relationships/{node_id}` → list all relationships attached to a node.
- `DELETE /api/relationships/{relationship_id}` → delete a specific relationship.

### Schema
- `GET /api/schema/node-types` → list node types with metadata.
- `GET /api/schema/relationship-types` → list relationship types.
- `GET /api/schema/allowed-relationship-schemas` → list all valid `from → to` combinations and their allowed properties.

### LLM Integration
- `POST /api/llm/generate` → generate candidate nodes via the LLM service. Returns `LLMGenerateResponse`.
- `POST /api/llm/edit-description` → use the LLM to edit an existing node's description. Payload is `LLMEditDescriptionRequest`. Returns `NodeResponse`.
- Analysis endpoints from `analysis_router` are mounted under `/api/analysis`. For detailed documentation of these specific analysis endpoints, please refer to the `backend/analysis.py` module or associated documentation for that router.

### Database Utilities
- `POST /api/database/clear` → delete all nodes and relationships.
- `GET /api/database/export` → export the database as JSON. Optional `filename` query parameter customizes the download name.
- `POST /api/database/import` → import a JSON export back into the database. Payload is `{ "data": {...}, "clear": false }`.

### Graph Statistics
- `GET /api/graph/statistics` → retrieve overall graph statistics for frontend display. Returns `GraphStatsResponse`.

### Grammar Management
Endpoints for managing ontology grammars.
- `GET /api/grammars` → list all available grammars and the name of the currently active grammar. Returns `{"grammars": ["list", "of", "names"], "current": "current_grammar_name"}`.
- `POST /api/grammars/select` → set the active grammar. Payload is `GrammarSelectRequest`. Returns `{"current": "selected_grammar_name"}`.
- `POST /api/grammars/duplicate` → duplicate an existing grammar with a new name. Payload is `GrammarDuplicateRequest`. Returns `{"status": "success"}`.
- `GET /api/grammars/{name}` → retrieve the definition of a specific grammar by its name. Returns the grammar data as JSON.
- `PUT /api/grammars/{name}` → update the definition of an existing grammar. The request body should be a JSON object representing the new grammar data. Returns `{"status": "success"}`.
- `DELETE /api/grammars/{name}` → delete a grammar by its name. Returns `{"status": "success"}`.

## Error Handling
The API installs custom exception handlers for validation errors (`422`), explicit HTTP errors, and uncaught exceptions. Errors are logged and returned in a structured form, for example:
```json
{
  "detail": "Node not found"
}
```

## Authentication
Authentication is currently not implemented. The API assumes trusted access within a development environment.

## Running the Server
Start the development server with:
```bash
python -m uvicorn backend.api:app --reload --port 8000
```
This assumes environment variables described in `docs/development.md` are configured.

