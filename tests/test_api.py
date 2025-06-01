"""
API Tests Module (Adapted for Mac Environment Considerations)

This module tests the FastAPI endpoints for the Ontorum graph database.
Tests assume that Neo4j is running and properly configured.
It considers potential Mac environment specifics like httpx versioning for TestClient.
"""

import pytest
from fastapi.testclient import TestClient
from uuid import UUID # For test_node_not_found
import json

from backend.api import app
# Import Pydantic models for specific node types if tests create them directly before API call
# from backend.models import Particular, Universal, Dimension, State

from backend.ontology_loader import get_ontology
from backend.llm import LLMService
ontology = get_ontology() # For dynamic NodeType, RelationshipType, and metadata
from backend.database import OntorumDB, ConnectionError
from backend.graph_grammar import GraphLinter # Ensure GraphLinter is imported

@pytest.fixture
def client():
    """Create a test client."""
    # POTENTIAL MAC ENVIRONMENT ISSUE:
    # If you encounter: TypeError: Client.__init__() got an unexpected keyword argument 'app'
    # This is likely due to an incompatible (older) version of the 'httpx' library.
    # Please ensure 'httpx' is version 0.23.0 or newer: pip install -U httpx
    return TestClient(app)

@pytest.fixture
def db():
    """Create and clean up database connection for each test."""
    try:
        db_instance = OntorumDB()
        db_instance.clear_database()
        yield db_instance
    except ConnectionError as e: # Catch specific connection error
        pytest.skip(f"Skipping database tests: Neo4j connection failed - {e}")
    # No finally block needed for db_instance.close() if handled by OntorumDB's context or if TestClient manages app lifespan
    # However, explicit close is good practice if db_instance is managed solely by this fixture.
    # Re-adding explicit close for safety if OntorumDB doesn't use atexit or similar.
    finally:
        if 'db_instance' in locals() and hasattr(db_instance, '_driver') and db_instance._driver is not None:
             db_instance.close()

# --- Initial tests (will be adapted from original test_api.py) --- 

def test_get_empty_database(client, db):
    """Test that an empty database returns empty lists for all dynamic node types."""
    for node_type_enum in ontology.NodeType:
        response = client.get(f"/api/nodes/type/{node_type_enum.value}")
        assert response.status_code == 200, f"Failed for type {node_type_enum.value}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

def test_create_and_get_node(client, db):
    """Test creating a node and retrieving it, using the first available dynamic type."""
    if not ontology.node_types:
        pytest.skip("No node types defined in current ontology. Skipping test_create_and_get_node.")
        return
    
    node_type_str = ontology.node_types[0] # Use the first available node type key
    node_label = ontology.node_metadata[node_type_str].get("label", node_type_str.capitalize())

    node_data = {
        "name": f"Test {node_label} Node",
        "type": node_type_str, 
        "description": f"A test {node_label} node for dynamic API test"
    }
    response = client.post("/api/nodes", json=node_data)
    assert response.status_code == 200, response.json()
    created_node = response.json()
    
    assert created_node["name"] == node_data["name"]
    assert created_node["type"] == node_type_str 
    assert created_node["description"] == node_data["description"]
    
    node_id = created_node["id"]
    response = client.get(f"/api/nodes/{node_id}")
    assert response.status_code == 200
    retrieved_node = response.json()
    assert retrieved_node == created_node

# def test_invalid_node_creation_bad_type_string(client, db):
#     """Test that providing an invalid node type string to API results in 422."""
#     node_data = {
#         "name": "Test Invalid Type",
#         "type": "INVALID_SUPER_TYPE", # This string is not in ontology.node_types
#         "description": "Test node with a type string not in ontology"
#     }
#     response = client.post("/api/nodes", json=node_data)
#     # This should be caught by the Pydantic validator in NodeCreate (api.py)
#     assert response.status_code == 422 
#     error_details = response.json().get("detail", [])
#     # Pydantic v2+ structure for ValueError from field_validator
#     found_error = False
#     for error in error_details:
#         if isinstance(error, dict) and error.get("type") == "value_error":
#             if "Unknown node type: 'INVALID_SUPER_TYPE'" in error.get("msg", ""):
#                 found_error = True
#                 break
#     assert found_error, f"Specific validation error message not found in {error_details}"

def test_invalid_node_creation_missing_type(client, db):
    """Test that missing the type field results in 422."""
    node_data = {
        "name": "Test Missing Type",
        # "type": ontology.NodeType.PARTICULAR.value, # Type is missing
        "description": "Test node missing type field"
    }
    response = client.post("/api/nodes", json=node_data)
    assert response.status_code == 422


def test_update_node(client, db):
    """Create a node then update its name and description."""
    if not ontology.node_types:
        pytest.skip("No node types defined in ontology.")
    node_type_str = ontology.node_types[0]
    create_resp = client.post(
        "/api/nodes",
        json={"name": "Updatable", "type": node_type_str, "description": "orig"},
    )
    assert create_resp.status_code == 200
    node_id = create_resp.json()["id"]

    update_data = {"name": "Updated Name", "description": "Updated description"}
    update_resp = client.put(f"/api/nodes/{node_id}", json=update_data)
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["name"] == update_data["name"]
    assert updated["description"] == update_data["description"]
    assert updated["id"] == node_id


def test_update_nonexistent_node(client, db):
    """Updating a non-existent node should return 404."""
    fake_id = str(UUID(int=123))
    update_data = {"name": "X", "description": "Y"}
    resp = client.put(f"/api/nodes/{fake_id}", json=update_data)
    assert resp.status_code == 404


def test_llm_edit_description_endpoint(client, db, monkeypatch):
    """Test LLM description editing endpoint with mocked LLM service."""
    if not ontology.node_types:
        pytest.skip("No node types defined in ontology.")

    node_type_str = ontology.node_types[0]
    create_resp = client.post(
        "/api/nodes",
        json={"name": "LLMEdit", "type": node_type_str, "description": "short"},
    )
    assert create_resp.status_code == 200
    node_id = create_resp.json()["id"]

    async def fake_edit(self, node, instruction):
        return "long description"

    monkeypatch.setattr("backend.llm.LLMService.edit_description", fake_edit)

    resp = client.post(
        "/api/llm/edit-description",
        json={"node_id": node_id, "instruction": "Make this description more detailed"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == node_id
    assert data["description"] == "long description"

def test_create_relationship(client, db):
    """Test creating a valid relationship using dynamic types from current ontology."""
    if len(ontology.node_types) < 1 or not ontology.relationship_rules:
        pytest.skip("Skipping test_create_relationship: Not enough node types or no relationship rules defined.")
        return

    # Find the first valid relationship we can create based on the current ontology
    source_type_str = None
    target_type_str = None
    rel_type_str = None

    for rule in ontology.relationship_rules:
        if rule.get("from") and rule.get("to"):
            # Check if these types actually exist in nodes_spec (should be guaranteed by loader validation)
            possible_from = [nt for nt in rule["from"] if nt in ontology.node_types]
            possible_to = [nt for nt in rule["to"] if nt in ontology.node_types]
            if possible_from and possible_to:
                source_type_str = possible_from[0]
                target_type_str = possible_to[0]
                rel_type_str = rule["name"]
                break
    
    if not (source_type_str and target_type_str and rel_type_str):
        pytest.skip("Skipping test_create_relationship: Could not find a constructible relationship in current ontology.")
        return

    source_node_payload = {
        "name": f"Test Source {ontology.node_metadata[source_type_str]['label']}",
        "type": source_type_str,
        "description": f"Source node for {rel_type_str} test"
    }
    source_response = client.post("/api/nodes", json=source_node_payload)
    assert source_response.status_code == 200, source_response.json()
    source_node = source_response.json()

    target_node_payload = {
        "name": f"Test Target {ontology.node_metadata[target_type_str]['label']}",
        "type": target_type_str,
        "description": f"Target node for {rel_type_str} test"
    }
    target_response = client.post("/api/nodes", json=target_node_payload)
    assert target_response.status_code == 200, target_response.json()
    target_node = target_response.json()

    relationship_data = {
        "type": rel_type_str, 
        "source": source_node["id"],
        "target": target_node["id"]
    }
    response = client.post("/api/relationships", json=relationship_data)
    assert response.status_code == 200, response.json()
    data = response.json()
    assert data["type"] == rel_type_str
    assert data["source"] == source_node["id"]
    assert data["target"] == target_node["id"]

def test_invalid_relationship(client, db):
    """Test creating a structurally invalid relationship based on the current ontology."""
    if not ontology.relationship_rules or len(ontology.node_types) < 2:
        pytest.skip("Cannot test invalid relationship: No relationship rules or insufficient node types.")
        return

    # Find a rule and try to violate it. e.g. if rule X: A -> B, try X: C -> B where C is not in A's allowed list.
    # This example will use the first rule and try to use a from_type not allowed by it.
    rule_to_violate = ontology.relationship_rules[0]
    valid_from_types = rule_to_violate["from"]
    valid_to_type = rule_to_violate["to"][0] # Take the first valid target type
    rel_type_str = rule_to_violate["name"]

    # Find a node type that is NOT in valid_from_types for this rule
    invalid_from_type_str = None
    for nt_key in ontology.node_types:
        if nt_key not in valid_from_types:
            invalid_from_type_str = nt_key
            break
    
    if not invalid_from_type_str:
        # This could happen if the first rule allows all node types as source, try another rule or skip.
        pytest.skip(f"Could not find an invalid from_type for relationship '{rel_type_str}' to test violation.")
        return
    
    # Ensure the valid_to_type and invalid_from_type are actual node types in the current spec
    if valid_to_type not in ontology.node_types or invalid_from_type_str not in ontology.node_types:
        pytest.skip("Selected types for test_invalid_relationship are not in the current ontology.")
        return

    node1_payload = {"name": "InvalidRel Source", "type": invalid_from_type_str}
    node1_response = client.post("/api/nodes", json=node1_payload); assert node1_response.status_code == 200
    node1 = node1_response.json()

    node2_payload = {"name": "InvalidRel Target", "type": valid_to_type}
    node2_response = client.post("/api/nodes", json=node2_payload); assert node2_response.status_code == 200
    node2 = node2_response.json()

    relationship_data = {
        "type": rel_type_str,
        "source": node1["id"],
        "target": node2["id"]
    }
    response = client.post("/api/relationships", json=relationship_data)
    assert response.status_code == 400 
    # The error message from GraphLinter will be like: 
    # "Invalid source node type '[invalid_from_type_str]' for relationship '[rel_type_str]'"
    assert f"Invalid source node type '{invalid_from_type_str}' for relationship '{rel_type_str}'" in response.text

def test_invalid_relationship_bad_type_string(client, db):
    """Test creating a relationship with an invalid type string."""
    if len(ontology.node_types) < 2:
        pytest.skip("Skipping test_invalid_relationship_bad_type_string: Requires at least two node types in ontology.")
        return
    
    # Use first two available node types from the current ontology
    node1_type = ontology.node_types[0]
    node2_type = ontology.node_types[1]

    node1 = client.post("/api/nodes", json={"name":"N1RelBadType", "type": node1_type}).json()
    node2 = client.post("/api/nodes", json={"name":"N2RelBadType", "type": node2_type}).json()
    
    relationship_data = {
        "type": "TOTALLY_INVALID_REL_TYPE", 
        "source": node1["id"],
        "target": node2["id"]
    }
    response = client.post("/api/relationships", json=relationship_data)
    assert response.status_code == 400 
    assert "Invalid relationship type string: 'TOTALLY_INVALID_REL_TYPE'" in response.text


def test_node_not_found_get_by_id(client, db):
    """Test that requesting a non-existent node by ID returns 404."""
    fake_id = str(UUID(int=0)) # A valid UUID format, but likely non-existent
    response = client.get(f"/api/nodes/{fake_id}")
    assert response.status_code == 404

def test_get_relationships_for_non_existent_node(client, db):
    """Test getting relationships for a non-existent node ID."""
    # This endpoint in the original test_api.py was /relationships/{fake_id} which seems to imply it might try to get a relationship by its ID
    # However, the current API has /api/relationships/{node_id} which gets relationships FOR a node.
    # Assuming the intent is to get relationships for a non-existent node:
    fake_node_id = str(UUID(int=1)) 
    response = client.get(f"/api/relationships/{fake_node_id}")
    # If the node doesn't exist, the db.get_node_relationships might return empty or error.
    # Current db.get_node_relationships doesn't explicitly check if node exists before querying.
    # A robust API might return 404 if node_id itself is not found, or 200 with empty list if node exists but has no rels.
    # For now, let's expect 200 and empty list as per typical behavior of get_node_relationships if node exists with no rels.
    # If node itself must exist for this endpoint, this test might need adjustment or API might need 404 for non-existent node_id.
    # The current OntorumDB().get_node_relationships just queries for relationships of a given node ID. 
    # If the node ID doesn't exist, the MATCH (n)-[r]-(m) WHERE elementId(n) = $node_id will find nothing.
    assert response.status_code == 200 
    assert response.json() == []


def test_delete_node_endpoint(client, db):
    """Test node deletion endpoint using a dynamic type from current ontology."""
    if not ontology.node_types:
        pytest.skip("No node types defined in current ontology. Skipping test_delete_node_endpoint.")
        return
    node_type_str = ontology.node_types[0] # Use first available type

    node_data = {"name": "Test Node to Delete", "type": node_type_str, "description": "To be deleted"}
    response = client.post("/api/nodes", json=node_data)
    assert response.status_code == 200
    node_id = response.json()["id"]

    delete_response = client.delete(f"/api/nodes/{node_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "success"

    get_response = client.get(f"/api/nodes/{node_id}")
    assert get_response.status_code == 404

def test_delete_nonexistent_node_endpoint(client, db):
    """Test deleting a node that doesn't exist via API."""
    response = client.delete(f"/api/nodes/{str(UUID(int=2))}") # Use a valid UUID format
    assert response.status_code == 404 # API should return 404 if node not found for deletion

def test_delete_relationship_endpoint(client, db):
    """Test relationship deletion endpoint using dynamic types from current ontology."""
    if len(ontology.node_types) < 1 or not ontology.relationship_rules:
        pytest.skip("Skipping test_delete_relationship_endpoint: Not enough node types or no relationship rules.")
        return

    # Dynamically find types and a relationship for the test
    source_type_for_rel = None
    target_type_for_rel = None
    rel_type_str = None
    for rule in ontology.relationship_rules:
        if rule.get("from") and rule.get("to"):
            possible_from = [nt for nt in rule["from"] if nt in ontology.node_types]
            possible_to = [nt for nt in rule["to"] if nt in ontology.node_types]
            if possible_from and possible_to:
                source_type_for_rel = possible_from[0]
                target_type_for_rel = possible_to[0]
                rel_type_str = rule["name"]
                break
    
    if not (source_type_for_rel and target_type_for_rel and rel_type_str):
        pytest.skip("Skipping test_delete_relationship_endpoint: Could not find a constructible relationship.")
        return

    node1 = client.post("/api/nodes", json={"name": "N1 RelDel", "type": source_type_for_rel}).json()
    node2 = client.post("/api/nodes", json={"name": "N2 RelDel", "type": target_type_for_rel}).json()
    
    relationship_data = {"type": rel_type_str, "source": node1["id"], "target": node2["id"]}
    rel_response = client.post("/api/relationships", json=relationship_data)
    assert rel_response.status_code == 200
    rel_id = rel_response.json()["id"]

    delete_response = client.delete(f"/api/relationships/{rel_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "success"

    node1_rels_response = client.get(f"/api/relationships/{node1['id']}")
    assert node1_rels_response.status_code == 200
    assert len(node1_rels_response.json()) == 0

def test_delete_nonexistent_relationship_endpoint(client, db):
    """Test deleting a relationship that doesn't exist via API."""
    response = client.delete(f"/api/relationships/{str(UUID(int=3))}") # Use a valid UUID format
    assert response.status_code == 404 # API should return 404 if relationship not found


# Schema Endpoint Tests

def test_schema_node_types(client, db):
    """Test that node types endpoint returns all available dynamic node types and their metadata."""
    response = client.get("/api/schema/node-types")
    assert response.status_code == 200
    data = response.json()
    
    assert "types" in data
    api_node_types = data["types"]
    assert len(api_node_types) == len(ontology.node_types), "Mismatch in number of node types"

    for type_info in api_node_types:
        assert "value" in type_info
        assert "label" in type_info
        assert "metadata" in type_info
        
        type_key = type_info["value"]
        assert type_key in ontology.node_types, f"API returned unknown node type value: {type_key}"
        
        expected_meta = ontology.node_metadata[type_key]
        assert type_info["label"] == expected_meta.get("label", type_key.capitalize())
        assert type_info["metadata"] == expected_meta
        assert type_info["metadata"]["label"] == expected_meta["label"]
        assert type_info["metadata"]["properties"] == expected_meta["properties"]

def test_schema_relationship_types(client, db):
    """Test that relationship types endpoint returns all available dynamic relationship types."""
    response = client.get("/api/schema/relationship-types")
    assert response.status_code == 200
    data = response.json()
    
    assert "types" in data
    api_rel_types = data["types"]
    
    expected_rel_type_values = [rt_enum.value for rt_enum in ontology.RelationshipType]
    assert len(api_rel_types) == len(expected_rel_type_values), "Mismatch in number of relationship types"

    for type_info in api_rel_types:
        assert "value" in type_info
        assert "label" in type_info
        assert type_info["value"] in expected_rel_type_values, f"API returned unknown relationship type value: {type_info['value']}"
        assert type_info["label"] == type_info["value"].replace('_', ' ').capitalize()

def test_schema_allowed_relationship_schemas(client, db):
    """Test that allowed relationship schemas endpoint returns all valid dynamic relationship combinations with properties."""
    response = client.get("/api/schema/allowed-relationship-schemas")
    assert response.status_code == 200, response.text
    data = response.json()
    
    assert "relationships" in data
    api_allowed_rels = data["relationships"]

    expected_schemas_from_linter = GraphLinter.get_allowed_relationship_schemas()
    assert len(api_allowed_rels) == len(expected_schemas_from_linter), "Mismatch in number of allowed relationship schemas"

    for api_rel_schema in api_allowed_rels:
        assert "from_type" in api_rel_schema
        assert "to_type" in api_rel_schema
        assert "relationship_type" in api_rel_schema
        assert "properties" in api_rel_schema 
        assert api_rel_schema["from_type"] in ontology.node_types
        assert api_rel_schema["to_type"] in ontology.node_types
        assert api_rel_schema["relationship_type"] in [rt.value for rt in ontology.RelationshipType]

    # Example: Check for a specific relationship type if it exists in the current ontology
    # This part needs to be conditional on the relationship type existing.
    # For example, if testing "POTENTIALITY" which was in the old default spec:
    potentiality_type_str = "POTENTIALITY" # Example, could be any type with known properties
    if potentiality_type_str in [rt.value for rt in ontology.RelationshipType]:
        potentiality_schema_api = next((
            s for s in api_allowed_rels if s["relationship_type"] == potentiality_type_str
        ), None)
        assert potentiality_schema_api is not None, f"{potentiality_type_str} schema not found in API response when expected."
        
        potentiality_rule_source = next((
            rule for rule in ontology.relationship_rules if rule["name"] == potentiality_type_str
        ), None)
        assert potentiality_rule_source is not None
        expected_props = potentiality_rule_source.get("properties", []) 
        
        if expected_props: 
            assert potentiality_schema_api["properties"] == expected_props, \
                f"Properties for {potentiality_type_str} mismatch. API: {potentiality_schema_api['properties']}, Expected from spec: {expected_props}"
        else: 
            assert potentiality_schema_api["properties"] == {}, \
                f"Properties for {potentiality_type_str} should be empty dict if not in spec, got: {potentiality_schema_api['properties']}"
    else:
        print(f"INFO: Skipping specific check for '{potentiality_type_str}' properties as it's not in the current ontology.")

    # Example: Check a relationship type known to have no properties in any spec (if applicable)
    # Or, more generically, check that if a rule has no 'properties' key, the API returns {}
    for rel_rule in ontology.relationship_rules:
        if "properties" not in rel_rule:
            rule_name = rel_rule["name"]
            schema_from_api = next((s for s in api_allowed_rels if s["relationship_type"] == rule_name), None)
            if schema_from_api:
                 assert schema_from_api["properties"] == [], f"{rule_name} should have empty list for properties as per API logic if not in spec."


def test_export_import_endpoints(client, db, tmp_path):
    if len(ontology.node_types) < 2 or not ontology.relationship_rules:
        pytest.skip("Skipping export/import endpoint test: insufficient ontology data")

    from_type = ontology.node_types[0]
    to_type = ontology.node_types[1]
    rel_type = None
    for rule in ontology.relationship_rules:
        if from_type in rule.get("from", []) and to_type in rule.get("to", []):
            rel_type = rule["name"]
            break
    if rel_type is None:
        pytest.skip("No suitable relationship rule for export/import test")

    node1 = client.post("/api/nodes", json={"type": from_type, "name": "Export1", "description": ""}).json()
    node2 = client.post("/api/nodes", json={"type": to_type, "name": "Export2", "description": ""}).json()
    client.post("/api/relationships", json={"type": rel_type, "source": node1["id"], "target": node2["id"]})

    export_resp = client.get("/api/database/export")
    assert export_resp.status_code == 200
    data = export_resp.json()

    clear_resp = client.post("/api/database/clear")
    assert clear_resp.status_code == 200

    import_resp = client.post(
        "/api/database/import",
        json={"data": data, "clear": True}
    )
    assert import_resp.status_code == 200

    restored1 = client.get(f"/api/nodes/type/{from_type}").json()
    restored2 = client.get(f"/api/nodes/type/{to_type}").json()
    assert len(restored1) == 1
    assert len(restored2) == 1
    assert restored1[0]["name"] == "Export1"
    assert restored2[0]["name"] == "Export2"


def test_graph_statistics_endpoint(client, db):
    """Ensure the /api/graph/statistics endpoint returns valid counts."""
    if len(ontology.node_types) < 2 or not ontology.relationship_rules:
        pytest.skip("Insufficient ontology for statistics test")

    # create nodes and a relationship using first available rule
    rule = next(r for r in ontology.relationship_rules if r.get("from") and r.get("to"))
    from_type = rule["from"][0]
    to_type = rule["to"][0]
    rel_type = rule["name"]

    n1 = client.post("/api/nodes", json={"name": "S", "type": from_type, "description": ""}).json()
    n2 = client.post("/api/nodes", json={"name": "T", "type": to_type, "description": ""}).json()
    client.post("/api/relationships", json={"type": rel_type, "source": n1["id"], "target": n2["id"]})

    resp = client.get("/api/graph/statistics")
    assert resp.status_code == 200
    stats = resp.json()
    assert stats["total_nodes"] == 2
    assert stats["total_relationships"] == 1
    if from_type == to_type:
        assert stats["node_type_distribution"][from_type] == 2
    else:
        assert stats["node_type_distribution"][from_type] == 1
        assert stats["node_type_distribution"][to_type] == 1
    assert stats["relationship_type_distribution"][rel_type] == 1

