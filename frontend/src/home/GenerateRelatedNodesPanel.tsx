/**
 * @file GenerateRelatedNodesPanel.tsx
 * @description Component for generating and managing LLM-suggested nodes with context awareness
 * @dependencies LLMService, CandidateAnalysisPanel, GraphService
 */

import React, { useState, useEffect } from 'react';
import { Node, Link, AllowedRelationshipSchema, NodeType, RelationshipType } from '../../types/graph';
import LLMService from '../services/LLMService';
import GraphService from '../../services/GraphService';
import CandidateAnalysisPanel from '../CandidateAnalysisPanel/CandidateAnalysisPanel';
import '../styles/main.scss';

interface GenerateRelatedNodesPanelProps {
  contextNode: Node;
  onCandidatesGenerated: (candidates: Node[], relationshipContext?: { contextNode: Node; relationshipType: string; isOutgoing: boolean }) => void;
  onCandidatesApproved: (
    approvedNodes: Node[],
    approvedRelationships: Link[],
    instruction: string
  ) => void;
  onCandidatesRejected: () => void;
  className?: string;
}

interface NodeContext {
  id: string;
  elementId: string;
  name: string;
  type: NodeType;
  description: string;
}

const GenerateRelatedNodesPanel: React.FC<GenerateRelatedNodesPanelProps> = ({
  contextNode,
  onCandidatesGenerated,
  onCandidatesApproved,
  onCandidatesRejected,
  className = ''
}) => {
  const [allowedSchemas, setAllowedSchemas] = useState<AllowedRelationshipSchema[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<AllowedRelationshipSchema | null>(null);
  const [isContextSource, setIsContextSource] = useState(true);  // Whether context node is source or target
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCandidates, setHasCandidates] = useState(false);
  const [generatedCandidates, setGeneratedCandidates] = useState<Node[]>([]);
  const [relationshipContext, setRelationshipContext] = useState<{ contextNode: Node; relationshipType: string; isOutgoing: boolean } | null>(null);

  // Load allowed relationship schemas based on context node
  useEffect(() => {
    const loadSchemas = async () => {
      try {
        const response = await fetch('/api/schema/allowed-relationship-schemas');
        const data = await response.json();
        
        // Filter schemas where our context node type matches either from_type or to_type
        const filteredSchemas = contextNode 
          ? data.relationships.filter((schema: AllowedRelationshipSchema) => 
              schema.from_type.toLowerCase() === contextNode.type.toLowerCase() ||
              schema.to_type.toLowerCase() === contextNode.type.toLowerCase()
            )
          : [];
        
        setAllowedSchemas(filteredSchemas);
      } catch (e) {
        console.error('Error loading schemas:', e);
        setError('Failed to load relationship schemas');
      }
    };

    loadSchemas();
  }, [contextNode]);

  const handleGenerateCandidates = async () => {
    if (!selectedSchema) return;

    setLoading(true);
    setError(null);

    console.log('Step 1: GenerateRelatedNodesPanel - Starting candidate generation with context:', {
      contextNode: {
        id: contextNode.id,
        name: contextNode.name,
        type: contextNode.type
      },
      selectedSchema: {
        relationship_type: selectedSchema.relationship_type,
        from_type: selectedSchema.from_type,
        to_type: selectedSchema.to_type
      },
      isContextSource
    });

    try {
      const llmService = LLMService.getInstance();
      const instructionData = {
        relationship_type: selectedSchema.relationship_type,
        source_type: selectedSchema.from_type,
        target_type: selectedSchema.to_type,
        is_source: isContextSource,
        additional_instructions: additionalInstructions
      };

      const result = await llmService.generateCandidates(instructionData, contextNode);
      console.log('Step 1: GenerateRelatedNodesPanel - Candidates generated:', {
        candidateCount: result.candidates.length,
        candidates: result.candidates.map(c => ({ name: c.name, type: c.type }))
      });

      // Pass relationship context along with candidates
      const relationshipContext = {
        contextNode,
        relationshipType: selectedSchema.relationship_type,
        isOutgoing: isContextSource
      };

      console.log('Step 1: GenerateRelatedNodesPanel - Created relationship context:', {
        contextNode: {
          id: relationshipContext.contextNode.id,
          name: relationshipContext.contextNode.name,
          type: relationshipContext.contextNode.type
        },
        relationshipType: relationshipContext.relationshipType,
        isOutgoing: relationshipContext.isOutgoing
      });

      onCandidatesGenerated(result.candidates, relationshipContext);
      setGeneratedCandidates(result.candidates);
      setRelationshipContext(relationshipContext);

      console.log('Step 1: GenerateRelatedNodesPanel - Passed candidates and context to App');
    } catch (error) {
      console.error('Step 1: GenerateRelatedNodesPanel - Error generating candidates:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate candidates');
    } finally {
      setLoading(false);
    }

  };

  const isFormValid = selectedSchema !== null;

  return (

    <div className={`form-base llm-node-generator ${className}`}>
      <div className="generator-header">
        <h3 className="form-heading">Generate Related Nodes</h3>
      </div>

      {contextNode && (
        <div className="context-info">
          <div className="context-node-details">
            <span className="context-label">Context Node:</span>
            <span className="context-name">{contextNode.name}</span>
            <span className="context-type">{contextNode.type}</span>
            {contextNode.description && (
              <p className="context-description">{contextNode.description}</p>
            )}
          </div>
        </div>
      )}

      {hasCandidates ? (
        <div className="candidates-pending">
          <p>Candidates are ready for review in the footer below.</p>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              setHasCandidates(false);
              setSelectedSchema(null);
              setAdditionalInstructions('');
              onCandidatesRejected();
            }}
          >
            Clear & Generate New
          </button>
        </div>
      ) : (
        <div className="generator-form">
          <div className="form-group">
            <label htmlFor="relationship-type" className="required-field">Relationship Type:</label>
            <select
              id="relationship-type"
              value={selectedSchema?.relationship_type || ''}
              onChange={(e) => {
                const schema = allowedSchemas.find(s => s.relationship_type === e.target.value);
                setSelectedSchema(schema || null);
                if (schema) {
                  setIsContextSource(schema.from_type.toLowerCase() === contextNode?.type.toLowerCase());
                }
              }}
              className="form-control"
              disabled={loading}
            >
              <option value="">Select a relationship type...</option>
              {allowedSchemas.map(schema => (
                <option key={schema.relationship_type} value={schema.relationship_type}>
                  {schema.relationship_type.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {selectedSchema && (
            <>
              <div className="form-group">
                <label>Relationship Direction:</label>
                <div className="direction-options">
                  <label>
                    <input
                      type="radio"
                      name="direction"
                      checked={isContextSource}
                      onChange={() => setIsContextSource(true)}
                      disabled={loading}
                    />
                    <span>{contextNode?.name} {selectedSchema.relationship_type.toLowerCase()} → (new nodes)</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="direction"
                      checked={!isContextSource}
                      onChange={() => setIsContextSource(false)}
                      disabled={loading}
                    />
                    <span>(new nodes) {selectedSchema.relationship_type.toLowerCase()} → {contextNode?.name}</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="additional-instructions">Additional Instructions (Optional):</label>
                <textarea
                  id="additional-instructions"
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder={`e.g., "Only North American examples" or "Focus on prehistoric instances"`}
                  disabled={loading}
                  className="form-control"
                />
              </div>
            </>
          )}

          <button
            className="btn btn-primary generate-button"
            onClick={handleGenerateCandidates}
            disabled={loading || !isFormValid}
          >
            {loading ? 'Generating...' : 'Generate Candidates'}
          </button>
          {error && <div className="error-message">{error}</div>}
        </div>
      )}
    </div>
  );
};

export default GenerateRelatedNodesPanel; 
