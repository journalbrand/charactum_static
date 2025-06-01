# Node Selection Behavior

When a node in the graph is clicked **or dragged**, the workspace automatically adjusts which panes are visible. This helps focus on the selected node and hides unrelated UI.

The following panes are expanded or collapsed after selecting a node. Panels that have no relevant content are hidden, but the **Search** panel remains available:

- **Edit pane** – expanded so the node information is visible.
- **Add Relationship** – expanded.
- **Generate Related Nodes** – expanded.
- **Add Node** – collapsed.
- **Search** – collapsed and always last, automatically filling the remaining height.
- **Footer** – collapsed.


When no item is selected only the **Selected Node** accordion is hidden. The details pane stays visible with the **Search** section filling the remaining space. The create pane adapts so that **Add Relationship** and **Generate Related Nodes** cards only appear while a node is selected.



Dragging a node works the same as clicking it. As soon as you start dragging, the node becomes selected and the panes update accordingly.

## Search Selection

Selecting a node from the **Search** panel not only updates the panel layout but also focuses the visualization on that node. The graph freezes the node at its current position, centers the viewport on it and smoothly zooms in so it is easy to locate.

