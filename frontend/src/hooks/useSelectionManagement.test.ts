/**
 * @file useSelectionManagement.test.ts
 * @description Unit tests for the useSelectionManagement custom hook.
 * @requires @testing-library/react
 * @requires ./useSelectionManagement
 * @requires ../../types/graph Node, Link (for mock data)
 */
import { renderHook, act } from '@testing-library/react';
import { useSelectionManagement } from './useSelectionManagement';
import { Node, Link, NodeType } from '@/types/graph';

const mockAdjustLayout = jest.fn();

const mockNodes: Node[] = [
  { id: 'node-1', elementId: 'node-1', name: 'Node 1', type: 'Concept' as NodeType, description: '' },
  { id: 'node-2', elementId: 'node-2', name: 'Node 2', type: 'Entity' as NodeType, description: '' },
  { id: 'node-3', elementId: 'node-3', name: 'Node 3', type: 'Concept' as NodeType, description: '' },
];

const mockLink: Link = {
  id: 'link-1',
  source: 'node-1',
  target: 'node-2',
  type: 'RELATES_TO'
};

const mockLinkWithObjectRefs: Link = {
    id: 'link-2',
    source: mockNodes[0] as any, // Simulate D3 resolved link
    target: mockNodes[1] as any, // Simulate D3 resolved link
    type: 'HAS_PART'
  };

describe('useSelectionManagement', () => {
  beforeEach(() => {
    mockAdjustLayout.mockClear();
  });

  const setupHook = (initialNodes: Node[] = mockNodes) => {
    return renderHook(() => 
      useSelectionManagement({
        nodes: initialNodes,
        adjustLayoutForNodeSelection: mockAdjustLayout,
      })
    );
  };

  it('should initialize with no selection and no focusNodeId', () => {
    const { result } = setupHook();
    expect(result.current.selection).toBeNull();
    expect(result.current.focusNodeId).toBeUndefined();
  });

  it('handleSelect should select a node and call adjustLayout', () => {
    const { result } = setupHook();
    const nodeToSelect = mockNodes[0];

    act(() => {
      result.current.handleSelect(nodeToSelect, 'node');
    });

    expect(result.current.selection).toEqual({ type: 'node', data: nodeToSelect });
    expect(result.current.focusNodeId).toBeUndefined(); // Focus should clear on direct node select
    expect(mockAdjustLayout).toHaveBeenCalledTimes(1);
  });

  it('handleSelect should select a relationship and find source/target nodes', () => {
    const { result } = setupHook();
    
    act(() => {
      result.current.handleSelect(mockLink, 'relationship');
    });

    expect(result.current.selection?.type).toBe('relationship');
    expect(result.current.selection?.data).toEqual(mockLink);
    expect((result.current.selection?.sourceNode as Node)?.id).toBe(mockLink.source);
    expect((result.current.selection?.targetNode as Node)?.id).toBe(mockLink.target);
    expect(result.current.focusNodeId).toBeUndefined();
    expect(mockAdjustLayout).not.toHaveBeenCalled(); // adjustLayout only for node selections
  });

  it('handleSelect should correctly use already resolved source/target for links', () => {
    const { result } = setupHook();
    act(() => {
        result.current.handleSelect(mockLinkWithObjectRefs, 'relationship');
    });
    expect(result.current.selection?.type).toBe('relationship');
    expect(result.current.selection?.data).toEqual(mockLinkWithObjectRefs);
    expect(result.current.selection?.sourceNode).toEqual(mockNodes[0]);
    expect(result.current.selection?.targetNode).toEqual(mockNodes[1]);
  });

  it('handleSelect with null should clear selection', () => {
    const { result } = setupHook();
    // First select something
    act(() => {
      result.current.handleSelect(mockNodes[0], 'node');
    });
    expect(result.current.selection).not.toBeNull();

    // Then select null
    act(() => {
      result.current.handleSelect(null, 'node'); // type doesn't matter if item is null
    });
    expect(result.current.selection).toBeNull();
    expect(result.current.focusNodeId).toBeUndefined();
  });

  it('handleSearchSelect should set focusNodeId and then select the node', () => {
    const { result } = setupHook();
    const nodeToSearchSelect = mockNodes[1];

    act(() => {
      result.current.handleSearchSelect(nodeToSearchSelect);
    });

    expect(result.current.focusNodeId).toBe(nodeToSearchSelect.id);
    expect(result.current.selection).toEqual({ type: 'node', data: nodeToSearchSelect });
    expect(mockAdjustLayout).toHaveBeenCalledTimes(1);
  });

  it('clearSelection should clear selection and focusNodeId', () => {
    const { result } = renderHook(() => useSelectionManagement({ nodes: mockNodes, adjustLayoutForNodeSelection: mockAdjustLayout }));
    // Set an initial selection and focus to ensure they are cleared
    act(() => {
      result.current.handleSearchSelect(mockNodes[0]); // This will set selection and focusNodeId
    });
    expect(result.current.selection).not.toBeNull(); // Verify selection is set
    expect(result.current.focusNodeId).toBe(mockNodes[0].id); // Verify focusNodeId is set

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selection).toBeNull();
    expect(result.current.focusNodeId).toBeUndefined(); // Assert after clearing
  });

  it('setFocusNodeId should update focusNodeId directly', () => {
    const { result } = setupHook();
    act(() => {
      result.current.setFocusNodeId('test-focus-id');
    });
    expect(result.current.focusNodeId).toBe('test-focus-id');
  });

   it('selecting the same relationship consecutively should not change selection state', () => {
    const { result } = setupHook();
    
    act(() => {
      result.current.handleSelect(mockLink, 'relationship');
    });
    const firstSelection = result.current.selection;

    act(() => {
      result.current.handleSelect(mockLink, 'relationship');
    });
    expect(result.current.selection).toBe(firstSelection); // Should be referentially the same if no change
    expect(mockAdjustLayout).not.toHaveBeenCalled();
  });

}); 