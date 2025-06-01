# Add Relationship Panel

The **Add Relationship** panel allows users to create relationships between existing nodes or create a new node on the fly.

When selecting a relationship type, Ontorum filters valid target nodes based on the ontology schema. The node dropdown now displays a grey informational option showing how many nodes of the required type currently exist. If there are none, it reads for example:

```
No nodes of type Person in the graph
```

Otherwise it will show something like:

```
3 nodes of type Concept available
```

This option is disabled and serves only as guidance. Users can choose from existing nodes or select **Create New** to add a node of the target type before the relationship is created automatically.
