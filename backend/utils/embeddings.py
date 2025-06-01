"""
Embeddings Utility Module

This module provides functionality for generating embeddings using OpenAI's API.
Dependencies: openai
"""

import os
from openai import AsyncOpenAI
from typing import List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

EMBEDDING_CONFIG = {
    "default": {
        "model": "text-embedding-3-large",
        "dimensions": 3072  # Updated for the model in use
    }
}

async def get_embedding(text: str) -> List[float]:
    """Asynchronously obtain an embedding vector for the given text using OpenAI."""
    response = await client.embeddings.create(
        input=[text],
        model=EMBEDDING_CONFIG["default"]["model"]
    )
    return response.data[0].embedding 