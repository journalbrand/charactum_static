/**
 * @file useNodeCreationContext.ts
 * @description Custom hook to manage the context for creating a new node, 
 *              often as part of creating a new relationship.
 * @requires react
 * @uses ../types/graph Node, NodeType, RelationshipType
 * @see ./useNodeCreationContext.test.ts Corresponding unit tests
 */
import { useState, useCallback } from 'react';
import { Node, NodeType, RelationshipType } from '../types/graph';

export interface NodeCreationContextValue {
  targetType: NodeType;
  sourceNode: Node;
  relationshipType: RelationshipType;
  isOutgoing: boolean;
  onComplete: (newNode: Node) => void;
}

export interface UseNodeCreationContextState {
  nodeCreationContext: NodeCreationContextValue | undefined;
}

export interface UseNodeCreationContextActions {
  startNodeCreation: (context: NodeCreationContextValue) => void;
  cancelNodeCreation: () => void;
  completeNodeCreation: (newNode: Node) => void; // To be called by AddNodePanel via App.tsx
}

export function useNodeCreationContext(): UseNodeCreationContextState & UseNodeCreationContextActions {
  const [nodeCreationContext, setNodeCreationContext] = useState<NodeCreationContextValue | undefined>(
    undefined
  );

  const startNodeCreation = useCallback((context: NodeCreationContextValue) => {
    console.log('(useNodeCreationContext) Starting node creation with context:', context);
    setNodeCreationContext(context);
  }, []);

  const cancelNodeCreation = useCallback(() => {
    console.log('(useNodeCreationContext) Cancelling node creation');
    setNodeCreationContext(undefined);
  }, []);

  // This function is called when the node is actually created and the context needs to be cleared.
  // The onComplete callback within the context is called first by the AddNodePanel (via App.tsx's handleAddNode).
  const completeNodeCreation = useCallback((newNode: Node) => {
    if (nodeCreationContext) {
        console.log('(useNodeCreationContext) Node creation process complete for node:', newNode.name);
        // The original onComplete from the context should have already been called by the creator component.
        // This just clears the context itself.
        setNodeCreationContext(undefined);
    } else {
        console.warn('(useNodeCreationContext) completeNodeCreation called without active context.');
    }
  }, [nodeCreationContext]);

  return {
    nodeCreationContext,
    startNodeCreation,
    cancelNodeCreation,
    completeNodeCreation,
  };
} 