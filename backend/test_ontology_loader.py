import pytest
import json
from pathlib import Path
from tempfile import TemporaryDirectory

from backend.ontology_loader import Ontology, OntologySpecError

# Helper function to create a temporary spec file
def create_temp_spec_file(dir_path, spec_content):
    path = Path(dir_path) / "temp_ontology_spec.json"
    if isinstance(spec_content, str): # If content is already a JSON string (for invalid JSON test)
        with open(path, 'w') as f:
            f.write(spec_content)
    else: # Assume it's a dict to be dumped as JSON
        with open(path, 'w') as f:
            json.dump(spec_content, f)
    return str(path)

# A known valid spec (based on current ontology_spec.json structure, but simplified for focused testing)
VALID_SPEC = {
  "nodes": {
    "particular":   { "label": "Particular", "properties": ["id","name","description","type"] },
    "universal":    { "label": "Universal",  "properties": ["id","name","description","type"] },
    "dimension":    { "label": "Dimension",  "properties": ["id","name","description","type"] },
    "state":        { "label": "State",      "properties": ["id","name","description","type"] }
  },
  "relationships": [
    {
      "name": "GENERALIZES", "from": ["universal"], "to": ["universal"], "required": False,
      "description": "A universal can generalize other universals", 
      "prompt_if_source": "Prompt for source of GENERALIZES", 
      "prompt_if_target": "Prompt for target of GENERALIZES"
    },
    {
      "name": "INSTANCE_OF", "from": ["particular"], "to": ["universal"], "required": True,
      "description": "A particular can be an instance of a universal",
      "prompt_if_source": "Prompt for source of INSTANCE_OF", 
      "prompt_if_target": "Prompt for target of INSTANCE_OF"
    },
    {
      "name": "POTENTIALITY", "from": ["state"], "to": ["state"], "required": False,
      "description": "A state can transition to another state through an action",
      "properties": ["action"], # Optional properties field
      "prompt_if_source": "Prompt for source of POTENTIALITY", 
      "prompt_if_target": "Prompt for target of POTENTIALITY"
    }
    # Other relationships from the full spec would also need to be validly structured
    # For this test, we assume a simplified but structurally valid set.
  ]
}

def test_load_valid_spec():
    """Test loading a well-formed and valid ontology specification."""
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, VALID_SPEC)
        try:
            ontology_instance = Ontology(spec_path)
            assert len(ontology_instance.node_types) == 4
            assert len(ontology_instance.rel_types) == 3 
            assert ontology_instance.NodeType.PARTICULAR.value == "particular"
            assert ontology_instance.RelationshipType.INSTANCE_OF.value == "INSTANCE_OF"
            assert ontology_instance.node_metadata["particular"]["label"] == "Particular"
            assert ontology_instance.relationship_rules[0]["name"] == "GENERALIZES"
            assert len(ontology_instance.relationship_rules[2]["properties"]) == 1 # POTENTIALITY properties
        except OntologySpecError as e:
            pytest.fail(f"Loading a valid spec raised an unexpected OntologySpecError: {e}")

# --- Tests for Invalid Specs --- 

def test_invalid_json_format():
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, "this is not json {")
        with pytest.raises(OntologySpecError, match="Invalid JSON"):
            Ontology(spec_path)

def test_spec_not_an_object():
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, []) # Spec is a list, not an object
        with pytest.raises(OntologySpecError, match="must be a JSON object"):
            Ontology(spec_path)

def test_missing_nodes_section():
    spec = { "relationships": [] }
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError, match="must contain a 'nodes' object/dictionary"):
            Ontology(spec_path)

def test_nodes_not_a_dict():
    spec = { "nodes": [], "relationships": [] }
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError, match="must contain a 'nodes' object/dictionary"):
            Ontology(spec_path)

def test_missing_relationships_section():
    spec = { "nodes": {} }
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError, match="must contain a 'relationships' array/list"):
            Ontology(spec_path)

def test_relationships_not_a_list():
    spec = { "nodes": {}, "relationships": {} }
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError, match="must contain a 'relationships' array/list"):
            Ontology(spec_path)

# --- Node Definition Validation Tests ---
def test_node_def_not_a_dict():
    spec = { "nodes": {"my_node": "not_a_dict"}, "relationships": [] }
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError, match="Node definition for 'my_node' must be an object/dictionary"):
            Ontology(spec_path)

def test_node_def_missing_label():
    spec = { "nodes": {"my_node": { "properties": [] }}, "relationships": [] }
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError, match="Node 'my_node' is missing a valid 'label'"):
            Ontology(spec_path)

def test_node_def_empty_label():
    spec = { "nodes": {"my_node": { "label": " ", "properties": [] }}, "relationships": [] }
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError, match="Node 'my_node' is missing a valid 'label'"):
            Ontology(spec_path)

def test_node_def_missing_properties():
    spec = { "nodes": {"my_node": { "label": "My Node" }}, "relationships": [] }
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError, match="Node 'my_node' is missing a 'properties' list"):
            Ontology(spec_path)

def test_node_def_properties_not_list():
    spec = { "nodes": {"my_node": { "label": "My Node", "properties": "not_a_list" }}, "relationships": [] }
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError, match="Node 'my_node' is missing a 'properties' list or it's not a list"):
            Ontology(spec_path)

# --- Relationship Definition Validation Tests (General Structure & Node Linking) ---
def test_relationship_def_not_a_dict():
    spec = { "nodes": {"n1": VALID_SPEC["nodes"]["particular"]}, "relationships": ["not_a_dict"] }
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError, match="Relationship definition at index 0 must be an object/dictionary"):
            Ontology(spec_path)

def test_relationship_def_missing_name():
    spec = { "nodes": {"n1": VALID_SPEC["nodes"]["particular"]}, "relationships": [{ "from": ["n1"], "to": ["n1"], "required": False, "description": "d", "prompt_if_source": "ps", "prompt_if_target": "pt" }] }
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError, match="is missing a valid 'name'"):
            Ontology(spec_path)

def test_relationship_from_references_undefined_node():
    spec = {
        "nodes": {"actual_node": VALID_SPEC["nodes"]["particular"]},
        "relationships": [{
            "name": "REL1", "from": ["non_existent_node"], "to": ["actual_node"], "required": False,
            "description": "d", "prompt_if_source": "s", "prompt_if_target": "t"
        }]
    }
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError, match=r"Relationship 'REL1' references an undefined node type 'non_existent_node' in its 'from' field"):
            Ontology(spec_path)

def test_relationship_to_references_undefined_node():
    spec = {
        "nodes": {"actual_node": VALID_SPEC["nodes"]["particular"]},
        "relationships": [{
            "name": "REL1", "from": ["actual_node"], "to": ["non_existent_node"], "required": False,
             "description": "d", "prompt_if_source": "s", "prompt_if_target": "t"
        }]
    }
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError, match=r"Relationship 'REL1' references an undefined node type 'non_existent_node' in its 'to' field"):
            Ontology(spec_path)

def test_relationship_missing_from_list():
    spec_copy = json.loads(json.dumps(VALID_SPEC))
    del spec_copy["relationships"][0]["from"]
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec_copy)
        with pytest.raises(OntologySpecError, match=r"Relationship 'GENERALIZES' must have a non-empty list for 'from' node types"):
            Ontology(spec_path)

def test_relationship_empty_to_list():
    spec_copy = json.loads(json.dumps(VALID_SPEC))
    spec_copy["relationships"][0]["to"] = []
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec_copy)
        with pytest.raises(OntologySpecError, match=r"Relationship 'GENERALIZES' must have a non-empty list for 'to' node types"):
            Ontology(spec_path)

# --- Relationship Field Content Validation (More detailed) ---
RELATIONSHIP_MANDATORY_STR_FIELDS = ["description", "prompt_if_source", "prompt_if_target"]

@pytest.mark.parametrize("field_to_remove", RELATIONSHIP_MANDATORY_STR_FIELDS + ["required"])
def test_relationship_missing_mandatory_field(field_to_remove):
    spec = json.loads(json.dumps(VALID_SPEC)) # Deep copy
    # Ensure the field actually exists in the source VALID_SPEC before trying to delete
    # This is important if VALID_SPEC structure changes or field_to_remove is not in all rels
    if field_to_remove not in spec["relationships"][0]:
        pytest.skip(f"Field {field_to_remove} not in VALID_SPEC[\"relationships\"][0] for this test setup")
    
    del spec["relationships"][0][field_to_remove] # Remove from first relationship
    rel_name = spec["relationships"][0]["name"]
    
    # Construct the exact expected error message, including the period.
    expected_exact_message = f"Relationship '{rel_name}'"
    if field_to_remove == "required":
        expected_exact_message += f" is missing 'required' field or it's not a boolean."
    elif field_to_remove in RELATIONSHIP_MANDATORY_STR_FIELDS:
        expected_exact_message += f" is missing a valid '{field_to_remove}' (non-empty string)."
    else:
        pytest.fail(f"Unhandled field_to_remove in test parameterization: {field_to_remove}")

    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError) as exc_info:
            Ontology(spec_path)
        assert str(exc_info.value) == expected_exact_message

@pytest.mark.parametrize("field_to_invalidate, bad_value, expected_message_part_template", [
    ("description", "", "is missing a valid 'description' (non-empty string)"),
    ("description", 123, "is missing a valid 'description' (non-empty string)"),
    ("required", "not_a_boolean", "is missing 'required' field or it's not a boolean"),
    ("prompt_if_source", " ", "is missing a valid 'prompt_if_source' (non-empty string)"),
    ("prompt_if_source", True, "is missing a valid 'prompt_if_source' (non-empty string)"),
    ("prompt_if_target", "", "is missing a valid 'prompt_if_target' (non-empty string)"),
    ("prompt_if_target", [], "is missing a valid 'prompt_if_target' (non-empty string)"),
])
def test_relationship_invalid_type_for_mandatory_fields(field_to_invalidate, bad_value, expected_message_part_template):
    spec = json.loads(json.dumps(VALID_SPEC))
    rel_name = spec["relationships"][0]["name"]
    spec["relationships"][0][field_to_invalidate] = bad_value
    # Construct the exact expected error message from OntologyLoader
    expected_exact_message = f"Relationship '{rel_name}' {expected_message_part_template}."
    
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError) as exc_info:
            Ontology(spec_path)
        assert str(exc_info.value) == expected_exact_message

def test_relationship_properties_not_list():
    spec = json.loads(json.dumps(VALID_SPEC))
    spec["relationships"][2]["properties"] = "not_a_list" # POTENTIALITY normally has properties
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError, match=r"Relationship 'POTENTIALITY' has a 'properties' field that is not a list"):
            Ontology(spec_path)

def test_relationship_properties_list_empty_item():
    spec = json.loads(json.dumps(VALID_SPEC))
    spec["relationships"][2]["properties"] = ["action", " "] # Empty string item (after strip)
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError, match=r"Relationship 'POTENTIALITY' has an invalid item in its 'properties' list: ' '"):
            Ontology(spec_path)
    
def test_relationship_properties_list_non_string_item():
    spec = json.loads(json.dumps(VALID_SPEC))
    spec["relationships"][2]["properties"] = ["action", 123] # Non-string item
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError, match=r"Relationship 'POTENTIALITY' has an invalid item in its 'properties' list: '123'"):
            Ontology(spec_path)

# --- Uniqueness and Identifier Validation --- 
def test_duplicate_relationship_names():
    spec = json.loads(json.dumps(VALID_SPEC))
    spec["relationships"].append(spec["relationships"][0]) # Duplicate GENERALIZES
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError, match=r"Duplicate relationship names found: \['GENERALIZES'\]"):
            Ontology(spec_path)

def test_invalid_node_type_key_for_enum():
    spec = { "nodes": {"123type": VALID_SPEC["nodes"]["particular"]}, "relationships": [] }
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError, match=r"Node type key '123type' \(becomes '123TYPE'\) is not a valid Python identifier"):
            Ontology(spec_path)

def test_invalid_relationship_name_for_enum():
    spec = {
        "nodes": VALID_SPEC["nodes"],
        "relationships": [{
            "name": "-INVALID-NAME-", "from": ["particular"], "to": ["universal"], "required": True,
            "description": "d", "prompt_if_source": "s", "prompt_if_target": "t"
        }]
    }
    with TemporaryDirectory() as tmpdir:
        spec_path = create_temp_spec_file(tmpdir, spec)
        with pytest.raises(OntologySpecError, match=r"Relationship name '-INVALID-NAME-' \(becomes '-INVALID-NAME-'\) is not a valid Python identifier"):
            Ontology(spec_path) 