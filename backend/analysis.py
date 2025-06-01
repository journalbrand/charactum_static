"""
Analysis Router Module

This module provides FastAPI endpoints for analyzing candidate nodes using embeddings and statistical analysis.
Dependencies: fastapi, pydantic, types
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Tuple
import asyncio
from types import SimpleNamespace

from .utils.embeddings import get_embedding
from .statistical_analyzer import StatisticalAnalyzer, AnalysisConfig, AnalysisResult

router = APIRouter()

class Candidate(BaseModel):
    name: str
    type: str
    description: str

class CandidateAnalysisRequest(BaseModel):
    candidates: List[Candidate]
    config: Optional[AnalysisConfig] = None

@router.post("/candidates", response_model=AnalysisResult)
async def analyze_candidates(request: CandidateAnalysisRequest):
    candidates = request.candidates
    config = request.config or AnalysisConfig()
    
    async def embed_candidate(candidate: Candidate) -> Dict[str, Any]:
        text = f"{candidate.name}: {candidate.description}"
        try:
            embedding = await get_embedding(text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error computing embedding: {str(e)}")
        return {
            "name": candidate.name,
            "type": candidate.type,
            "description": candidate.description,
            "embedding": embedding
        }

    # Compute embeddings concurrently for all candidates
    candidate_dicts = await asyncio.gather(*(embed_candidate(c) for c in candidates))
    
    # Convert dictionaries to objects with attribute access
    candidate_objs = [SimpleNamespace(**cand) for cand in candidate_dicts]
    
    analyzer = StatisticalAnalyzer()
    result = analyzer.analyze_candidates(candidate_objs, config)
    
    # Convert SimpleNamespace objects in sorted_nodes to dictionaries
    sorted_nodes_dicts = [(
        {
            "name": node["name"],
            "type": node["type"],
            "description": node["description"]
        },
        distance
    ) for node, distance in result.sorted_nodes]
    
    # Create a properly serializable result
    return AnalysisResult(
        distances=result.distances,
        sorted_nodes=sorted_nodes_dicts,
        statistics=result.statistics,
        selected_indices=result.selected_indices,
        visualizations=result.visualizations,
        embedding_viz=result.embedding_viz
    ) 