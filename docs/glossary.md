# Project UI Glossary

This glossary catalogs user interface terminology as it appears in the Ontorum codebase. Each entry lists how the term is used and references relevant files.

| Term | Usage in Ontorum | Key References |
| --- | --- | --- |
| **Accordion** | Expandable/collapsible sections used throughout side panels. | [`AccordionSection.tsx` lines 35‑41](../frontend/src/components/AccordionSection.tsx#L35-L41) |
| **Card** | Container style applied to panels and dialogs. | [`SearchPanel.tsx` line 26](../frontend/src/components/SearchPanel.tsx#L26), [`ConfirmDialog.tsx` line 13](../frontend/src/components/ConfirmDialog.tsx#L13) |
| **Context Menu** | Right‑click menu for nodes on the graph canvas. | [`Graph.tsx` lines 215‑223](../frontend/src/components/Graph.tsx#L215-L223), [`Graph.tsx` lines 553‑572](../frontend/src/components/Graph.tsx#L553-L572) |
| **Dialog (Modal)** | Confirmation overlay blocking the UI until dismissed. | [`ConfirmDialog.tsx` lines 12‑18](../frontend/src/components/ConfirmDialog.tsx#L12-L18) |
| **Dropdown** | `<select>` elements for filtering or choosing types. | [`SearchPanel.tsx` lines 26‑33](../frontend/src/components/SearchPanel.tsx#L26-L33) |

| **Create Pane** | Left sidebar container for adding nodes and relationships. | [`App.tsx` lines 419-447](../frontend/src/App.tsx#L419-L447), [`GrammarPage.tsx` lines 204-210](../frontend/src/grammar/GrammarPage.tsx#L204-L210) |
| **Edit Pane** | Right sidebar showing details and edit forms. | [`App.tsx` lines 508-531](../frontend/src/App.tsx#L508-L531), [`GrammarPage.tsx` lines 241-258](../frontend/src/grammar/GrammarPage.tsx#L241-L258) |
| **Footer Pane** | Bottom pane with resizable height and info bar. | [`FooterPane.tsx` lines 58-81](../frontend/src/components/FooterPane.tsx#L58-L81), [`GrammarPage.tsx` lines 262-265](../frontend/src/grammar/GrammarPage.tsx#L262-L265) |
| **Graph Canvas** | Interactive SVG graph visualization. | [`Graph.tsx` lines 553‑558](../frontend/src/components/Graph.tsx#L553-L558) |
| **Header Toolbar** | Top bar with actions and panel toggles. | [`Header.tsx` lines 100‑139](../frontend/src/components/Header.tsx#L100-L139) |
| **Panel** | Smaller UI sections inside panes (e.g., `AddNodePanel`). | [`node_selection_behavior.md` lines 6-14](node_selection_behavior.md#L6-L14) |
| **Resize Handle** | Draggable divider to resize panels. | [`FooterPane.tsx` line 65](../frontend/src/components/FooterPane.tsx#L65), [`development.md` lines 72‑73](development.md#L72-L73) |
| **Tooltip** | Hover labels showing node descriptions. | [`CandidateAnalysisPanel.tsx` lines 536‑544](../frontend/src/components/CandidateAnalysisPanel.tsx#L536-L544) |

