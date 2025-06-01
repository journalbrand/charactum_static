/**
 * @file useNodeCreationContext.test.ts
 * @description Unit tests for the useNodeCreationContext custom hook.
 * @requires @testing-library/react
 * @requires ../useNodeCreationContext
 * @requires ../../types/graph Node (for mock data)
 */
import { renderHook, act } from '@testing-library/react';
import { useNodeCreationContext, NodeCreationContextValue } from './useNodeCreationContext';
import { Node, NodeType, RelationshipType } from '@/types/graph'; // Changed path

// Mock data for a Node
const mockSourceNode: Node = {
  id: 'source-node-1',
  elementId: 'source-node-1',
  name: 'Source Node',
  type: 'Concept' as NodeType,
  description: 'A source node for testing',
};

// Mock onComplete callback
const mockOnComplete = jest.fn();

const mockContextValue: NodeCreationContextValue = {
  targetType: 'Entity' as NodeType,
  sourceNode: mockSourceNode,
  relationshipType: 'RELATES_TO' as RelationshipType,
  isOutgoing: true,
  onComplete: mockOnComplete,
};

const mockNewNode: Node = {
    id: 'new-node-1',
    elementId: 'new-node-1',
    name: 'Newly Created Node',
    type: 'Entity' as NodeType,
    description: 'A freshly created node for testing context completion'
};

describe('useNodeCreationContext', () => {
  beforeEach(() => {
    // Clear any previous mock calls before each test
    mockOnComplete.mockClear();
  });

  it('should initialize with an undefined context', () => {
    const { result } = renderHook(() => useNodeCreationContext());
    expect(result.current.nodeCreationContext).toBeUndefined();
  });

  it('should set the nodeCreationContext when startNodeCreation is called', () => {
    const { result } = renderHook(() => useNodeCreationContext());

    act(() => {
      result.current.startNodeCreation(mockContextValue);
    });

    expect(result.current.nodeCreationContext).toEqual(mockContextValue);
  });

  it('should clear the nodeCreationContext when cancelNodeCreation is called', () => {
    const { result } = renderHook(() => useNodeCreationContext());

    // First, set a context
    act(() => {
      result.current.startNodeCreation(mockContextValue);
    });
    expect(result.current.nodeCreationContext).toEqual(mockContextValue);

    // Then, cancel it
    act(() => {
      result.current.cancelNodeCreation();
    });

    expect(result.current.nodeCreationContext).toBeUndefined();
  });

  it('should clear the nodeCreationContext when completeNodeCreation is called, if context was active', () => {
    const { result } = renderHook(() => useNodeCreationContext());

    // Set a context
    act(() => {
      result.current.startNodeCreation(mockContextValue);
    });
    expect(result.current.nodeCreationContext).toBeDefined();

    // Call completeNodeCreation (simulating node was created and onComplete was handled elsewhere)
    act(() => {
      result.current.completeNodeCreation(mockNewNode);
    });

    expect(result.current.nodeCreationContext).toBeUndefined();
  });

  it('completeNodeCreation should not throw if called when context is already undefined', () => {
    const { result } = renderHook(() => useNodeCreationContext());
    expect(result.current.nodeCreationContext).toBeUndefined();

    act(() => {
        expect(() => result.current.completeNodeCreation(mockNewNode)).not.toThrow();
    });
    expect(result.current.nodeCreationContext).toBeUndefined();
  });

  // Note: The onComplete callback itself is not called by completeNodeCreation in this hook.
  // It's assumed to be called by the component (AddNodePanel via App.tsx's handleAddNode)
  // before completeNodeCreation is called to clear the context. So we don't test mockOnComplete here.
}); 