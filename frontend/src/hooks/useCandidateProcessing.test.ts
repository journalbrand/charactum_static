/**
 * @file useCandidateProcessing.test.ts
 * @description Unit tests for the useCandidateProcessing custom hook.
 * @requires @testing-library/react
 * @requires ../useCandidateProcessing
 * @requires ../../services/GraphService
 * @requires ../../types/graph (for mock data and types)
 */
import { renderHook, act } from '@testing-library/react';
import { useCandidateProcessing, CandidateRelationshipContext } from './useCandidateProcessing';
import GraphService from '@/services/GraphService';
import { Node, Link, CandidateNode } from '@/types/graph';

// Mocks
jest.mock('@/services/GraphService');

const mockAddNodeToState = jest.fn();
const mockAddLinkToState = jest.fn();
const mockSetAppActionError = jest.fn();

const mockSourceNode: Node = { id: 'source-1', elementId: 'source-1', name: 'Source Node', type: 'Concept', description: 'A source node' };
const mockCandidateNode1: CandidateNode = { name: 'Candidate 1', type: 'Event', description: 'First candidate' };
const mockCandidateNode2: CandidateNode = { name: 'Candidate 2', type: 'Concept', description: 'Second candidate' };

const mockGeneratedCandidates: CandidateNode[] = [mockCandidateNode1, mockCandidateNode2];

const mockRelContext: CandidateRelationshipContext = {
  sourceNode: mockSourceNode,
  relationshipType: 'RELATES_TO',
  isOutgoing: true,
};

// Updated for the original test to reflect temporary IDs and dynamic resolution
const mockTempCandidateNode1: Node = { id: 'temp-id-original-test-candidate-1', elementId: 'temp-id-original-test-candidate-1', name: 'Original Test Candidate 1', type: 'Event', description: 'First candidate for original test' };

const mockApprovedNodesForOriginalTest: Node[] = [mockTempCandidateNode1];

const mockApprovedLinksForOriginalTest: Link[] = [
  { id: 'temp-link-original-test-1', source: mockSourceNode.id, target: mockTempCandidateNode1.id, type: 'RELATES_TO' }
];

describe('useCandidateProcessing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (GraphService.createNode as jest.Mock).mockImplementation(async (nodeData) => ({
      ...nodeData,
      id: `created-${nodeData.name.replace(/\s+/g, '-')}`,
      elementId: `created-${nodeData.name.replace(/\s+/g, '-')}`,
    }));
    (GraphService.createRelationship as jest.Mock).mockImplementation(async (relData) => ({
      ...relData,
      // Ensure relData properties match what createRelationship expects (source_id, target_id)
      id: `created-rel-${relData.source_id || relData.source}-${relData.target_id || relData.target}-${relData.type}`,
    }));
  });

  it('should initialize with null candidates and context', () => {
    const { result } = renderHook(() => useCandidateProcessing({
      addNodeToState: mockAddNodeToState,
      addLinkToState: mockAddLinkToState,
      setAppActionError: mockSetAppActionError,
    }));
    expect(result.current.candidatesForReview).toBeNull();
    expect(result.current.candidateAnalysis).toBeNull(); 
    expect(result.current.candidateRelationshipContext).toBeNull();
  });

  it('handleCandidatesGenerated should set candidatesForReview and relationshipContext', () => {
    const { result } = renderHook(() => useCandidateProcessing({
      addNodeToState: mockAddNodeToState,
      addLinkToState: mockAddLinkToState,
      setAppActionError: mockSetAppActionError,
    }));

    act(() => {
      result.current.handleCandidatesGenerated(mockGeneratedCandidates, mockRelContext);
    });

    expect(result.current.candidatesForReview).toEqual(mockGeneratedCandidates);
    expect(result.current.candidateRelationshipContext).toEqual(mockRelContext);
    expect(result.current.candidateAnalysis).toBeNull(); 
  });
  
  it('handleCandidatesGenerated should set relationshipContext to null if not provided', () => {
    const { result } = renderHook(() => useCandidateProcessing({
      addNodeToState: mockAddNodeToState,
      addLinkToState: mockAddLinkToState,
      setAppActionError: mockSetAppActionError,
    }));

    act(() => {
      result.current.handleCandidatesGenerated(mockGeneratedCandidates); // No context
    });

    expect(result.current.candidatesForReview).toEqual(mockGeneratedCandidates);
    expect(result.current.candidateRelationshipContext).toBeNull();
  });


  it('handleCandidatesApproved should call createNode and createRelationship, then clear state', async () => {
    const { result } = renderHook(() => useCandidateProcessing({
      addNodeToState: mockAddNodeToState,
      addLinkToState: mockAddLinkToState,
      setAppActionError: mockSetAppActionError,
    }));

    // Use a fresh mock for createNode within this test to avoid interference if other tests change it globally
    // This ensures the ID generation is consistent with what this test expects for its assertions.
    const specificCreateNodeMock = jest.fn(async (nodeData) => ({
      ...nodeData,
      id: `created-${nodeData.name.replace(/\s+/g, '-').toLowerCase()}`,
      elementId: `created-${nodeData.name.replace(/\s+/g, '-').toLowerCase()}`,
    }));
    (GraphService.createNode as jest.Mock).mockImplementation(specificCreateNodeMock);

    act(() => {
      // Provide some generated candidates, even if not directly used by mockApprovedNodes, to ensure candidatesForReview is populated.
      result.current.handleCandidatesGenerated([mockCandidateNode1, mockCandidateNode2], mockRelContext);
    });
    
    expect(result.current.candidatesForReview).not.toBeNull();

    await act(async () => {
      // Use the modified mock data for this test
      await result.current.handleCandidatesApproved(mockApprovedNodesForOriginalTest, mockApprovedLinksForOriginalTest);
    });

    expect(GraphService.createNode).toHaveBeenCalledTimes(mockApprovedNodesForOriginalTest.length);
    for (const node of mockApprovedNodesForOriginalTest) {
      expect(GraphService.createNode).toHaveBeenCalledWith(expect.objectContaining({ name: node.name, type: node.type }));
    }
    expect(mockAddNodeToState).toHaveBeenCalledTimes(mockApprovedNodesForOriginalTest.length);

    // Get the actual ID returned by the mock for the created node
    const createdNodeFromMock = await specificCreateNodeMock.mock.results[0].value;
    const realCreatedNodeId = createdNodeFromMock.id;

    expect(GraphService.createRelationship).toHaveBeenCalledTimes(mockApprovedLinksForOriginalTest.length);
    for (const link of mockApprovedLinksForOriginalTest) {
      expect(GraphService.createRelationship).toHaveBeenCalledWith(expect.objectContaining({
        source: link.source, // This is mockSourceNode.id, an existing ID
        target: realCreatedNodeId, // This should be the ID returned by the createNode mock
        type: link.type
      }));
    }
    expect(mockAddLinkToState).toHaveBeenCalledTimes(mockApprovedLinksForOriginalTest.length);
    
    expect(result.current.candidatesForReview).toBeNull();
    expect(result.current.candidateAnalysis).toBeNull();
    expect(result.current.candidateRelationshipContext).toBeNull();
    expect(mockSetAppActionError).toHaveBeenCalledWith(null);
  });


  it('handleCandidatesApproved should correctly map temporary frontend IDs to real Neo4j IDs for relationships', async () => {
    const localMockSetAppActionError = jest.fn();
    const localMockAddNodeToState = jest.fn();
    const localMockAddLinkToState = jest.fn();

    // Custom mock for GraphService.createNode for this specific test
    (GraphService.createNode as jest.Mock).mockImplementation(async (nodeData) => {
      // Simulate backend assigning a new, different ID
      const realId = `neo4j-id-${Math.random().toString(36).substring(7)}`;
      return {
        ...nodeData,
        id: realId,
        elementId: realId, // Ensure elementId is also the new real ID
      };
    });

    // GraphService.createRelationship mock can remain generic or be more specific if needed
    (GraphService.createRelationship as jest.Mock).mockImplementation(async (relData) => ({
      ...relData,
      id: `rel-${Math.random().toString(36).substring(7)}`,
    }));

    const { result } = renderHook(() => useCandidateProcessing({
      addNodeToState: localMockAddNodeToState,
      addLinkToState: localMockAddLinkToState,
      setAppActionError: localMockSetAppActionError,
    }));

    const contextNodeForTest: Node = { id: 'context-fixed-id', elementId: 'context-fixed-id', name: 'Context Universe', type: 'universe', description: '' };
    const currentRelContext: CandidateRelationshipContext = {
      sourceNode: contextNodeForTest,
      relationshipType: 'Universe_HAS_Character',
      isOutgoing: true,
    };

    act(() => {
      // Simulate that candidates were generated and context is set
      result.current.handleCandidatesGenerated([], currentRelContext);
    });

    const nodesToApproveWithTempIds: Node[] = [
      { id: 'temp-pikachu-id', elementId: 'temp-pikachu-id', name: 'Pikachu', type: 'character', description: 'Electric mouse' },
      { id: 'temp-charizard-id', elementId: 'temp-charizard-id', name: 'Charizard', type: 'character', description: 'Fire dragon' },
    ];

    const relationshipsToApproveWithTempIds: Link[] = [
      { id: 'temprel-1', source: contextNodeForTest.id, target: 'temp-pikachu-id', type: 'Universe_HAS_Character' },
      { id: 'temprel-2', source: 'temp-charizard-id', target: contextNodeForTest.id, type: 'Character_BELONGS_TO_Universe' }, // Example of new node as source
    ];

    await act(async () => {
      await result.current.handleCandidatesApproved(nodesToApproveWithTempIds, relationshipsToApproveWithTempIds);
    });

    expect(GraphService.createNode).toHaveBeenCalledTimes(2);
    expect(GraphService.createNode).toHaveBeenCalledWith(expect.objectContaining({ name: 'Pikachu' }));
    expect(GraphService.createNode).toHaveBeenCalledWith(expect.objectContaining({ name: 'Charizard' }));

    expect(localMockAddNodeToState).toHaveBeenCalledTimes(2);
    // localMockAddNodeToState would have been called with nodes having REAL IDs, we can check the names
    expect(localMockAddNodeToState).toHaveBeenCalledWith(expect.objectContaining({ name: 'Pikachu', id: expect.stringMatching(/^neo4j-id-/) }));
    expect(localMockAddNodeToState).toHaveBeenCalledWith(expect.objectContaining({ name: 'Charizard', id: expect.stringMatching(/^neo4j-id-/) }));

    expect(GraphService.createRelationship).toHaveBeenCalledTimes(2);

    // Critical Assertions: Check that createRelationship was called with REAL Neo4j IDs
    const createNodeCallPikachu = (GraphService.createNode as jest.Mock).mock.results[0].value;
    const realPikachuId = (await createNodeCallPikachu).id;

    const createNodeCallCharizard = (GraphService.createNode as jest.Mock).mock.results[1].value;
    const realCharizardId = (await createNodeCallCharizard).id;
    
    expect(GraphService.createRelationship).toHaveBeenCalledWith(expect.objectContaining({
      source: contextNodeForTest.id, // Existing node, ID unchanged
      target: realPikachuId,       // Should be the new Neo4j ID for Pikachu
      type: 'Universe_HAS_Character'
    }));

    expect(GraphService.createRelationship).toHaveBeenCalledWith(expect.objectContaining({
      source: realCharizardId,      // Should be the new Neo4j ID for Charizard
      target: contextNodeForTest.id, // Existing node, ID unchanged
      type: 'Character_BELONGS_TO_Universe'
    }));
    
    expect(localMockAddLinkToState).toHaveBeenCalledTimes(2);
    expect(localMockSetAppActionError).toHaveBeenCalledWith(null);
    expect(result.current.candidatesForReview).toBeNull();
  });

  it('handleCandidatesApproved should set error if called with missing data', async () => {
    const { result } = renderHook(() => useCandidateProcessing({
      addNodeToState: mockAddNodeToState,
      addLinkToState: mockAddLinkToState,
      setAppActionError: mockSetAppActionError,
    }));
    
    await act(async () => {
        await result.current.handleCandidatesApproved(mockApprovedNodesForOriginalTest, mockApprovedLinksForOriginalTest);
    });
    expect(mockSetAppActionError).toHaveBeenCalledWith('Cannot approve: essential data missing.');
    expect(GraphService.createNode).not.toHaveBeenCalled();

    mockSetAppActionError.mockClear();
    act(() => {
        result.current.handleCandidatesGenerated([], mockRelContext);
    });
    await act(async () => {
        await result.current.handleCandidatesApproved(null as any, mockApprovedLinksForOriginalTest);
    });
    expect(mockSetAppActionError).toHaveBeenCalledWith('Cannot approve: essential data missing.');
    expect(GraphService.createNode).not.toHaveBeenCalled();
  });

  it('handleCandidatesApproved should handle errors from GraphService.createNode', async () => {
    (GraphService.createNode as jest.Mock).mockRejectedValueOnce(new Error('Node creation failed'));
    const { result } = renderHook(() => useCandidateProcessing({
      addNodeToState: mockAddNodeToState,
      addLinkToState: mockAddLinkToState,
      setAppActionError: mockSetAppActionError,
    }));
    act(() => {
      result.current.handleCandidatesGenerated(mockGeneratedCandidates, mockRelContext);
    });
    await act(async () => {
      await result.current.handleCandidatesApproved(mockApprovedNodesForOriginalTest, mockApprovedLinksForOriginalTest);
    });
    expect(mockSetAppActionError).toHaveBeenCalledWith('Node creation failed');
  });
  
  it('handleCandidatesApproved should handle errors from GraphService.createRelationship', async () => {
    (GraphService.createRelationship as jest.Mock).mockRejectedValueOnce(new Error('Rel creation failed'));
    const { result } = renderHook(() => useCandidateProcessing({
      addNodeToState: mockAddNodeToState,
      addLinkToState: mockAddLinkToState,
      setAppActionError: mockSetAppActionError,
    }));
     act(() => {
      result.current.handleCandidatesGenerated(mockGeneratedCandidates, mockRelContext);
    });
    await act(async () => {
      await result.current.handleCandidatesApproved(mockApprovedNodesForOriginalTest, mockApprovedLinksForOriginalTest);
    });
    expect(GraphService.createNode).toHaveBeenCalledTimes(mockApprovedNodesForOriginalTest.length);
    expect(mockSetAppActionError).toHaveBeenCalledWith('Rel creation failed');
  });

  it('handleCandidatesRejected should clear all candidate state', () => {
    const { result } = renderHook(() => useCandidateProcessing({
      addNodeToState: mockAddNodeToState,
      addLinkToState: mockAddLinkToState,
      setAppActionError: mockSetAppActionError,
    }));
    act(() => {
      result.current.handleCandidatesGenerated(mockGeneratedCandidates, mockRelContext);
    });
    expect(result.current.candidatesForReview).not.toBeNull();

    act(() => {
      result.current.handleCandidatesRejected();
    });

    expect(result.current.candidatesForReview).toBeNull();
    expect(result.current.candidateAnalysis).toBeNull();
    expect(result.current.candidateRelationshipContext).toBeNull();
  });
}); 