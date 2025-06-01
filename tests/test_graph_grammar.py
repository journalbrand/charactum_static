"""
Test Graph Grammar Module

This module tests the GraphLinter component, ensuring it correctly validates
node and relationship types based on the dynamically loaded ontology.
"""

import pytest
from backend.graph_grammar import GraphLinter, NodeType, RelationshipType

# Test cases for GraphLinter.validate_relationship

def test_validate_relationship_valid_instance_of():
    """Test a valid INSTANCE_OF relationship (Particular -> Universal)."""
    is_valid, error_msg = GraphLinter.validate_relationship(
        from_type=NodeType.PARTICULAR.value,  # "particular"
        to_type=NodeType.UNIVERSAL.value,    # "universal"
        rel_type=RelationshipType.INSTANCE_OF # RelationshipType.INSTANCE_OF Enum member
    )
    assert is_valid is True
    assert error_msg is None

def test_validate_relationship_invalid_from_type_for_instance_of():
    """Test an invalid from_type for INSTANCE_OF (e.g., Universal -> Universal)."""
    is_valid, error_msg = GraphLinter.validate_relationship(
        from_type=NodeType.UNIVERSAL.value, # "universal"
        to_type=NodeType.UNIVERSAL.value,   # "universal"
        rel_type=RelationshipType.INSTANCE_OF
    )
    assert is_valid is False
    assert error_msg == f"Invalid source node type 'universal' for relationship 'INSTANCE_OF'"

def test_validate_relationship_invalid_to_type_for_instance_of():
    """Test an invalid to_type for INSTANCE_OF (e.g., Particular -> Dimension)."""
    is_valid, error_msg = GraphLinter.validate_relationship(
        from_type=NodeType.PARTICULAR.value, # "particular"
        to_type=NodeType.DIMENSION.value,    # "dimension"
        rel_type=RelationshipType.INSTANCE_OF
    )
    assert is_valid is False
    assert error_msg == f"Invalid target node type 'dimension' for relationship 'INSTANCE_OF'"

def test_validate_relationship_invalid_relationship_type():
    """Test using a relationship type string that doesn't exist in the enum."""
    # This test relies on the fact that RelationshipType(value) will raise ValueError for unknown values.
    # The validate_relationship method should ideally handle or document this.
    # For now, we assume rel_type is always a valid Enum member as per its type hint.
    # If we were to pass a raw string, the type checker would complain.
    # GraphLinter itself expects an Enum member.
    # The first check in validate_relationship is `rule = GraphLinter._relationship_rules_map.get(rel_type.value)`
    # If rel_type was not a valid member, it wouldn't have a .value or wouldn't be found.
    # Let's simulate trying to get a rule that doesn't exist by bypassing enum.
    class MockRelType:
        def __init__(self, value):
            self.value = value
            self.name = value # for error messages

    invalid_rel_enum_mock = MockRelType("DOES_NOT_EXIST")

    is_valid, error_msg = GraphLinter.validate_relationship(
        from_type=NodeType.PARTICULAR.value,
        to_type=NodeType.UNIVERSAL.value,
        rel_type=invalid_rel_enum_mock # type: ignore 
    )
    assert is_valid is False
    assert error_msg == f"Invalid relationship type: DOES_NOT_EXIST"


def test_validate_relationship_potentiality_with_properties():
    """Test POTENTIALITY relationship (State -> State) with required 'action' property."""
    is_valid, error_msg = GraphLinter.validate_relationship(
        from_type=NodeType.STATE.value,    # "state"
        to_type=NodeType.STATE.value,      # "state"
        rel_type=RelationshipType.POTENTIALITY,
        properties={"action": "melts"}
    )
    assert is_valid is True
    assert error_msg is None

def test_validate_relationship_potentiality_missing_properties_object():
    """Test POTENTIALITY relationship when the entire 'properties' dict is missing."""
    is_valid, error_msg = GraphLinter.validate_relationship(
        from_type=NodeType.STATE.value,
        to_type=NodeType.STATE.value,
        rel_type=RelationshipType.POTENTIALITY,
        properties=None # Explicitly None
    )
    assert is_valid is False
    assert error_msg == f"Missing required properties for POTENTIALITY"
    
def test_validate_relationship_potentiality_missing_action_in_properties():
    """Test POTENTIALITY relationship when 'properties' dict is present but 'action' key is missing."""
    is_valid, error_msg = GraphLinter.validate_relationship(
        from_type=NodeType.STATE.value,
        to_type=NodeType.STATE.value,
        rel_type=RelationshipType.POTENTIALITY,
        properties={"some_other_prop": "value"} # 'action' is missing
    )
    assert is_valid is False
    assert error_msg == f"Missing required property 'action' for POTENTIALITY"

def test_validate_relationship_generalizes_valid():
    """Test a valid GENERALIZES relationship (Universal -> Universal)."""
    is_valid, error_msg = GraphLinter.validate_relationship(
        from_type=NodeType.UNIVERSAL.value,
        to_type=NodeType.UNIVERSAL.value,
        rel_type=RelationshipType.GENERALIZES
    )
    assert is_valid is True
    assert error_msg is None

def test_validate_relationship_has_dimension_valid_universal_to_dimension():
    """Test a valid HAS_DIMENSION relationship (Universal -> Dimension)."""
    is_valid, error_msg = GraphLinter.validate_relationship(
        from_type=NodeType.UNIVERSAL.value, # "universal"
        to_type=NodeType.DIMENSION.value,   # "dimension"
        rel_type=RelationshipType.HAS_DIMENSION
    )
    assert is_valid is True
    assert error_msg is None

def test_validate_relationship_has_dimension_valid_particular_to_dimension():
    """Test a valid HAS_DIMENSION relationship (Particular -> Dimension)."""
    is_valid, error_msg = GraphLinter.validate_relationship(
        from_type=NodeType.PARTICULAR.value, # "particular"
        to_type=NodeType.DIMENSION.value,    # "dimension"
        rel_type=RelationshipType.HAS_DIMENSION
    )
    assert is_valid is True
    assert error_msg is None
    
def test_validate_relationship_admits_value_valid():
    """Test a valid ADMITS_VALUE relationship (Dimension -> State)."""
    is_valid, error_msg = GraphLinter.validate_relationship(
        from_type=NodeType.DIMENSION.value, # "dimension"
        to_type=NodeType.STATE.value,       # "state"
        rel_type=RelationshipType.ADMITS_VALUE
    )
    assert is_valid is True
    assert error_msg is None

def test_validate_relationship_value_admitted_valid_universal_to_state():
    """Test a valid VALUE_ADMITTED relationship (Universal -> State)."""
    is_valid, error_msg = GraphLinter.validate_relationship(
        from_type=NodeType.UNIVERSAL.value, # "universal"
        to_type=NodeType.STATE.value,       # "state"
        rel_type=RelationshipType.VALUE_ADMITTED
    )
    assert is_valid is True
    assert error_msg is None

def test_validate_relationship_value_admitted_valid_particular_to_state():
    """Test a valid VALUE_ADMITTED relationship (Particular -> State)."""
    is_valid, error_msg = GraphLinter.validate_relationship(
        from_type=NodeType.PARTICULAR.value, # "particular"
        to_type=NodeType.STATE.value,        # "state"
        rel_type=RelationshipType.VALUE_ADMITTED
    )
    assert is_valid is True
    assert error_msg is None

# Test cases for GraphLinter.validate_node_relationships

def test_validate_node_relationships_dimension_valid():
    """Test a Dimension node with its required ADMITS_VALUE relationship."""
    is_valid, error_msg = GraphLinter.validate_node_relationships(
        node_type=NodeType.DIMENSION.value, # "dimension"
        relationships=[{"type": RelationshipType.ADMITS_VALUE.value, "source": "dim1", "target": "state1"}]
    )
    assert is_valid is True
    assert error_msg is None

def test_validate_node_relationships_dimension_missing_required():
    """Test a Dimension node missing its required ADMITS_VALUE relationship."""
    is_valid, error_msg = GraphLinter.validate_node_relationships(
        node_type=NodeType.DIMENSION.value,
        relationships=[] # No relationships
    )
    assert is_valid is False
    assert error_msg == f"Missing required relationship 'ADMITS_VALUE' for node type 'dimension'"

def test_validate_node_relationships_dimension_with_other_optional_rels():
    """Test Dimension with required ADMITS_VALUE and other non-required relationships."""
    # Assuming a hypothetical optional relationship for Dimension for testing purposes
    # If Dimension had an optional outgoing rel, this should still pass if ADMITS_VALUE is present.
    is_valid, error_msg = GraphLinter.validate_node_relationships(
        node_type=NodeType.DIMENSION.value,
        relationships=[
            {"type": RelationshipType.ADMITS_VALUE.value, "source": "dim1", "target": "state1"},
            {"type": "SOME_OPTIONAL_REL_FROM_DIMENSION", "source": "dim1", "target": "other"} # Hypothetical
        ]
    )
    assert is_valid is True # This should be true as the required one is present
    assert error_msg is None

def test_validate_node_relationships_particular_valid():
    """Test a Particular node with its required INSTANCE_OF relationship."""
    is_valid, error_msg = GraphLinter.validate_node_relationships(
        node_type=NodeType.PARTICULAR.value, # "particular"
        relationships=[{"type": RelationshipType.INSTANCE_OF.value, "source": "part1", "target": "uni1"}]
    )
    assert is_valid is True
    assert error_msg is None

def test_validate_node_relationships_particular_missing_required():
    """Test a Particular node missing its required INSTANCE_OF relationship."""
    is_valid, error_msg = GraphLinter.validate_node_relationships(
        node_type=NodeType.PARTICULAR.value,
        relationships=[]
    )
    assert is_valid is False
    assert error_msg == f"Missing required relationship 'INSTANCE_OF' for node type 'particular'"

def test_validate_node_relationships_universal_no_required_rels():
    """Test a Universal node, which has no explicitly required outgoing relationships in current spec."""
    is_valid, error_msg = GraphLinter.validate_node_relationships(
        node_type=NodeType.UNIVERSAL.value, # "universal"
        relationships=[]
    )
    assert is_valid is True
    assert error_msg is None

def test_validate_node_relationships_universal_with_optional_rel():
    """Test a Universal node with an optional relationship (e.g., GENERALIZES)."""
    is_valid, error_msg = GraphLinter.validate_node_relationships(
        node_type=NodeType.UNIVERSAL.value,
        relationships=[{"type": RelationshipType.GENERALIZES.value, "source": "uni1", "target": "uni2"}]
    )
    assert is_valid is True
    assert error_msg is None

def test_validate_node_relationships_state_no_required_rels():
    """Test a State node, which has no explicitly required outgoing relationships in current spec."""
    is_valid, error_msg = GraphLinter.validate_node_relationships(
        node_type=NodeType.STATE.value, # "state"
        relationships=[]
    )
    assert is_valid is True
    assert error_msg is None

# Test cases for GraphLinter.get_allowed_relationship_schemas

def test_get_allowed_relationship_schemas():
    """Test the generation of allowed relationship schemas."""
    schemas = GraphLinter.get_allowed_relationship_schemas()

    # Expected number of schemas based on ontology_spec.json:
    # GENERALIZES: universal -> universal (1)
    # INSTANCE_OF: particular -> universal (1)
    # HAS_DIMENSION: universal -> dimension, particular -> dimension (2)
    # ADMITS_VALUE: dimension -> state (1)
    # VALUE_ADMITTED: universal -> state, particular -> state (2)
    # POTENTIALITY: state -> state (1)
    # Total = 1 + 1 + 2 + 1 + 2 + 1 = 8
    assert len(schemas) == 8, "Incorrect number of allowed schemas generated"

    # Check for a few specific, expected schemas
    expected_schema_instance_of = (
        NodeType.PARTICULAR,
        NodeType.UNIVERSAL,
        RelationshipType.INSTANCE_OF
    )
    found_instance_of = any(
        s.from_type == expected_schema_instance_of[0] and \
        s.to_type == expected_schema_instance_of[1] and \
        s.relationship_type == expected_schema_instance_of[2]
        for s in schemas
    )
    assert found_instance_of, f"Expected schema {expected_schema_instance_of} not found"

    expected_schema_has_dimension_from_universal = (
        NodeType.UNIVERSAL,
        NodeType.DIMENSION,
        RelationshipType.HAS_DIMENSION
    )
    found_has_dimension_uni = any(
        s.from_type == expected_schema_has_dimension_from_universal[0] and \
        s.to_type == expected_schema_has_dimension_from_universal[1] and \
        s.relationship_type == expected_schema_has_dimension_from_universal[2]
        for s in schemas
    )
    assert found_has_dimension_uni, f"Expected schema {expected_schema_has_dimension_from_universal} not found"

    expected_schema_has_dimension_from_particular = (
        NodeType.PARTICULAR,
        NodeType.DIMENSION,
        RelationshipType.HAS_DIMENSION
    )
    found_has_dimension_part = any(
        s.from_type == expected_schema_has_dimension_from_particular[0] and \
        s.to_type == expected_schema_has_dimension_from_particular[1] and \
        s.relationship_type == expected_schema_has_dimension_from_particular[2]
        for s in schemas
    )
    assert found_has_dimension_part, f"Expected schema {expected_schema_has_dimension_from_particular} not found"
    
    expected_schema_potentiality = (
        NodeType.STATE,
        NodeType.STATE,
        RelationshipType.POTENTIALITY
    )
    found_potentiality = any(
        s.from_type == expected_schema_potentiality[0] and \
        s.to_type == expected_schema_potentiality[1] and \
        s.relationship_type == expected_schema_potentiality[2]
        for s in schemas
    )
    assert found_potentiality, f"Expected schema {expected_schema_potentiality} not found"

    # Verify that all schemas have correct Enum types
    for schema in schemas:
        assert isinstance(schema.from_type, NodeType), f"Schema from_type is not NodeType: {schema}"
        assert isinstance(schema.to_type, NodeType), f"Schema to_type is not NodeType: {schema}"
        assert isinstance(schema.relationship_type, RelationshipType), f"Schema relationship_type is not RelationshipType: {schema}" 