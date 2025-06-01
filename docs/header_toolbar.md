# Header Toolbar

The header at the top of the React application includes a toolbar with quick access to common database and layout operations.

## Available Actions

- **Export** ⬇️ – triggers a download of the current database.
- **Import** ⬆️ – opens the file picker to import a previously exported JSON file.
- **Clear** 🗑️ – removes all nodes and relationships after confirmation.
- **Left pane icon** – shows or hides the pane on the left.
- **Right pane icon** – shows or hides the pane on the right.
- **📕 Collapse all cards** – collapses every accordion card in the layout.
- **📖 Expand all cards** – expands every accordion card.
- **Bottom pane icon** – shows or hides the pane at the bottom with statistics.

- Drag the thin handles on the create, details or footer panes to resize them.


- **Theme** – toggles between the light and dark themes.

When the footer is visible you can drag its top edge to change how much space it
occupies. The height resets to its default whenever the footer is reopened.

These actions are exposed via the `Header` component properties so that the parent application can implement the actual behavior.
