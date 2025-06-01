"""
LLM Models

This module contains Pydantic models for LLM-related requests and responses.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, validator

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

    @validator('instruction')
    def instruction_not_empty(cls, v):
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

    @validator('candidates')
    def validate_candidates(cls, v):
        """Validate that candidates have required fields."""
        for candidate in v:
            if not all(key in candidate for key in ["name", "type", "description"]):
                raise ValueError("Invalid candidate format: missing required fields")
        return v

class LLMValidateResponse(BaseModel):
    """Response model for LLM node validation."""
    valid_candidates: List[Dict[str, Any]]
    invalid_candidates: List[Dict[str, Any]]
    message: str 