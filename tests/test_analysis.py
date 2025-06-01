import pytest
from fastapi.testclient import TestClient

from backend.api import app

# Fixtures from conftest handle ontology path etc.

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture(autouse=True)
def mock_embeddings(monkeypatch):
    async def fake_get_embedding(text: str):
        # return a simple deterministic embedding
        return [0.1, 0.2, 0.3]

    # Patch both the utility module and the already imported function in analysis
    monkeypatch.setattr('backend.utils.embeddings.get_embedding', fake_get_embedding)
    monkeypatch.setattr('backend.analysis.get_embedding', fake_get_embedding)
    yield


def test_single_candidate_analysis(client):
    payload = {
        "candidates": [
            {"name": "Only", "type": "universal", "description": "single"}
        ]
    }
    resp = client.post("/api/analysis/candidates", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["sorted_nodes"][0][0]["name"] == "Only"
    assert len(data["embedding_viz"]["x"]) == 1
