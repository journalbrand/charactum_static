"""
Node Models Module

This module defines the core data models for nodes in the Ontorum graph.
The models are kept lean, with validation logic handled by the graph_grammar module.
"""

from typing import Dict, List, Optional, Set, Any
from uuid import UUID, uuid4
from pydantic import BaseModel, Field, field_validator, ConfigDict

# Import dynamic ontology and specific items needed
from .ontology_loader import get_ontology, DynamicEnumProxy
from .graph_grammar import GraphLinter

# Dynamic proxies for enums that update when the ontology changes
NodeType = DynamicEnumProxy("NodeType")
RelationshipType = DynamicEnumProxy("RelationshipType")

class Node(BaseModel):
    """Base class for all nodes in the graph. 
    Specific fields beyond common ones (id, type, name, description) would be 
    handled as generic properties if needed, validated against ontology_spec.json.
    """
    id: UUID = Field(default_factory=uuid4)
    type: str
    name: str
    description: str = ""  # Default to empty string
    expanded_aspects: Set[str] = Field(default_factory=set)

    @field_validator('type')
    @classmethod
    def type_must_be_in_ontology(cls, v: str) -> str:
        """Validate that the type string is a known node type in the ontology."""
        current_node_types = get_ontology().node_types
        if v not in current_node_types:
            raise ValueError(f"Unknown node type: '{v}'. Must be one of {list(current_node_types)}")
        return v

    def has_expanded(self, aspect: str) -> bool:
        """Check if a particular expansion aspect has been performed."""
        return aspect in self.expanded_aspects

    def mark_expanded(self, aspect: str) -> None:
        """Mark an expansion aspect as completed."""
        self.expanded_aspects.add(aspect)

class Relationship(BaseModel):
    """A relationship between nodes in the graph."""
    type: RelationshipType
    source: UUID
    target: UUID
    properties: Optional[dict] = None

    model_config = ConfigDict(arbitrary_types_allowed=True)

    def validate(self, source_node: Node, target_node: Node) -> tuple[bool, str]:
        """Validate this relationship against the graph grammar rules."""
        return GraphLinter.validate_relationship(
            from_type=source_node.type,
            to_type=target_node.type,
            rel_type=self.type,
            properties=self.properties
        )

class NodeContext(BaseModel):
    """Context about a node for LLM requests."""
    node_id: str
    node_type: str
    node_name: str
    node_description: Optional[str] = None

class LLMGenerateRequest(BaseModel):
    """Request model for LLM node generation."""
    instruction: str
    context: Optional[NodeContext] = None

    @field_validator('instruction')
    @classmethod
    def instruction_not_empty(cls, v: str) -> str:
        """Validate that instruction is not empty."""
        if not v.strip():
            raise ValueError("Empty instruction")
        return v.strip()

class LLMGenerateResponse(BaseModel):
    """Response model for LLM node generation."""
    candidates: List[Dict[str, Any]]
    message: str

class LLMValidateRequest(BaseModel):
    """Request model for LLM node validation."""
    candidates: List[Dict[str, Any]]

    @field_validator('candidates')
    @classmethod
    def validate_candidates(cls, v: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate that candidates have required fields."""
        current_node_types = get_ontology().node_types
        for candidate in v:
            if not all(key in candidate for key in ["name", "type", "description"]):
                raise ValueError("Invalid candidate format: missing required fields")
            if candidate["type"] not in current_node_types:
                 raise ValueError(f"Invalid candidate type: '{candidate['type']}'. Must be one of {list(current_node_types)}")
        return v

class LLMValidateResponse(BaseModel):
    """Response model for LLM node validation."""
    valid_candidates: List[Dict[str, Any]]
    invalid_candidates: List[Dict[str, Any]]
    message: str

# Export commonly used types
__all__ = [
    'Node',
    'Relationship',
    'NodeType',
    'RelationshipType',
    'NodeContext',
    'LLMGenerateRequest',
    'LLMGenerateResponse',
    'LLMValidateRequest',
    'LLMValidateResponse'
] 