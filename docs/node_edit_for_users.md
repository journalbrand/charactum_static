# Node Editing for Users

This document describes the design for a best‑in‑class editing suite for node names and descriptions in Ontorum.

## Goals

- Provide a clear workflow for updating a node's textual content.
- Allow users to preview AI‑generated suggestions and accept or reject them.
- Prevent accidental overwriting of node data.
- Make it obvious when there are unsaved changes.

## Editing Flow

1. **Enter Edit Mode**
   - Click the **Edit** button on a node detail panel to unlock the name and description fields.
   - The panel displays **Save** and **Cancel** actions while editing.
2. **Manual Edits**
   - Users can freely change the name and description text areas.
   - Unsaved changes are kept in memory until **Save** is clicked or **Cancel** resets them.
3. **AI Suggestions**
   - While editing, an optional instruction field lets the user guide the LLM (defaults to “Make this longer”).
   - Pressing **AI Suggest** requests a new description from the LLM.
   - The response is shown in a preview box with **Accept** and **Discard** options.
   - Accepting populates the description field but does not save to the server.
4. **Saving**
   - Press **Save** to persist the current field values.
   - Validation errors or API failures appear as inline messages.
5. **Cancelling**
   - **Cancel** reverts any unsaved changes and exits edit mode.

## Future Improvements

- Diff highlighting between the current description and AI suggestion.
- Version history of edits per node.
- Rich text formatting support.

