import json
from backend.grammar_manager import list_grammars, set_current_grammar, get_current_grammar_name, read_grammar


def test_list_and_select(tmp_path, monkeypatch):
    # create temp grammar dir with two files
    gdir = tmp_path / "grammars"
    gdir.mkdir()
    (gdir / "a.json").write_text("{}")
    (gdir / "b.json").write_text("{}")

    monkeypatch.setattr("backend.grammar_manager.GRAMMAR_DIR", gdir)
    monkeypatch.setattr("backend.grammar_manager.CURRENT_FILE", gdir / "current.txt")

    assert set(list_grammars()) == {"a.json", "b.json"}

    set_current_grammar("a.json")
    assert get_current_grammar_name() == "a.json"
    assert read_grammar("a.json") == {}

