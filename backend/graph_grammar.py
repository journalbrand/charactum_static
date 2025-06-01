"""
Graph Grammar Module

This module defines the rules, constraints, and valid relationships for the Ontorum graph.
It separates the graph grammar from node models and runtime logic.

The grammar focuses on defining valid relationship patterns without imposing cardinality
constraints, allowing for flexible and dynamic graph growth while maintaining structural
integrity through validation rules.
"""

from typing import Dict, List, Union, Tuple, Optional
from dataclasses import dataclass

from .ontology_loader import get_ontology, DynamicEnumProxy

# Dynamic proxies to always reflect the active ontology
NodeType = DynamicEnumProxy("NodeType")
RelationshipType = DynamicEnumProxy("RelationshipType")

@dataclass
class AllowedRelationshipSchema:
    """
    Schema definition for a single allowed relationship combination.
    Used by the frontend to determine what relationships can be created between node types.
    """
    from_type: NodeType
    to_type: NodeType
    relationship_type: RelationshipType

class GraphLinter:
    """
    A linter class that validates relationships against the defined grammar rules.
    The linter ensures structural validity without imposing cardinality constraints,
    allowing for flexible and dynamic graph growth.
    """
    
    @staticmethod
    def _get_rules_map(): # Helper method to get current rules map
        return {rule['name']: rule for rule in get_ontology().relationship_rules}

    @staticmethod
    def validate_relationship(
        from_type: str,
        to_type: str,
        rel_type: RelationshipType,
        properties: Optional[Dict] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Validates if a relationship is allowed according to grammar rules.
        
        Args:
            from_type: The type of the source node (string value)
            to_type: The type of the target node (string value)
            rel_type: The type of relationship (Enum member)
            properties: Optional properties of the relationship
            
        Returns:
            Tuple of (is_valid: bool, error_message: Optional[str])
        """
        rules_map = GraphLinter._get_rules_map() # Changed: Use helper
        rule = rules_map.get(rel_type.value)
        if not rule:
            return False, f"Invalid relationship type: {rel_type.value}" # Use rel_type.value for the message
            
        # Check if source node type is valid
        # rule["from"] is a list of strings like ["particular"] or ["universal", "particular"]
        valid_from_types = rule["from"] 
        if from_type not in valid_from_types:
            return False, f"Invalid source node type '{from_type}' for relationship '{rel_type.value}'"
            
        # Check if target node type is valid
        # rule["to"] is a list of strings like ["universal"]
        valid_to_types = rule["to"]
        if to_type not in valid_to_types:
            return False, f"Invalid target node type '{to_type}' for relationship '{rel_type.value}'"
            
        # Check required properties
        # rule.get("properties") might not exist or be None
        required_props = rule.get("properties")
        if required_props: # Only check if "properties" key exists and has a list
            if not properties:
                return False, f"Missing required properties for {rel_type.value}"
            for prop in required_props:
                if prop not in properties:
                    return False, f"Missing required property '{prop}' for {rel_type.value}"
                    
        return True, None

    @staticmethod
    def validate_node_relationships(
        node_type: str,
        relationships: List[Dict]
    ) -> Tuple[bool, Optional[str]]:
        """
        Validates if a node has all required relationships according to grammar rules.
        Note that this only checks for required relationships (e.g., dimensions must
        admit at least one state) and does not impose cardinality constraints.
        
        Args:
            node_type: The type of node to validate (string value)
            relationships: List of the node's relationships (relationship types are strings)
            
        Returns:
            Tuple of (is_valid: bool, error_message: Optional[str])
        """
        current_rules = get_ontology().relationship_rules # Changed
        for rule in current_rules:
            # Check for required relationships
            if not rule.get("required", False):
                continue
                
            # If this node type is in the "from" field and relationship is required
            # rule["from"] is a list of strings
            if node_type in rule["from"]:
                # Check if the required relationship exists
                # rule["name"] is the string like "ADMITS_VALUE"
                # r["type"] in the relationships list is also a string
                has_required = any(r["type"] == rule["name"] for r in relationships)
                if not has_required:
                    return False, f"Missing required relationship '{rule['name']}' for node type '{node_type}'"
                    
        return True, None

    @staticmethod
    def get_allowed_relationship_schemas() -> List[AllowedRelationshipSchema]:
        """
        Get all allowed relationship combinations from the grammar.
        Used by the frontend to populate relationship type dropdowns and validate inputs.
        """
        allowed_schemas = []
        current_rules = get_ontology().relationship_rules # Changed
        for rule in current_rules:
            # rule["from"] is a list of strings
            # rule["to"] is a list of strings
            # rule["name"] is a string like "GENERALIZES"
            
            # Create schema for each valid combination
            for from_type_str in rule["from"]:
                for to_type_str in rule["to"]:
                    allowed_schemas.append(
                        AllowedRelationshipSchema(
                            from_type=NodeType(from_type_str), # Convert string to NodeType Enum member
                            to_type=NodeType(to_type_str),     # Convert string to NodeType Enum member
                            relationship_type=RelationshipType(rule["name"]) # Convert string to RelationshipType Enum member
                        )
                    )
        
        return allowed_schemas

# Export commonly used types and constants
__all__ = [
    'NodeType',              # Export the dynamically loaded NodeType
    'RelationshipType',      # Export the dynamically loaded RelationshipType
    'AllowedRelationshipSchema',
    'GraphLinter'
] 