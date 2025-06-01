import pytest
import os
from pathlib import Path
import sys
import importlib

@pytest.fixture(scope="function", autouse=True)
def force_default_ontology_for_tests(monkeypatch):
    """
    Ensures that all pytest runs use the default, stable ontology_spec.json
    by overriding the ONTOLOGY_PATH environment variable.
    This makes Python logic tests independent of the complex/evolving narragrammar.json.
    """
    default_spec_path = Path(__file__).parent.parent / "backend" / "ontology_spec.json"
    monkeypatch.setenv("ONTOLOGY_PATH", str(default_spec_path))
    print(f"DEBUG: conftest.py - Forcing ONTOLOGY_PATH for all tests to: {default_spec_path}")

    # Ensure the ontology is reloaded with this path
    import backend.ontology_loader
    importlib.reload(backend.ontology_loader)
    ontology = backend.ontology_loader.get_ontology()
    for module_name in ["tests.test_api", "tests.test_database"]:
        if module_name in sys.modules:
            sys.modules[module_name].ontology = ontology

    # Reload modules that might have already loaded the ontology with a different path
    # This is important if these modules are imported before this fixture runs.
    # backend.ontology_loader is already reloaded above.
    modules_to_reload = [
        "backend.graph_grammar",
        "backend.models",
        "backend.llm",
        "backend.database", # Reload even if .ontology is patched, to reset its own imports
        "backend.api",       # Reload to ensure it gets fresh enums for validation etc.
        "tests.test_database", # Added test module itself
        # Add any other module that directly or indirectly imports the ontology
        # or NodeType/RelationshipType from ontology_loader or graph_grammar
    ]
    for module_name in modules_to_reload:
        if module_name in sys.modules:
            importlib.reload(sys.modules[module_name])
            print(f"DEBUG: conftest.py - Reloaded {module_name}")
