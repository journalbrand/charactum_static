# Relationship Directionality

Ontorum treats every connection between nodes as a **directed** relationship. The orientation conveys meaning about which node acts upon or contains another. In the grammar file (`backend/narragrammar.json`) each relationship lists one or more allowed `from` types and one or more allowed `to` types. The backend and frontend rely on this orientation when validating or creating links.

## Theory

Directionality expresses narrative logic. A relationship like `Universe_HAS_StoryPart` flows from a universe to the story parts it contains. The inverse question, "Which universe contains this story part?", is answered by following the edge in reverse. Other relationships express transformation (`Trait_SUPERSEDED_BY`), sequential order (`IMMEDIATELY_PRECEDES`), or membership (`Group_SUBGROUP_OF`).

Some connections are logically symmetrical, such as `Group_ALLIED_WITH`. Even though only one direction is stored, the meaning applies to both groups. Symmetric relationships are still defined with `from` and `to` arrays so that creation is unambiguous.

Each entry in `narragrammar.json` also provides prompts describing how to ask about the relationship from the source or target perspective. These prompts depend on the direction to produce meaningful questions.

## Current Application

The ontology loader reads `narragrammar.json` to generate enums for relationship types. When a user creates a link in the **Add Relationship** panel, the interface shows an **Outgoing** or **Incoming** option. Outgoing means the selected node is the `from` side of the relationship; incoming means it will be the `to` side. The available relationship types and target nodes are filtered accordingly.

Validation in the backend ensures that relationships always respect the allowed `from → to` combinations defined in the grammar. Tests in `tests/test_graph_grammar.py` cover these rules.

## Future Considerations

As the grammar evolves, new relationship types should carefully specify their orientation. Even when a relation is conceptually bidirectional, choosing a canonical direction keeps prompts and validation consistent. If Ontorum later exposes automatic reverse lookups or visual cues for symmetric links, the underlying data model will still rely on a single stored direction.

When extending the UI, keep in mind that directionality affects node selection, relationship creation and display. Any new features that generate or analyze links should use the `from` and `to` fields from the grammar to maintain consistency.
