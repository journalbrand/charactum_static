/**
 * @file useSelectionManagement.ts
 * @description Custom hook to manage user selections (nodes, relationships) and focus state on the graph.
 * @requires react
 * @uses ../types/graph Node, Link
 * @uses ./useAppLayout AppLayoutActions (specifically adjustLayoutForNodeSelection)
 * @uses ./useGraphData GraphDataState (specifically data.nodes)
 * @see ./useSelectionManagement.test.ts Corresponding unit tests
 */
import { useState, useCallback } from 'react';
import { Node, Link } from '../types/graph';

export interface SelectionState {
  type: 'node' | 'relationship';
  data: Node | Link;
  sourceNode?: Node; // For relationship selections
  targetNode?: Node; // For relationship selections
}

export interface UseSelectionManagementState {
  selection: SelectionState | null;
  focusNodeId: string | undefined;
}

export interface UseSelectionManagementActions {
  handleSelect: (item: Node | Link | null, type: 'node' | 'relationship') => void;
  handleSearchSelect: (node: Node) => void;
  clearSelection: () => void;
  setFocusNodeId: React.Dispatch<React.SetStateAction<string | undefined>>;
}

interface UseSelectionManagementProps {
  nodes: Node[]; // All nodes from useGraphData, for finding source/target of links
  adjustLayoutForNodeSelection: () => void; // From useAppLayout
}

export function useSelectionManagement({
  nodes,
  adjustLayoutForNodeSelection,
}: UseSelectionManagementProps): UseSelectionManagementState & UseSelectionManagementActions {
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | undefined>(undefined);

  const clearSelection = useCallback(() => {
    console.log('(useSelectionManagement) Clearing selection');
    setSelection(null);
    setFocusNodeId(undefined);
  }, []);

  const handleSelect = useCallback((item: Node | Link | null, type: 'node' | 'relationship') => {
    if (!item) {
      console.log('(useSelectionManagement) Clearing selection');
      clearSelection();
      return;
    }

    if (type === 'node') {
      const nodeItem = item as Node;
      console.log('(useSelectionManagement) Selecting node:', { id: nodeItem.id, name: nodeItem.name });
      setSelection({ type: 'node', data: nodeItem });
      setFocusNodeId(undefined); // Clear focus if a node is directly clicked, focus is for search->select
      adjustLayoutForNodeSelection();
    } else { // type === 'relationship'
      const linkItem = item as Link;
      // Don't deselect if clicking the same relationship
      if (selection?.type === 'relationship' && selection.data.id === linkItem.id) {
        return;
      }
      
      const sourceNode = typeof linkItem.source === 'string' 
        ? nodes.find(n => n.id === linkItem.source)
        : linkItem.source as Node; // D3 might already resolve this to a Node object
      const targetNode = typeof linkItem.target === 'string'
        ? nodes.find(n => n.id === linkItem.target)
        : linkItem.target as Node; // D3 might already resolve this to a Node object
      
      console.log('(useSelectionManagement) Selecting relationship:', {
        type: linkItem.type,
        source: sourceNode?.name,
        target: targetNode?.name
      });

      setFocusNodeId(undefined); // Clear focus when selecting a relationship
      setSelection({
        type: 'relationship',
        data: linkItem,
        sourceNode,
        targetNode
      });
    }
  }, [nodes, adjustLayoutForNodeSelection, clearSelection, selection]); // Added selection to dep array

  const handleSearchSelect = useCallback((node: Node) => {
    console.log('(useSelectionManagement) Search selected node:', { id: node.id, name: node.name });
    setSelection({ type: 'node', data: node });
    setFocusNodeId(node.id);
    adjustLayoutForNodeSelection();
  }, [adjustLayoutForNodeSelection, setSelection, setFocusNodeId]);

  return {
    selection,
    focusNodeId,
    handleSelect,
    handleSearchSelect,
    clearSelection,
    setFocusNodeId, // Expose direct setter for focusNodeId if needed outside handleSearchSelect
  };
} 