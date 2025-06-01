# tests/test_openai.py
# Purpose: Tests OpenAI function calling integration with proper assertions and test structure
# Dependencies: requests, json, os, python-dotenv
# Associated files: .env (for API key)

import requests
import json
import os
import pytest
from dotenv import load_dotenv

def setup_module():
    """Setup for all tests in this module"""
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        pytest.skip("OPENAI_API_KEY not found in environment variables")

def test_openai_function_calling():
    """Test OpenAI function calling with proper assertions"""
    api_key = os.getenv("OPENAI_API_KEY")
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    with open('request.json', 'r') as f:
        data = json.load(f)
    
    messages = data['messages']
    created_nodes = []
    
    # Test initial request
    response = requests.post(url, headers=headers, json={**data, "messages": messages})
    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
    
    response_data = response.json()
    message = response_data['choices'][0]['message']
    
    # Test tool calls presence
    assert message.get('tool_calls'), "Expected tool calls in response"
    
    # Process and test each tool call
    for tool_call in message['tool_calls']:
        assert tool_call['function']['name'] == 'create_universal_node', f"Unexpected function name: {tool_call['function']['name']}"
        args = json.loads(tool_call['function']['arguments'])
        created_nodes.append(args)
        
        # Test required fields in node creation
        assert 'name' in args, "Node name is required"
        assert 'description' in args, "Node description is required"
        assert isinstance(args['name'], str), "Node name must be string"
        assert isinstance(args['description'], str), "Node description must be string"
    
    # Test node creation results
    assert len(created_nodes) > 0, "Expected at least one node to be created"
    for node in created_nodes:
        assert len(node['name']) > 0, "Node name should not be empty"
        assert len(node['description']) > 0, "Node description should not be empty" 