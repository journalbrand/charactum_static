"""
Test Database Module

This module tests the OntorumDB class, ensuring its methods for node and relationship
manipulation work correctly with the dynamically loaded ontology.
"""

import pytest
from uuid import uuid4

from backend.database import OntorumDB, QueryError, ConnectionError
# Import only Node from models, as subclasses are removed.
from backend.models import Node 
from backend.ontology_loader import get_ontology
ontology = get_ontology() # To access NodeType enum and node_metadata for verification

@pytest.fixture
def db():
    """Create and clean up database connection for each test."""
    try:
        db_instance = OntorumDB()
        db_instance.clear_database() # Clear before each test
        yield db_instance
    except ConnectionError as e:
        pytest.skip(f"Skipping database tests: Neo4j connection failed - {e}")
    finally:
        if 'db_instance' in locals() and db_instance._driver: 
            db_instance.close()

def test_db_connection(db):
    assert db._driver is not None
    with db.get_session() as session:
        result = session.run("RETURN 1")
        assert result.single()[0] == 1

def test_add_node_all_types(db):
    """Test adding one node of each type defined in the current ontology."""
    if not ontology.node_types:
        pytest.skip("No node types defined in current ontology, skipping test_add_node_all_types.")
        return
    for node_type_key in ontology.node_types:
        node_name = f"Test {ontology.node_metadata[node_type_key]['label']} Gamma"
        node_desc = f"A test {node_type_key} node for all types test"
        
        node_model_instance = Node(type=node_type_key, name=node_name, description=node_desc)
        assert node_model_instance.type == node_type_key 

        created_node = db.add_node(node_model_instance)
        assert created_node is not None
        assert created_node['name'] == node_name
        assert created_node['type'] == node_type_key
        assert created_node['description'] == node_desc
        node_id = created_node['id']

        with db.get_session() as session:
            result = session.run("MATCH (n) WHERE toString(id(n)) = $id RETURN labels(n) as lbls", id=node_id)
            db_labels = result.single()["lbls"]
            expected_label = ontology.node_metadata[node_type_key]['label']
            assert "Node" in db_labels
            assert expected_label in db_labels
            print(f"Successfully added and verified {node_type_key} node: {node_name} with labels {db_labels}")

def test_add_node_invalid_type_string(db):
    with pytest.raises(ValueError) as pydantic_exc_info:
        # This directly tests the Node model's validator
        invalid_node_model = Node(name="Invalid Type Node", type="nonexistent_type_for_reals", description="This type should not exist")
    assert "Unknown node type: 'nonexistent_type_for_reals'" in str(pydantic_exc_info.value)

    class MockNode:
        def __init__(self, name, type_str, description):
            self.name = name
            self.type = type_str 
            self.description = description
            self.id = uuid4()

    rogue_node = MockNode(name="Rogue Node", type_str="very_rogue_type", description="A type unknown to ontology.node_metadata")
    with pytest.raises(QueryError) as db_exc_info:
        db.add_node(rogue_node)
    assert db_exc_info.type is QueryError

def test_get_non_existent_node(db):
    non_existent_id = str(uuid4())
    retrieved_node = db.get_node(non_existent_id)
    assert retrieved_node is None

def test_get_nodes_by_type(db):
    # Use types from the currently loaded ontology
    if len(ontology.node_types) < 2:
        pytest.skip("Skipping test_get_nodes_by_type as less than 2 node types are defined in the current ontology.")
        return

    type1_key = ontology.node_types[0]
    type2_key = ontology.node_types[1]

    n1_t1 = db.add_node(Node(type=type1_key, name=f"Node1 {type1_key}"))
    n2_t1 = db.add_node(Node(type=type1_key, name=f"Node2 {type1_key}"))
    n1_t2 = db.add_node(Node(type=type2_key, name=f"Node1 {type2_key}"))

    type1_nodes = db.get_nodes_by_type(getattr(ontology.NodeType, type1_key.upper()))
    assert len(type1_nodes) == 2
    type1_names = {n['name'] for n in type1_nodes}
    assert n1_t1['name'] in type1_names
    assert n2_t1['name'] in type1_names
    for node in type1_nodes:
        assert node['type'] == type1_key

    type2_nodes = db.get_nodes_by_type(getattr(ontology.NodeType, type2_key.upper()))
    assert len(type2_nodes) == 1
    assert type2_nodes[0]['name'] == n1_t2['name']
    assert type2_nodes[0]['type'] == type2_key

    if len(ontology.node_types) > 2:
        type3_key = ontology.node_types[2]
        type3_nodes = db.get_nodes_by_type(getattr(ontology.NodeType, type3_key.upper()))
        assert len(type3_nodes) == 0

def test_create_and_get_relationship(db):
    if len(ontology.node_types) < 2 or len(ontology.relationship_rules) == 0:
        pytest.skip("Skipping relationship test: Insufficient node types or no relationship rules defined.")
        return

    test_rel_rule = ontology.relationship_rules[0]
    rel_type_str = test_rel_rule["name"]
    from_type_str = test_rel_rule["from"][0]
    to_type_str = test_rel_rule["to"][0]

    source_node_data = db.add_node(Node(type=from_type_str, name=f"Source for {rel_type_str}"))
    target_node_data = db.add_node(Node(type=to_type_str, name=f"Target for {rel_type_str}"))

    rel_data = {
        'type': rel_type_str,
        'source': source_node_data['id'],
        'target': target_node_data['id']
    }
    created_rel = db.create_relationship(rel_data)
    assert created_rel is not None
    assert created_rel['type'] == rel_type_str
    assert created_rel['source'] == source_node_data['id']
    assert created_rel['target'] == target_node_data['id']
    rel_id = created_rel['id']

    source_node_rels = db.get_node_relationships(source_node_data['id'])
    assert len(source_node_rels) == 1
    db_rel = source_node_rels[0]
    assert db_rel['id'] == rel_id
    assert db_rel['type'] == rel_type_str
    assert source_node_data['id'] in [db_rel['source'], db_rel['target']]
    assert target_node_data['id'] in [db_rel['source'], db_rel['target']]
    
    with db.get_session() as session:
        res = session.run(
            "MATCH (a)-[r]->(b) WHERE toString(id(r)) = $rel_id RETURN toString(id(a)) as src, toString(id(b)) as tgt", 
            rel_id=rel_id
        )
        record = res.single()
        assert record["src"] == source_node_data['id']
        assert record["tgt"] == target_node_data['id']

def test_set_particular_state(db):
    node_keys = set(ontology.node_types)
    if not {"particular", "dimension", "state"}.issubset(node_keys) or \
       not any(r["name"] == "ADMITS_VALUE" for r in ontology.relationship_rules) or \
       not any(r["name"] == "VALUE_ADMITTED" for r in ontology.relationship_rules):
        pytest.skip("Skipping test_set_particular_state: Current ontology does not support it.")
        return

    car_model = Node(type="particular", name="My Car", description="A vehicle")
    color_dim_model = Node(type="dimension", name="Color", description="The color dimension")
    red_state_model = Node(type="state", name="Red", description="The color red")
    blue_state_model = Node(type="state", name="Blue", description="The color blue")

    car_db_data = db.add_node(car_model)
    color_dim_db_data = db.add_node(color_dim_model)
    red_state_db_data = db.add_node(red_state_model)
    blue_state_db_data = db.add_node(blue_state_model)

    db.create_relationship({
        'type': ontology.RelationshipType.ADMITS_VALUE.value,
        'source': color_dim_db_data['id'], 
        'target': red_state_db_data['id']
    })
    db.create_relationship({
        'type': ontology.RelationshipType.ADMITS_VALUE.value,
        'source': color_dim_db_data['id'],
        'target': blue_state_db_data['id']
    })

    db.set_particular_state(car_model.id, color_dim_model.id, red_state_model.id)

    with db.get_session() as session:
        result = session.run(
            f"MATCH (p)-[r:`{ontology.RelationshipType.VALUE_ADMITTED.value}`]->(s) "
            "WHERE toString(id(p)) = $pid AND toString(id(s)) = $sid RETURN count(r) as count",
            pid=car_db_data['id'], sid=red_state_db_data['id']
        )
        assert result.single()["count"] == 1, "Initial state (Red) not set"

    db.set_particular_state(car_model.id, color_dim_model.id, blue_state_model.id)

    with db.get_session() as session:
        result = session.run(
            f"MATCH (p)-[r:`{ontology.RelationshipType.VALUE_ADMITTED.value}`]->(s) "
            "WHERE toString(id(p)) = $pid AND toString(id(s)) = $sid RETURN count(r) as count",
            pid=car_db_data['id'], sid=red_state_db_data['id']
        )
        assert result.single()["count"] == 0, "Old state (Red) not removed"

    with db.get_session() as session:
        result = session.run(
            f"MATCH (p)-[r:`{ontology.RelationshipType.VALUE_ADMITTED.value}`]->(s) "
            "WHERE toString(id(p)) = $pid AND toString(id(s)) = $sid RETURN count(r) as count",
            pid=car_db_data['id'], sid=blue_state_db_data['id']
        )
        assert result.single()["count"] == 1, "New state (Blue) not set"

def test_delete_relationship(db):
    if len(ontology.node_types) == 0 or len(ontology.relationship_rules) == 0:
        pytest.skip("Skipping delete_relationship test: No node types or relationship rules defined.")
        return

    source_type_for_rel = None
    target_type_for_rel = None
    rel_type_str = None

    for rule in ontology.relationship_rules:
        if rule.get("from") and rule.get("to"):
            possible_from_types = [nt for nt in rule["from"] if nt in ontology.node_types]
            possible_to_types = [nt for nt in rule["to"] if nt in ontology.node_types]
            
            if possible_from_types and possible_to_types:
                source_type_for_rel = possible_from_types[0]
                target_type_for_rel = possible_to_types[0]
                rel_type_str = rule["name"]
                break 
    
    if not (source_type_for_rel and target_type_for_rel and rel_type_str):
        pytest.skip("Skipping delete_relationship test: Could not find a constructible relationship in the current ontology.")
        return
    
    node1 = db.add_node(Node(type=source_type_for_rel, name="Node A DelRel"))
    node2 = db.add_node(Node(type=target_type_for_rel, name="Node B DelRel"))
    rel_data = {'type': rel_type_str, 'source': node1['id'], 'target': node2['id']}
    
    created_rel = db.create_relationship(rel_data)
    rel_id = created_rel['id']

    success = db.delete_relationship(rel_id)
    assert success is True
    rels = db.get_node_relationships(node1['id'])
    assert len(rels) == 0
    success_non_existent = db.delete_relationship(str(uuid4()))
    assert success_non_existent is False

def test_delete_node(db):
    if len(ontology.node_types) < 2 or len(ontology.relationship_rules) == 0:
        pytest.skip("Skipping delete_node test: Insufficient node types or no relationship rules.")
        return

    source_type_for_rel = None
    target_type_for_rel = None
    rel_type_for_test = None
    for rule in ontology.relationship_rules:
        if rule["from"] and rule["to"]:
            source_type_for_rel = rule["from"][0]
            target_type_for_rel = rule["to"][0]
            rel_type_for_test = rule["name"]
            break
    if not (source_type_for_rel and target_type_for_rel and rel_type_for_test):
        pytest.skip("Skipping delete_node test: Could not find a suitable relationship rule in current ontology.")
        return

    node1 = db.add_node(Node(type=source_type_for_rel, name="Source Node Del"))
    node2 = db.add_node(Node(type=target_type_for_rel, name="Target Node Del"))
    rel_data = {
        'type': rel_type_for_test, 
        'source': node1['id'], 
        'target': node2['id']
    }
    db.create_relationship(rel_data)
    assert len(db.get_node_relationships(node1['id'])) == 1

    success = db.delete_node(node1['id'])
    assert success is True
    assert db.get_node(node1['id']) is None
    assert len(db.get_node_relationships(node2['id'])) == 0 
    success_non_existent = db.delete_node(str(uuid4()))
    assert success_non_existent is False

def test_alternate_create_node_method(db):
    if not ontology.node_types:
        pytest.skip("Skipping alternate_create_node test: No node types defined in ontology.")
        return
    node_type_key = ontology.node_types[0]
    
    node_model_instance = Node(type=node_type_key, name=f"Test {ontology.node_metadata[node_type_key]['label']} Zeta", description="Via create_node")
    
    created_node_data = db.create_node(node_model_instance) 
    assert created_node_data is not None
    assert created_node_data['name'] == f"Test {ontology.node_metadata[node_type_key]['label']} Zeta"
    assert created_node_data['type'] == node_type_key
    node_id = created_node_data['id']

    retrieved_node_data = db.get_node(node_id)
    assert retrieved_node_data['name'] == f"Test {ontology.node_metadata[node_type_key]['label']} Zeta"

    with db.get_session() as session:
        result = session.run("MATCH (n) WHERE toString(id(n)) = $id RETURN labels(n) as node_labels", id=node_id)
        record = result.single()
        assert record is not None
        labels_in_db = record["node_labels"]
        expected_specific_label = ontology.node_metadata[node_type_key]['label']
        assert "Node" in labels_in_db
        assert expected_specific_label in labels_in_db

def test_export_and_import(db, tmp_path):
    if len(ontology.node_types) < 2 or not ontology.relationship_rules:
        pytest.skip("Skipping export/import test: insufficient ontology data")

    from_type = ontology.node_types[0]
    to_type = ontology.node_types[1]
    rel_type = None
    for rule in ontology.relationship_rules:
        if from_type in rule.get("from", []) and to_type in rule.get("to", []):
            rel_type = rule["name"]
            break
    if rel_type is None:
        pytest.skip("No suitable relationship rule for export/import test")

    node1 = db.add_node(Node(type=from_type, name="ExportNode1"))
    node2 = db.add_node(Node(type=to_type, name="ExportNode2"))
    db.create_relationship({"type": rel_type, "source": node1["id"], "target": node2["id"]})

    export_file = tmp_path / "export.json"
    db.export_to_disk(export_file)

    db.clear_database()
    assert db.get_node(node1["id"]) is None

    db.load_from_disk(export_file)

    restored1 = db.get_nodes_by_type(getattr(ontology.NodeType, from_type.upper()))
    restored2 = db.get_nodes_by_type(getattr(ontology.NodeType, to_type.upper()))
    assert len(restored1) == 1
    assert len(restored2) == 1
    assert restored1[0]["name"] == "ExportNode1"
    assert restored2[0]["name"] == "ExportNode2"
    rels = db.get_node_relationships(restored1[0]["id"])
    assert len(rels) == 1
    assert rels[0]["type"] == rel_type
