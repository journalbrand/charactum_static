/**
 * @file useSchemaData.test.ts
 * @description Unit tests for the useSchemaData custom hook.
 * @requires @testing-library/react
 * @requires ./useSchemaData
 */
import { renderHook, act } from '@testing-library/react';
import { useSchemaData /* , SchemaData */ } from './useSchemaData';
import { SchemaNodeType, SchemaRelationshipType, AllowedRelationshipSchema } from '@/types/graph';

// Mock successful API responses
const mockNodeTypes: SchemaNodeType[] = [{ value: 'Concept', label: 'Concept', metadata: { label: 'Concept', properties: ['name']}}];
const mockRelTypes: SchemaRelationshipType[] = [{ value: 'RELATES_TO', label: 'Relates To' }];
const mockAllowedSchemas: AllowedRelationshipSchema[] = [
  { from_type: 'Concept', to_type: 'Concept', relationship_type: 'RELATES_TO', properties: {} }
];

const mockSuccessResponse = (data: any) => ({
  ok: true,
  json: async () => data,
  status: 200,
});

const mockErrorResponse = (status: number, message: string = 'Error') => ({
  ok: false,
  json: async () => ({ detail: message }),
  status: status,
  statusText: message,
});

describe('useSchemaData', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should initialize with empty schema, loading true, and no error', () => {
    const { result } = renderHook(() => useSchemaData());
    expect(result.current.nodeTypes).toEqual([]);
    expect(result.current.relationshipTypes).toEqual([]);
    expect(result.current.allowedRelationshipSchemas).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('fetchSchema should fetch and set schema data on success', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockSuccessResponse({ types: mockNodeTypes }))       // Node types
      .mockResolvedValueOnce(mockSuccessResponse({ types: mockRelTypes }))        // Relationship types
      .mockResolvedValueOnce(mockSuccessResponse({ relationships: mockAllowedSchemas })); // Allowed schemas

    const { result } = renderHook(() => useSchemaData());

    // Loading should be true initially
    expect(result.current.loading).toBe(true);

    await act(async () => {
      await result.current.fetchSchema();
    });

    expect(result.current.nodeTypes).toEqual(mockNodeTypes);
    expect(result.current.relationshipTypes).toEqual(mockRelTypes);
    expect(result.current.allowedRelationshipSchemas).toEqual(mockAllowedSchemas);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch).toHaveBeenCalledWith('/api/schema/node-types');
    expect(global.fetch).toHaveBeenCalledWith('/api/schema/relationship-types');
    expect(global.fetch).toHaveBeenCalledWith('/api/schema/allowed-relationship-schemas');
  });

  it('fetchSchema should set error and reset schema on API failure (e.g., node types fail)', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockErrorResponse(500, 'Node Types Failed')) // Node types fail
      .mockResolvedValueOnce(mockSuccessResponse({ types: mockRelTypes }))
      .mockResolvedValueOnce(mockSuccessResponse({ relationships: mockAllowedSchemas }));

    const { result } = renderHook(() => useSchemaData());

    await act(async () => {
      await result.current.fetchSchema();
    });

    expect(result.current.nodeTypes).toEqual([]); // Resets to initial
    expect(result.current.relationshipTypes).toEqual([]);
    expect(result.current.allowedRelationshipSchemas).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toMatch('Failed to fetch complete schema data');
  });

   it('fetchSchema should set error if relationship types API fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockSuccessResponse({ types: mockNodeTypes }))
      .mockResolvedValueOnce(mockErrorResponse(500, 'Rel Types Failed')) // Rel types fail
      .mockResolvedValueOnce(mockSuccessResponse({ relationships: mockAllowedSchemas }));

    const { result } = renderHook(() => useSchemaData());
    await act(async () => { await result.current.fetchSchema(); });
    expect(result.current.error).toMatch('Failed to fetch complete schema data');
    expect(result.current.loading).toBe(false);
  });

  it('fetchSchema should set error if allowed schemas API fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockSuccessResponse({ types: mockNodeTypes }))
      .mockResolvedValueOnce(mockSuccessResponse({ types: mockRelTypes }))
      .mockResolvedValueOnce(mockErrorResponse(500, 'Allowed Schemas Failed')); // Allowed schemas fail
      
    const { result } = renderHook(() => useSchemaData());
    await act(async () => { await result.current.fetchSchema(); });
    expect(result.current.error).toMatch('Failed to fetch complete schema data');
    expect(result.current.loading).toBe(false);
  });

  it('fetchSchema should handle non-Error objects thrown during fetch (e.g. network error)', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce('Network error'); // Simulate fetch throwing a string

    const { result } = renderHook(() => useSchemaData());
    await act(async () => {
      await result.current.fetchSchema();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Failed to fetch schema'); // Generic error message
    expect(result.current.nodeTypes).toEqual([]);
  });
}); 