/**
 * @file useGraphData.test.ts
 * @description Unit tests for the useGraphData custom hook.
 * @requires @testing-library/react
 * @requires ./useGraphData
 * @requires ../../types/graph Node, Link, GraphStatistics (for mock data)
 */
import { renderHook, act } from '@testing-library/react';
import { useGraphData } from './useGraphData';
import { Node, Link, GraphStatistics, SchemaNodeType } from '@/types/graph';

const mockNode1: Node = { id: '1', elementId: '1', name: 'Node 1', type: 'Concept', description: '' };
const mockNode2: Node = { id: '2', elementId: '2', name: 'Node 2', type: 'Entity', description: '' };
const mockLink1: Link = { id: 'l1', source: '1', target: '2', type: 'RELATES_TO' };

const mockFetchedGraphData = { nodes: [mockNode1, mockNode2], links: [mockLink1] };

const mockGraphStats: GraphStatistics = {
  total_nodes: 2,
  total_relationships: 1,
  average_degree: 1,
  node_type_distribution: { Concept: 1, Entity: 1 },
  relationship_type_distribution: { RELATES_TO: 1 },
};

const mockSchemaNodeTypes: SchemaNodeType[] = [
  { value: 'Concept', label: 'Concept', metadata: { label: 'Concept', properties: ['name']} },
  { value: 'Entity', label: 'Entity', metadata: { label: 'Entity', properties: ['name']} },
];

describe('useGraphData', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should initialize with loading true and empty data/stats', () => {
    const { result } = renderHook(() => useGraphData());
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual({ nodes: [], links: [] });
    expect(result.current.graphStats).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('fetchDataWithSchema should fetch and set graph data and statistics', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ // For Concept nodes
        ok: true,
        json: async () => [mockNode1],
      })
      .mockResolvedValueOnce({ // For Entity nodes
        ok: true,
        json: async () => [mockNode2],
      })
      .mockResolvedValueOnce({ // Relationships for mockNode1
        ok: true,
        json: async () => [mockLink1],
      })
      .mockResolvedValueOnce({ // Relationships for mockNode2 (empty for this test)
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({ // For graph statistics
        ok: true,
        json: async () => mockGraphStats,
      });

    const { result } = renderHook(() => useGraphData());

    await act(async () => {
      await result.current.fetchDataWithSchema(mockSchemaNodeTypes);
    });

    expect(result.current.data.nodes).toEqual(expect.arrayContaining([mockNode1, mockNode2]));
    expect(result.current.data.links).toEqual([mockLink1]);
    expect(result.current.graphStats).toEqual(mockGraphStats);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(5);
  });

  it('fetchDataWithSchema should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Server Error' }),
    });

    const { result } = renderHook(() => useGraphData());
    await act(async () => {
      await result.current.fetchDataWithSchema(mockSchemaNodeTypes);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.data).toEqual({ nodes: [], links: [] });
    expect(result.current.graphStats).toBeNull();
  });

  it('fetchDataWithSchema should not run if schemaNodeTypes is empty or undefined', async () => {
    const { result } = renderHook(() => useGraphData());
    
    await act(async () => {
      await result.current.fetchDataWithSchema([]);
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);

    act(() => { result.current.setGraphError(null); });
    const { result: result2 } = renderHook(() => useGraphData());
    await act(async () => {
      await result2.current.fetchDataWithSchema(undefined as any);
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result2.current.loading).toBe(false);
  });

  it('fetchGraphStatistics should fetch and set statistics', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGraphStats,
    });
    const { result } = renderHook(() => useGraphData());
    await act(async () => {
      await result.current.fetchGraphStatistics();
    });
    expect(result.current.graphStats).toEqual(mockGraphStats);
    expect(global.fetch).toHaveBeenCalledWith('/api/graph/statistics');
  });

  it('addNodeToState should add a node', () => {
    const { result } = renderHook(() => useGraphData());
    act(() => {
      result.current.addNodeToState(mockNode1);
    });
    expect(result.current.data.nodes).toEqual([mockNode1]);
  });

  it('addLinkToState should add a link', () => {
    const { result } = renderHook(() => useGraphData());
    act(() => {
      result.current.addLinkToState(mockLink1);
    });
    expect(result.current.data.links).toEqual([mockLink1]);
  });

  it('updateNodeInState should update an existing node', () => {
    const { result } = renderHook(() => useGraphData());
    act(() => {
      result.current.addNodeToState(mockNode1);
    });
    const updatedNode = { ...mockNode1, name: 'Updated Node 1' };
    act(() => {
      result.current.updateNodeInState(updatedNode);
    });
    expect(result.current.data.nodes).toEqual([updatedNode]);
  });

  it('deleteNodeFromState should remove a node and its links', () => {
    const { result } = renderHook(() => useGraphData());
    act(() => {
      result.current.addNodeToState(mockNode1);
      result.current.addNodeToState(mockNode2);
      result.current.addLinkToState(mockLink1);
      result.current.addLinkToState({ id: 'l2', source: '2', target: '1', type: 'LINK_BACK'});
    });
    act(() => {
      result.current.deleteNodeFromState(mockNode1.id);
    });
    expect(result.current.data.nodes).toEqual([mockNode2]);
    expect(result.current.data.links).toEqual([]);
  });

  it('deleteLinkFromState should remove a link', () => {
    const { result } = renderHook(() => useGraphData());
    act(() => {
      result.current.addLinkToState(mockLink1);
    });
    act(() => {
      result.current.deleteLinkFromState(mockLink1.id);
    });
    expect(result.current.data.links).toEqual([]);
  });

  it('setGraphError should set the error message', () => {
    const { result } = renderHook(() => useGraphData());
    act(() => {
      result.current.setGraphError('Test error');
    });
    expect(result.current.error).toBe('Test error');
  });

  it('setGraphData should set the graph data, clear error, and set loading false', () => {
    const { result } = renderHook(() => useGraphData());
    act(() => {
      result.current.setGraphError('Initial error');
    });

    const newGraphData = { nodes: [mockNode2], links: [] };
    act(() => {
      result.current.setGraphData(newGraphData);
    });
    expect(result.current.data).toEqual(newGraphData);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('clearGraphDataState should reset data, stats, error and set loading false', () => {
    const { result } = renderHook(() => useGraphData());
    act(() => {
      result.current.setGraphData(mockFetchedGraphData);
      result.current.setGraphError('Some error');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGraphStats,
      });
    });

    act(() => {
      result.current.clearGraphDataState();
    });

    expect(result.current.data).toEqual({ nodes: [], links: [] });
    expect(result.current.graphStats).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });
}); 