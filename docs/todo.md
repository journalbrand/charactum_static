# Confirmation Dialog Alignment

The database clear action currently uses the browser's `confirm` and `prompt` dialogs. Deleting a node or relationship instead opens a custom **ConfirmDialog** component. Unify these flows so clearing the database displays the same dialog used for deletions.

The unified dialog should:

- show consistent styling and messaging with the delete confirmation
- require typing `CLEAR` before enabling the final button
- prevent accidental data loss by matching the existing deletion workflow

Implementing this will make destructive actions feel coherent across the application.
