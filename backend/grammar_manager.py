from __future__ import annotations
import os
import json
from pathlib import Path

# Directory containing grammar JSON files
GRAMMAR_DIR = Path(__file__).parent / "grammartypes"
GRAMMAR_DIR.mkdir(exist_ok=True)

CURRENT_FILE = GRAMMAR_DIR / "current_grammar.txt"

def list_grammars() -> list[str]:
    """Return available grammar file names."""
    return sorted([p.name for p in GRAMMAR_DIR.glob("*.json")])


def get_current_grammar_name() -> str:
    if CURRENT_FILE.exists():
        name = CURRENT_FILE.read_text().strip()
        if name:
            return name

    names = list_grammars()
    preferred = "narragrammar.json"
    if preferred in names:
        default = preferred
    else:
        default = names[0] if names else "ontology_spec.json"

    CURRENT_FILE.write_text(default)
    return default


def set_current_grammar(name: str) -> None:
    path = GRAMMAR_DIR / name
    if not path.exists():
        raise FileNotFoundError(f"Grammar '{name}' not found")
    CURRENT_FILE.write_text(name)
    os.environ["ONTOLOGY_PATH"] = str(path)


def read_grammar(name: str) -> dict:
    path = GRAMMAR_DIR / name
    with open(path, "r") as f:
        return json.load(f)


def write_grammar(name: str, data: dict) -> None:
    path = GRAMMAR_DIR / name
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def duplicate_grammar(name: str, new_name: str) -> None:
    src = GRAMMAR_DIR / name
    dst = GRAMMAR_DIR / new_name
    if not src.exists():
        raise FileNotFoundError(f"Grammar '{name}' not found")
    if dst.exists():
        raise FileExistsError(f"Grammar '{new_name}' already exists")
    dst.write_text(src.read_text())


def delete_grammar(name: str) -> None:
    path = GRAMMAR_DIR / name
    if not path.exists():
        raise FileNotFoundError(f"Grammar '{name}' not found")
    if get_current_grammar_name() == name:
        raise ValueError("Cannot delete active grammar")
    path.unlink()
