import os
from enum import Enum
from pathlib import Path
import json
from types import MappingProxyType
import threading

# Global store for the singleton instance and its last loaded path
_ontology_instance = None
_loaded_ontology_path = None
_lock = threading.Lock() # To make singleton creation thread-safe


class DynamicEnumProxy:
    """Proxy that always reflects the current Enum from the active ontology."""

    def __init__(self, enum_attr_name: str):
        self._enum_attr_name = enum_attr_name

    def _enum(self):
        return getattr(get_ontology(), self._enum_attr_name)

    def __getattr__(self, item):
        return getattr(self._enum(), item)

    def __call__(self, *args, **kwargs):
        return self._enum()(*args, **kwargs)

    def __iter__(self):
        return iter(self._enum())

    @property
    def __members__(self):
        return self._enum().__members__

    def __instancecheck__(self, instance):
        return isinstance(instance, self._enum())

class OntologySpecError(ValueError):
    """Custom error for issues found in ontology_spec.json."""
    pass

class Ontology:
    def __init__(self, path: str):
        raw_spec_text = Path(path).read_text()
        try:
            spec = json.loads(raw_spec_text)
        except json.JSONDecodeError as e:
            raise OntologySpecError(f"Invalid JSON in ontology specification file at {path}: {e}")

        # --- Basic Structure Validation ---
        if not isinstance(spec, dict):
            raise OntologySpecError(f"Ontology specification at {path} must be a JSON object.")
        
        nodes_spec = spec.get("nodes")
        if not isinstance(nodes_spec, dict):
            raise OntologySpecError("Ontology spec must contain a 'nodes' object/dictionary.")

        relationships_spec = spec.get("relationships")
        if not isinstance(relationships_spec, list):
            raise OntologySpecError("Ontology spec must contain a 'relationships' array/list.")

        # --- Detailed Validation ---
        defined_node_type_keys = set(nodes_spec.keys())

        # Validate relationship rules
        for i, rule in enumerate(relationships_spec):
            if not isinstance(rule, dict):
                raise OntologySpecError(f"Relationship definition at index {i} must be an object/dictionary.")
            
            rel_name = rule.get("name")
            if not isinstance(rel_name, str) or not rel_name.strip():
                raise OntologySpecError(f"Relationship definition at index {i} is missing a valid 'name' (non-empty string).")

            for direction in ["from", "to"]:
                node_keys_in_rule = rule.get(direction)
                if not isinstance(node_keys_in_rule, list) or not node_keys_in_rule:
                    raise OntologySpecError(f"Relationship '{rel_name}' must have a non-empty list for '{direction}' node types.")
                for node_key in node_keys_in_rule:
                    if not isinstance(node_key, str) or not node_key.strip():
                        raise OntologySpecError(f"Relationship '{rel_name}' has an invalid (empty or non-string) node type key in '{direction}' list: '{node_key}'.")
                    if node_key not in defined_node_type_keys:
                        raise OntologySpecError(
                            f"Relationship '{rel_name}' references an undefined node type '{node_key}' in its '{direction}' field. "
                            f"Ensure '{node_key}' is defined as a key in the 'nodes' section of your ontology specification."
                        )
            
            if not isinstance(rule.get("description"), str) or not rule.get("description", "").strip():
                raise OntologySpecError(f"Relationship '{rel_name}' is missing a valid 'description' (non-empty string).")
            if not isinstance(rule.get("required"), bool):
                raise OntologySpecError(f"Relationship '{rel_name}' is missing 'required' field or it's not a boolean.")
            if not isinstance(rule.get("prompt_if_source"), str) or not rule.get("prompt_if_source", "").strip():
                raise OntologySpecError(f"Relationship '{rel_name}' is missing a valid 'prompt_if_source' (non-empty string).")
            if not isinstance(rule.get("prompt_if_target"), str) or not rule.get("prompt_if_target", "").strip():
                raise OntologySpecError(f"Relationship '{rel_name}' is missing a valid 'prompt_if_target' (non-empty string).")

            if "properties" in rule:
                properties_list = rule.get("properties")
                if not isinstance(properties_list, list):
                    raise OntologySpecError(f"Relationship '{rel_name}' has a 'properties' field that is not a list.")
                for prop_item in properties_list:
                    if not isinstance(prop_item, str) or not prop_item.strip():
                        raise OntologySpecError(f"Relationship '{rel_name}' has an invalid item in its 'properties' list: '{prop_item}'. All items must be non-empty strings.")

        for node_key, node_def in nodes_spec.items():
            if not isinstance(node_def, dict):
                raise OntologySpecError(f"Node definition for '{node_key}' must be an object/dictionary.")
            if not isinstance(node_def.get("label"), str) or not node_def.get("label", "").strip():
                raise OntologySpecError(f"Node '{node_key}' is missing a valid 'label' (non-empty string).")
            if not isinstance(node_def.get("properties"), list): # Assuming properties should always be a list, even if empty
                raise OntologySpecError(f"Node '{node_key}' is missing a 'properties' list or it's not a list.")
            # Example validation for property items - can be expanded
            for prop_item in node_def.get("properties", []):
                if not isinstance(prop_item, str) or not prop_item.strip():
                     raise OntologySpecError(f"Node '{node_key}' has an invalid item in its 'properties' list: '{prop_item}'. All items must be non-empty strings.")


        self.node_types = tuple(nodes_spec.keys())
        self.rel_types  = tuple(r["name"] for r in relationships_spec)

        if len(self.rel_types) != len(set(self.rel_types)):
            from collections import Counter
            name_counts = Counter(self.rel_types)
            duplicates = [name for name, count in name_counts.items() if count > 1]
            raise OntologySpecError(f"Duplicate relationship names found: {duplicates}. Relationship names must be unique.")

        for key in self.node_types:
            if not key.upper().isidentifier():
                raise OntologySpecError(f"Node type key '{key}' (becomes '{key.upper()}') is not a valid Python identifier for an Enum member.")
        for name in self.rel_types:
            if not name.upper().isidentifier():
                raise OntologySpecError(f"Relationship name '{name}' (becomes '{name.upper()}') is not a valid Python identifier for an Enum member.")

        self.NodeType = Enum("NodeType", {k.upper(): k for k in self.node_types})
        self.RelationshipType = Enum("RelationshipType", {k.upper(): k for k in self.rel_types})

        self.node_metadata = MappingProxyType(nodes_spec)
        self.relationship_rules = tuple(MappingProxyType(dict(item)) for item in relationships_spec) # Ensure inner dicts are also immutable if needed

# Default path calculation remains
default_ontology_path = Path(__file__).parent / "narragrammar.json"

def get_ontology() -> Ontology:
    """
    Returns a singleton instance of the Ontology.
    It ensures the ontology is loaded based on the current ONTOLOGY_PATH environment
    variable, reloading it if the path has changed since the last call or if not yet loaded.
    This function is thread-safe.
    """
    global _ontology_instance, _loaded_ontology_path

    current_path_str = os.getenv("ONTOLOGY_PATH", str(default_ontology_path))

    # Fast check without lock
    if _ontology_instance is not None and _loaded_ontology_path == current_path_str:
        return _ontology_instance

    # If instance is None or path has changed, acquire lock for potential initialization/re-initialization
    with _lock:
        # Re-check condition inside lock (double-checked locking pattern)
        if _ontology_instance is None or _loaded_ontology_path != current_path_str:
            # For debugging: print(f"ontology_loader.py: Initializing/Reloading ontology from: {current_path_str}")
            try:
                new_instance = Ontology(current_path_str)
                _ontology_instance = new_instance
                _loaded_ontology_path = current_path_str
            except Exception as e:
                # If loading fails, it's crucial to not leave a partially initialized state
                # or a stale _loaded_ontology_path that matches current_path_str.
                # Resetting them ensures the next call will attempt to load again.
                _ontology_instance = None 
                _loaded_ontology_path = None 
                # For debugging: print(f"ontology_loader.py: Failed to load/reload ontology from {current_path_str}: {e}")
                raise # Propagate the error (e.g., OntologySpecError, FileNotFoundError)
        # else:
            # For debugging: print(f"ontology_loader.py: Ontology already initialized/reloaded by another thread with path: {_loaded_ontology_path}")
            
    return _ontology_instance 