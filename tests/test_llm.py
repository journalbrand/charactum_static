"""
Test LLM Service Module

This module tests the LLM service's function calling capabilities with OpenAI.
Tests verify proper tool definition, function call handling, and response processing.
"""

import pytest
import json
import os
import socket
from typing import Dict, Any
from backend.llm import LLMService, OPENAI_CHAT_MODEL
from unittest.mock import patch, AsyncMock
from backend.graph_grammar import RelationshipType, NodeType

# Skip these tests when no API key is configured or network connectivity is
# unavailable. This avoids failures in CI environments without access to the
# OpenAI API.
def _has_network(host: str = "api.openai.com", port: int = 443, timeout: int = 3) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False

pytestmark = pytest.mark.skipif(
    not os.getenv("OPENAI_API_KEY") or not _has_network(),
    reason="requires OpenAI API access and network connectivity",
)

@pytest.fixture
def llm_service():
    """Create a LLM service instance for testing."""
    return LLMService()

@pytest.mark.asyncio
async def test_function_call_structure(llm_service):
    """Test that function calls are properly structured for OpenAI."""
    instruction = {
        "relationship_type": RelationshipType.GENERALIZES.value,
        "source_type": "universal",
        "target_type": "universal", # Expecting universal nodes to be generated
        "is_source": True # Context node is source (Mammal), generating targets (more specific mammals)
    }
    context = {
        "node_type": "universal", 
        "node_name": "Mammal",
        "node_description": "A class of vertebrate animals"
    }
    
    candidates = await llm_service.generate_candidates(instruction, context)
    
    if candidates: # Only assert if candidates are returned
        for candidate in candidates:
            assert set(candidate.keys()) == {"name", "type", "description"}
            assert isinstance(candidate["name"], str)
            assert isinstance(candidate["description"], str)
            # Candidate type should be the target_type from instruction
            assert candidate["type"] == instruction["target_type"]

@pytest.mark.asyncio
async def test_relationship_based_function_calls(llm_service):
    """Test function calls with different relationship types and dynamic candidate types."""
    test_cases = [
        {
            "instruction": {
                "relationship_type": RelationshipType.HAS_DIMENSION.value,
                "source_type": "universal",
                "target_type": "dimension", # Expecting dimension nodes
                "is_source": True # Context is source (Physical Object), generating targets (dimensions)
            },
            "context": {
                "node_type": "universal",
                "node_name": "Physical Object",
                "node_description": "A tangible item in space"
            },
            "expected_candidate_type": "dimension"
        },
        {
            "instruction": {
                "relationship_type": RelationshipType.ADMITS_VALUE.value,
                "source_type": "dimension",
                "target_type": "state", # Expecting state nodes
                "is_source": True # Context is source (Color), generating targets (states like red, blue)
            },
            "context": {
                "node_type": "dimension",
                "node_name": "Color",
                "node_description": "Visual property of objects"
            },
            "expected_candidate_type": "state"
        },
        {
            "instruction": {
                "relationship_type": RelationshipType.INSTANCE_OF.value, 
                "source_type": "particular", # Expecting particular nodes
                "target_type": "universal",
                "is_source": False # Context is target (Car), generating sources (instances of Car)
            },
            "context": {
                "node_type": "universal",
                "node_name": "Car",
                "node_description": "A wheeled motor vehicle."
            },
            "expected_candidate_type": "particular"
        }
    ]
    
    for test_case in test_cases:
        candidates = await llm_service.generate_candidates(
            test_case["instruction"],
            test_case["context"]
        )
        
        assert len(candidates) > 0, f"No candidates for instruction: {test_case['instruction']}"
        for candidate in candidates:
            assert set(candidate.keys()) == {"name", "type", "description"}
            assert len(candidate["name"].strip()) > 0
            assert len(candidate["description"].strip()) > 0
            assert candidate["type"] == test_case["expected_candidate_type"]

@pytest.mark.asyncio
async def test_function_call_error_handling(llm_service):
    """Test error handling for function calls."""
    invalid_cases = [
        {
            "instruction": {
                "relationship_type": RelationshipType.GENERALIZES.value,
                # "source_type": "universal", # Missing source_type intentionally
                "target_type": "universal",
                "is_source": True
            },
            "expected_error": "Missing required field in instruction: 'source_type'"
        },
        {
            "instruction": {
                "relationship_type": "INVALID_REL_TYPE_STRING",
                "source_type": "universal", 
                "target_type": "universal",
                "is_source": True
            },
            "expected_error": "Invalid relationship type string: INVALID_REL_TYPE_STRING"
        }
    ]
    
    for test_case in invalid_cases:
        with pytest.raises(ValueError) as exc_info:
            await llm_service.generate_candidates(
                test_case["instruction"],
                {
                    "node_type": "universal", 
                    "node_name": "Test Node Context",
                    "node_description": "Context description"
                }
            )
        assert test_case["expected_error"] in str(exc_info.value)

@pytest.mark.asyncio
async def test_function_call_response_processing(llm_service):
    """Test processing of function call responses and dynamic typing."""
    instruction = {
        "relationship_type": RelationshipType.GENERALIZES.value,
        "source_type": "universal",
        "target_type": "universal", # Expecting universal target nodes
        "is_source": True # Context node is source (Animal)
    }
    context = {
        "node_type": "universal",
        "node_name": "Animal",
        "node_description": "A living organism"
    }
    
    candidates = await llm_service.generate_candidates(instruction, context)
    
    assert isinstance(candidates, list)
    if candidates:
        for candidate in candidates:
            assert isinstance(candidate, dict)
            assert set(candidate.keys()) == {"name", "type", "description"}
            assert candidate["type"] == instruction["target_type"] # Check for dynamic type
            assert len(candidate["name"].strip()) > 0
            assert len(candidate["description"].strip()) > 0
            assert candidate["name"] != context["node_name"] 