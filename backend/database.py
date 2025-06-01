"""Neo4j database connection and operations for Ontorum."""
from typing import Dict, List, Optional
import json
import os
from uuid import UUID
import logging
from contextlib import contextmanager

from neo4j import GraphDatabase, exceptions
from dotenv import load_dotenv

from .ontology_loader import get_ontology
from .models import NodeType, Node

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Explicitly load .env from the project root and override existing vars
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env') # Path to .env in project root (2 levels up)
print(f"DEBUG: Calculated .env path: {dotenv_path}") # Debug path
loaded_dotenv = load_dotenv(dotenv_path=dotenv_path, override=True)
print(f"DEBUG: load_dotenv successful? {loaded_dotenv}") # Debug load success

class DatabaseError(Exception):
    """Base class for database exceptions."""
    pass

class ConnectionError(DatabaseError):
    """Raised when there's an issue connecting to the database."""
    pass

class QueryError(DatabaseError):
    """Raised when there's an issue executing a query."""
    pass

class OntorumDB:
    """Database connection and operations for Ontorum."""
    
    def __init__(self):
        """Initialize database connection."""
        try:
            # Check for an override URI first, then the specific env var, then default
            uri = os.getenv("NEO4J_URI_OVERRIDE", os.getenv("NEO4J_URI", "bolt://192.168.29.231:7687"))
            user = os.getenv("NEO4J_USER", "neo4j")
            password = os.getenv("NEO4J_PASSWORD", "ontorum123")
            print(f"DEBUG: Connecting to Neo4j with URI: {uri}, User: {user}, Password: {'*' * len(password) if password else 'None'}")
            self._driver = GraphDatabase.driver(uri, auth=(user, password))
            logger.info("Successfully connected to Neo4j database")
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {str(e)}")
            raise ConnectionError(f"Failed to connect to Neo4j: {str(e)}")
    
    def close(self):
        """Close the database connection."""
        self._driver.close()
    
    @contextmanager
    def get_session(self):
        """Get a database session."""
        session = self._driver.session()
        try:
            yield session
        finally:
            session.close()
    
    def clear_database(self):
        """Clear all nodes and relationships from the database."""
        with self.get_session() as session:
            session.run("MATCH (n) DETACH DELETE n")
    
    def add_node(self, node):
        """Add a node to the graph using its metadata definition."""
        try:
            with self.get_session() as session:
                node_dict = {
                    'id': str(node.id),
                    'name': node.name,
                    'type': node.type,
                    'description': node.description or ''
                }
                
                current_ontology = get_ontology()
                # Get node Neo4j label from dynamic ontology
                node_label = current_ontology.node_metadata[node.type]['label']
                
                result = session.execute_write(self._create_node, node_dict, node_label)
                logger.info(f"Successfully created node of type {node.type} with label {node_label}")
                return result
        except KeyError as e:
            logger.error(f"Error adding node: Node type '{node.type}' not found in ontology metadata. {str(e)}")
            raise QueryError(f"Failed to add node: Node type '{node.type}' not found in ontology. {str(e)}")
        except Exception as e:
            logger.error(f"Error adding node: {str(e)}")
            raise QueryError(f"Failed to add node: {str(e)}")

    @staticmethod
    def _create_node(tx, node_dict: Dict, node_label: str):
        """Create a node using its Neo4j label."""
        logger.info(f"DB _create_node: Received node_dict: {json.dumps(node_dict, indent=2)}, node_label: {node_label}")
        properties = {
            'id': node_dict['id'],
            'name': node_dict['name'],
            'type': node_dict['type'].lower(),
            'description': node_dict['description']
        }
        logger.info(f"DB _create_node: Cypher properties: {json.dumps(properties, indent=2)}")
        
        query = f"""
        CREATE (n:Node:`{node_label}`)
        SET n = $properties
        WITH n
        RETURN {{
            id: toString(id(n)),
            name: n.name,
            type: n.type,
            description: n.description,
            elementId: toString(id(n))
        }} as node
        """
        
        result = tx.run(query, properties=properties)
        record = result.single()
        if not record:
            logger.error("DB _create_node: Failed to create node, no record returned from Cypher.")
            raise QueryError("Failed to create node: No record returned")
            
        logger.info(f"DB _create_node: Cypher result record: {json.dumps(record['node'], indent=2)}")
        return record["node"]

    def get_node(self, node_id: UUID) -> Optional[dict]:
        """Get a node by its ID."""
        logger.info(f"DB get_node: Requesting node_id: {node_id}")
        with self.get_session() as session:
            result = session.execute_read(
                self._get_node, str(node_id)
            )
            logger.info(f"DB get_node: Result for node_id {node_id}: {json.dumps(result, indent=2) if result else 'Not found'}")
            return result

    def get_nodes_by_type(self, node_type_enum: NodeType) -> List[dict]:
        """Get all nodes of a specific type (string value, e.g., "particular")."""
        node_type_str = node_type_enum.value
        with self.get_session() as session:
            return session.execute_read(
                self._get_nodes_by_type, node_type_str
            )

    @staticmethod
    def _get_node(tx, node_id):
        """Get a node by Neo4j ID."""
        try:
            logger.info(f"DB _get_node: Transaction for node_id: {node_id}")
            query = """
            MATCH (n:Node)
            WHERE toString(id(n)) = $node_id
            WITH n
            RETURN {
                id: toString(id(n)),
                name: n.name,
                type: n.type,
                description: n.description,
                elementId: toString(id(n))
            } as node
            """
            result = tx.run(query, node_id=str(node_id))
            record = result.single()
            if record:
                logger.info(f"DB _get_node: Found record for node_id {node_id}: {json.dumps(record['node'], indent=2)}")
                return record["node"]
            else:
                logger.warning(f"DB _get_node: No record found for node_id {node_id}")
                return None
        except Exception as e:
            logger.debug(f"No node found for ID {node_id}: {str(e)}")
            return None

    @staticmethod
    def _get_nodes_by_type(tx, node_type_str: str):
        """Get nodes by type (string value), handling empty database cases gracefully."""
        try:
            query = """
            MATCH (n:Node)
            WHERE n.type = $node_type_str
            WITH n
            RETURN {
                id: toString(id(n)),
                name: n.name,
                type: n.type,
                description: n.description,
                elementId: toString(id(n))
            } as node
            """
            result = tx.run(query, node_type_str=node_type_str.lower())
            return [record["node"] for record in result]
        except Exception as e:
            logger.debug(f"No nodes found for type '{node_type_str}': {str(e)}")
            return []

    def get_node_relationships(self, node_id: str) -> List[dict]:
        """Get all relationships for a node."""
        with self.get_session() as session:
            return session.execute_read(
                self._get_relationships_for_node, node_id
            )

    def _get_relationships_for_node(self, tx, node_id: str) -> List[Dict]:
        """Get all relationships for a node."""
        query = """
        MATCH (n)-[r]-(m)
        WHERE toString(id(n)) = $node_id
        RETURN {
            id: toString(id(r)),
            type: type(r),
            source: CASE WHEN startNode(r) = n
                THEN toString(id(n))
                ELSE toString(id(m))
            END,
            target: CASE WHEN endNode(r) = n
                THEN toString(id(n))
                ELSE toString(id(m))
            END,
            properties: properties(r)
        } as relationship
        """
        result = tx.run(query, node_id=node_id)
        return [dict(record["relationship"]) for record in result]

    def create_relationship(self, relationship: Dict) -> Dict:
        """Create a new relationship between nodes."""
        with self.get_session() as session:
            return session.execute_write(
                self._create_relationship,
                relationship['source'],
                relationship['target'],
                relationship['type']
            )

    @staticmethod
    def _create_relationship(tx, source: str, target: str, rel_type: str) -> Dict:
        """Create a relationship in the database."""
        logger.info(f"DB _create_relationship: Attempting to create '{rel_type}' from source ID '{source}' to target ID '{target}'")
        query = f"""
        MATCH (a), (b)
        WHERE toString(id(a)) = $source AND toString(id(b)) = $target
        CREATE (a)-[r:`{rel_type}`]->(b)
        RETURN {{
            id: toString(id(r)),
            type: type(r),
            source: toString(id(a)),
            target: toString(id(b)),
            properties: properties(r)
        }} as relationship
        """
        result = tx.run(query, source=source, target=target, rel_type=rel_type)
        record = result.single()
        if not record or not record["relationship"]:
            logger.error(f"DB _create_relationship: Failed to create relationship '{rel_type}' from '{source}' to '{target}'. No record returned or relationship part missing.")
            raise QueryError(f"Failed to create relationship {rel_type} between {source} and {target}: No result from DB")
        logger.info(f"DB _create_relationship: Successfully created relationship: {json.dumps(record['relationship'], indent=2)}")
        return dict(record["relationship"])

    def set_particular_state(self, particular_id: UUID, dimension_id: UUID, state_id: UUID):
        """Set the state of a particular for a dimension."""
        with self.get_session() as session:
            session.execute_write(
                self._set_state,
                str(particular_id),
                str(dimension_id),
                str(state_id)
            )

    @staticmethod
    def _set_state(tx, particular_id_str, dimension_id_str, state_id_str):
        current_ontology = get_ontology()
        # Get Neo4j labels from ontology
        particular_label = current_ontology.node_metadata[current_ontology.NodeType.PARTICULAR.value]['label']
        state_label = current_ontology.node_metadata[current_ontology.NodeType.STATE.value]['label']
        dimension_label = current_ontology.node_metadata[current_ontology.NodeType.DIMENSION.value]['label']
        value_admitted_rel_type = current_ontology.RelationshipType.VALUE_ADMITTED.value
        admits_value_rel_type = current_ontology.RelationshipType.ADMITS_VALUE.value

        query1 = f"""
        MATCH (p:`{particular_label}` {{id: $particular_id}})-[r:`{value_admitted_rel_type}`]->(s:`{state_label}`)
        WHERE EXISTS((s)<-[:`{admits_value_rel_type}`]-(:`{dimension_label}` {{id: $dimension_id}}))
        DELETE r
        """
        tx.run(query1, particular_id=particular_id_str, dimension_id=dimension_id_str)

        query2 = f"""
        MATCH (p:`{particular_label}` {{id: $particular_id}}), (s:`{state_label}` {{id: $state_id}})
        CREATE (p)-[r:`{value_admitted_rel_type}`]->(s)
        RETURN r
        """
        tx.run(query2, particular_id=particular_id_str, state_id=state_id_str)

    def create_node(self, node):
        """Create a node in the database."""
        try:
            with self.get_session() as session:
                node_dict = {
                    'id': str(node.id),
                    'name': node.name,
                    'type': node.type,
                    'description': node.description
                }
                
                current_ontology = get_ontology()
                # Get node Neo4j label from dynamic ontology
                node_label = current_ontology.node_metadata[node.type]['label']
                
                result = session.execute_write(self._create_node, node_dict, node_label)
                logger.info(f"Successfully created node of type {node.type} with label {node_label}")
                return result
        except KeyError as e:
            logger.error(f"Error creating node: Node type '{node.type}' not found in ontology metadata. {str(e)}")
            raise QueryError(f"Failed to create node: Node type '{node.type}' not found in ontology. {str(e)}")
        except Exception as e:
            logger.error(f"Error creating node: {str(e)}")
            raise QueryError(f"Failed to create node: {str(e)}")

    def delete_node(self, node_id: str) -> bool:
        """Delete a node and all its relationships."""
        try:
            with self.get_session() as session:
                return session.execute_write(self._delete_node, node_id)
        except Exception as e:
            logger.error(f"Error deleting node: {str(e)}")
            raise QueryError(f"Failed to delete node: {str(e)}")

    def delete_relationship(self, relationship_id: str) -> bool:
        """Delete a specific relationship."""
        try:
            with self.get_session() as session:
                return session.execute_write(self._delete_relationship, relationship_id)
        except Exception as e:
            logger.error(f"Error deleting relationship: {str(e)}")
            raise QueryError(f"Failed to delete relationship: {str(e)}")

    def update_node(self, node_id: str, name: str, description: str) -> Dict:
        """Update a node's name and description."""
        try:
            with self.get_session() as session:
                return session.execute_write(
                    self._update_node, node_id, name, description
                )
        except Exception as e:
            logger.error(f"Error updating node: {str(e)}")
            raise QueryError(f"Failed to update node: {str(e)}")

    @staticmethod
    def _delete_node(tx, node_id: str) -> bool:
        """Execute node deletion in transaction."""
        query = """MATCH (n:Node) WHERE toString(id(n)) = $node_id DETACH DELETE n RETURN count(n) as deleted_count"""
        result = tx.run(query, node_id=node_id)
        record = result.single()
        return record and record["deleted_count"] > 0

    @staticmethod
    def _delete_relationship(tx, relationship_id: str) -> bool:
        """Execute relationship deletion in transaction."""
        query = """MATCH ()-[r]-() WHERE toString(id(r)) = $relationship_id DELETE r RETURN count(r) as deleted_count"""
        result = tx.run(query, relationship_id=relationship_id)
        record = result.single()
        return record and record["deleted_count"] > 0

    @staticmethod
    def _update_node(tx, node_id: str, name: str, description: str) -> Dict:
        """Execute node update in transaction."""
        query = """
        MATCH (n:Node)
        WHERE toString(id(n)) = $node_id
        SET n.name = $name, n.description = $description
        WITH n
        RETURN {
            id: toString(id(n)),
            name: n.name,
            type: n.type,
            description: n.description,
            elementId: toString(id(n))
        } as node
        """
        result = tx.run(query, node_id=node_id, name=name, description=description)
        record = result.single()
        if not record:
            raise QueryError("Failed to update node: No record returned")
        return dict(record["node"])

    def export_to_disk(self, file_path: str) -> None:
        """Export all nodes and relationships to a JSON file."""
        try:
            with self.get_session() as session:
                node_query = """
                MATCH (n:Node)
                RETURN {
                    id: toString(id(n)),
                    name: n.name,
                    type: n.type,
                    description: n.description
                } as node
                """
                nodes = [record["node"] for record in session.run(node_query)]

                rel_query = """
                MATCH (a)-[r]->(b)
                RETURN {
                    id: toString(id(r)),
                    type: type(r),
                    source: toString(id(a)),
                    target: toString(id(b)),
                    properties: properties(r)
                } as relationship
                """
                relationships = [record["relationship"] for record in session.run(rel_query)]

            with open(file_path, "w") as f:
                json.dump({"nodes": nodes, "relationships": relationships}, f, indent=2)
        except Exception as e:
            raise QueryError(f"Failed to export database: {e}")

    def export_to_dict(self) -> Dict[str, List[Dict]]:
        """Export all nodes and relationships to a dictionary."""
        try:
            with self.get_session() as session:
                node_query = """
                MATCH (n:Node)
                RETURN {
                    id: toString(id(n)),
                    name: n.name,
                    type: n.type,
                    description: n.description
                } as node
                """
                nodes = [record["node"] for record in session.run(node_query)]

                rel_query = """
                MATCH (a)-[r]->(b)
                RETURN {
                    id: toString(id(r)),
                    type: type(r),
                    source: toString(id(a)),
                    target: toString(id(b)),
                    properties: properties(r)
                } as relationship
                """
                relationships = [record["relationship"] for record in session.run(rel_query)]

            return {"nodes": nodes, "relationships": relationships}
        except Exception as e:
            raise QueryError(f"Failed to export database: {e}")

    def load_from_disk(self, file_path: str, clear: bool = False) -> None:
        """Load nodes and relationships from a JSON file."""
        try:
            with open(file_path, "r") as f:
                data = json.load(f)

            if clear:
                self.clear_database()

            id_map = {}
            for node_data in data.get("nodes", []):
                node_model = Node(
                    type=node_data["type"],
                    name=node_data["name"],
                    description=node_data.get("description", "")
                )
                created = self.add_node(node_model)
                id_map[node_data["id"]] = created["id"]

            for rel_data in data.get("relationships", []):
                source = id_map.get(rel_data["source"])
                target = id_map.get(rel_data["target"])
                if source and target:
                    self.create_relationship({
                        "type": rel_data["type"],
                        "source": source,
                        "target": target
                    })
        except Exception as e:
            raise QueryError(f"Failed to load database from disk: {e}")

    def load_from_dict(self, data: Dict[str, List[Dict]], clear: bool = False) -> None:
        """Load nodes and relationships from a dictionary."""
        try:
            if clear:
                self.clear_database()

            id_map = {}
            for node_data in data.get("nodes", []):
                node_model = Node(
                    type=node_data["type"],
                    name=node_data["name"],
                    description=node_data.get("description", "")
                )
                created = self.add_node(node_model)
                id_map[node_data["id"]] = created["id"]

            for rel_data in data.get("relationships", []):
                source = id_map.get(rel_data["source"])
                target = id_map.get(rel_data["target"])
                if source and target:
                    self.create_relationship({
                        "type": rel_data["type"],
                        "source": source,
                        "target": target
                    })
        except Exception as e:
            raise QueryError(f"Failed to load database: {e}")
