/**
 * @file useCandidateProcessing.ts
 * @description Custom hook to manage the state and logic for processing AI-generated candidates (nodes and relationships).
 *              Handles candidate generation, approval (creation in DB), and rejection.
 * @requires react
 * @requires ../services/GraphService
 * @uses ../types/graph Node, RelationshipType, CandidateNode, CandidateRelationship, CandidateAnalysis
 * @uses ./useGraphData GraphDataActions (addNodeToState, addLinkToState)
 * @see ./useCandidateProcessing.test.ts Corresponding unit tests
 */
import { useState, useCallback } from 'react';
import {
  Node,
  Link,
  // AnalysisResult, // This was used before, but now CandidateAnalysis is more specific
  RelationshipType,
  // NodeType, // Removed unused import
  CandidateNode, // Assuming these are defined in types/graph or elsewhere
  CandidateRelationship,
  CandidateAnalysis,
} from '../types/graph';
import GraphService from '@/services/GraphService'; // Changed to default import and using @ alias
import { GraphDataActions } from './useGraphData';

export interface CandidateRelationshipContext {
  sourceNode: Node; // Changed from contextNode for clarity
  relationshipType: RelationshipType;
  isOutgoing: boolean;
}

// Represents the structure of the data returned by the candidate generation API
// This was previously AnalysisResult, aligning with test file mocks
export interface FullCandidateAnalysis extends CandidateAnalysis {
    candidates: CandidateNode[];
    relationships: CandidateRelationship[];
    summary: string;
}

export interface UseCandidateProcessingState {
  candidatesForReview: CandidateNode[] | null; // Changed from Node[] to CandidateNode[]
  candidateAnalysis: FullCandidateAnalysis | null;
  candidateRelationshipContext: CandidateRelationshipContext | null; // Changed from undefined
}

export interface UseCandidateProcessingActions {
  handleCandidatesGenerated: (
    generatedNodes: CandidateNode[], 
    relationshipContext?: CandidateRelationshipContext
  ) => void;
  handleCandidatesApproved: (approvedNodes: Node[], approvedRelationships: Link[]) => Promise<void>;
  handleCandidatesRejected: () => void;
}

export interface UseCandidateProcessingProps {
  addNodeToState: GraphDataActions['addNodeToState'];
  addLinkToState: GraphDataActions['addLinkToState'];
  // fetchGraphStatistics: GraphDataActions['fetchGraphStatistics']; // Not used directly in provided snippet, consider if needed
  setAppActionError: (message: string | null) => void; // Standardized error prop
}

export function useCandidateProcessing({
  addNodeToState,
  addLinkToState,
  setAppActionError,
}: UseCandidateProcessingProps): UseCandidateProcessingState & UseCandidateProcessingActions {
  const [candidatesForReview, setCandidatesForReview] = useState<CandidateNode[] | null>(null);
  const [candidateAnalysis, setCandidateAnalysis] = useState<FullCandidateAnalysis | null>(null);
  const [candidateRelationshipContext, setCandidateRelationshipContext] = useState<CandidateRelationshipContext | null>(
    null
  );

  const handleCandidatesGenerated = useCallback(
    // (analysis: FullCandidateAnalysis, sourceNode: Node, defaultRelationshipType: RelationshipType, isOutgoing: boolean) => {
    (generatedNodes: CandidateNode[], relContext?: CandidateRelationshipContext) => {
      console.log('(useCandidateProcessing) Received generated candidates:', { 
        candidateCount: generatedNodes.length,
        sourceNodeName: relContext?.sourceNode.name 
      });
      setCandidatesForReview(generatedNodes);
      setCandidateAnalysis(null); // Analysis will be fetched by CandidateAnalysisPanel or a subsequent step
      setCandidateRelationshipContext(relContext || null);
    },
    []
  );

  const handleCandidatesApproved = useCallback(async (
    approvedNodesFromPanel: Node[], 
    approvedRelationshipsFromPanel: Link[]
    ) => {
    if (!approvedNodesFromPanel || !candidateRelationshipContext) {
      let warningMsg = '(useCandidateProcessing) handleCandidatesApproved called with insufficient data.';
      if (!approvedNodesFromPanel) warningMsg += ' Missing approved nodes.';
      if (!candidateRelationshipContext) warningMsg += ' Missing candidate relationship context.';
      console.warn(warningMsg);
      setAppActionError('Cannot approve: essential data missing.');
      return;
    }
    console.log('(useCandidateProcessing) Approving candidates with context:', { 
      numApprovedNodes: approvedNodesFromPanel.length, 
      numApprovedRels: approvedRelationshipsFromPanel.length,
      contextSourceNode: candidateRelationshipContext.sourceNode.name 
    });
    setAppActionError(null);

    const tempIdToRealNodeMap = new Map<string, Node>(); // Map frontend temporary ID to the full Node object with real ID

    try {
      const createdNodesBatch: Node[] = [];
      for (const nodeToCreate of approvedNodesFromPanel) {
        const originalTempId = nodeToCreate.id; // This is the temporary ID from the frontend
        const nodeDataForApi = {
            name: nodeToCreate.name,
            type: nodeToCreate.type,
            description: nodeToCreate.description || ''
        };
        const createdNode = await GraphService.createNode(nodeDataForApi); // createdNode.id is now the REAL Neo4j ID
        addNodeToState(createdNode);
        createdNodesBatch.push(createdNode);
        tempIdToRealNodeMap.set(originalTempId, createdNode); // Map temp ID to the node containing the real ID
        console.log(`(useCandidateProcessing) Mapped temp ID ${originalTempId} to real ID ${createdNode.id} for node ${createdNode.name}`);
      }

      for (const relToCreate of approvedRelationshipsFromPanel) {
        let finalSourceId = relToCreate.source;
        let finalTargetId = relToCreate.target;

        // Check if the source of the relationship was one of the newly created nodes
        const mappedSourceNode = tempIdToRealNodeMap.get(relToCreate.source);
        if (mappedSourceNode) {
          finalSourceId = mappedSourceNode.id; // Use the real Neo4j ID
          console.log(`(useCandidateProcessing) Updated relationship source from temp ID ${relToCreate.source} to real ID ${finalSourceId}`);
        }

        // Check if the target of the relationship was one of the newly created nodes
        const mappedTargetNode = tempIdToRealNodeMap.get(relToCreate.target);
        if (mappedTargetNode) {
          finalTargetId = mappedTargetNode.id; // Use the real Neo4j ID
          console.log(`(useCandidateProcessing) Updated relationship target from temp ID ${relToCreate.target} to real ID ${finalTargetId}`);
        }
        
        const relDataForApi = {
            source: finalSourceId,
            target: finalTargetId,
            type: relToCreate.type,
            properties: relToCreate.properties || {},
        };
        console.log('(useCandidateProcessing) Creating relationship with (potentially updated) data:', relDataForApi);
        const createdLink = await GraphService.createRelationship(relDataForApi);
        addLinkToState(createdLink);
      }
      
      setCandidatesForReview(null);
      setCandidateAnalysis(null);
      setCandidateRelationshipContext(null);
      console.log('(useCandidateProcessing) Candidate approval processed successfully.');
    } catch (error) {
      console.error('(useCandidateProcessing) Error handling candidate approval:', error);
      setAppActionError(error instanceof Error ? error.message : 'Failed to approve candidates');
    }
  }, [candidateRelationshipContext, addNodeToState, addLinkToState, setAppActionError]);

  const handleCandidatesRejected = useCallback(() => {
    console.log('(useCandidateProcessing) Candidates rejected.');
    setCandidatesForReview(null);
    setCandidateAnalysis(null);
    setCandidateRelationshipContext(null);
  }, []);

  return {
    candidatesForReview,
    candidateAnalysis,
    candidateRelationshipContext,
    handleCandidatesGenerated,
    handleCandidatesApproved,
    handleCandidatesRejected,
  };
} 