/**
 * @file AddRelationshipPanel.tsx
 * @description Form component for creating relationships with type safety and node selection
 */

import React, { useState, useEffect } from 'react';
import '../styles/main.scss';
import { Node, NodeType, RelationshipType, SchemaNodeType, AllowedRelationshipSchema } from '../../types/graph';
import AddNodePanel from '../AddNodePanel/AddNodePanel';

interface NodeApiData {
  type: NodeType;
  name: string;
  description: string;
}

interface AddRelationshipPanelProps {
  startNode: Node;
  nodeTypes: SchemaNodeType[];
  nodes: Node[];
  allowedRelationshipSchemas: AllowedRelationshipSchema[];
  onSubmit: (startNode: Node, endNode: Node, relationshipType: RelationshipType, isOutgoing: boolean) => void;
  onCancel: () => void;
  onCreateNode: (nodeData: NodeApiData) => Promise<Node>;
  onStartNodeCreation?: (context: {
    targetType: NodeType;
    sourceNode: Node;
    relationshipType: RelationshipType;
    isOutgoing: boolean;
    onComplete: (newNode: Node) => void;
  }) => void;
  onCancelNodeCreation?: () => void;
}

export const AddRelationshipPanel: React.FC<AddRelationshipPanelProps> = ({
  startNode,
  nodeTypes,
  nodes,
  allowedRelationshipSchemas,
  onSubmit,
  onCancel,
  onCreateNode,
  onStartNodeCreation,
  onCancelNodeCreation,
}) => {
  console.log('AddRelationshipPanel rendering with props:', {
    startNode,
    nodeTypesCount: nodeTypes.length,
    nodesCount: nodes.length,
    allowedSchemas: allowedRelationshipSchemas.length
  });

  const [isOutgoing, setIsOutgoing] = useState<boolean>(true);
  const [selectedRelationshipType, setSelectedRelationshipType] = useState<RelationshipType | null>(null);
  const [selectedTargetNode, setSelectedTargetNode] = useState<Node | null>(null);
  const [validRelationshipOptions, setValidRelationshipOptions] = useState<AllowedRelationshipSchema[]>([]);
  const [validTargetNodes, setValidTargetNodes] = useState<Node[]>([]);
  const [isCreatingNewNode, setIsCreatingNewNode] = useState(false);
  const [targetNodeType, setTargetNodeType] = useState<NodeType | null>(null);

  // Debug state changes
  useEffect(() => {
    console.log('State updated:', {
      isCreatingNewNode,
      targetNodeType,
      selectedRelationshipType,
      validTargetNodesCount: validTargetNodes.length
    });
  }, [isCreatingNewNode, targetNodeType, selectedRelationshipType, validTargetNodes.length]);

  // Notify parent about node creation mode
  useEffect(() => {
    console.log('Checking node creation conditions:', {
      isCreatingNewNode,
      targetNodeType,
      selectedRelationshipType
    });

    if (isCreatingNewNode && targetNodeType && selectedRelationshipType) {
      console.log('Starting node creation with context:', {
        targetType: targetNodeType,
        sourceNode: startNode,
        relationshipType: selectedRelationshipType
      });

      const relationshipContext = {
        targetType: targetNodeType,
        sourceNode: startNode,
        relationshipType: selectedRelationshipType,
        isOutgoing,
        onComplete: (newNode: Node) => {
          console.log('Node creation completed, creating relationship:', newNode);
          // Don't create a new node, just use the one that was created
          setSelectedTargetNode(newNode);
          setIsCreatingNewNode(false);
          setValidTargetNodes(prev => [...prev, newNode]);
          
          if (selectedRelationshipType) {
            console.log('Creating relationship with new node:', {
              source: startNode,
              target: newNode,
              type: selectedRelationshipType
            });
            onSubmit(
              startNode,
              newNode,
              selectedRelationshipType,
              isOutgoing
            );
          }
        }
      };
      
      onStartNodeCreation?.(relationshipContext);
    }
  }, [isCreatingNewNode, targetNodeType, selectedRelationshipType, startNode, isOutgoing]);

  // Update valid relationship options when direction changes
  useEffect(() => {
    const filteredSchemas = allowedRelationshipSchemas.filter(schema => {
      if (isOutgoing) {
        return schema.from_type === startNode.type;
      } else {
        return schema.to_type === startNode.type;
      }
    });
    setValidRelationshipOptions(filteredSchemas);
    setSelectedRelationshipType(null);
    setSelectedTargetNode(null);
  }, [isOutgoing, startNode.type, allowedRelationshipSchemas]);

  // Update valid target nodes and target node type when relationship type changes
  useEffect(() => {
    if (!selectedRelationshipType) {
      setValidTargetNodes([]);
      setTargetNodeType(null);
      return;
    }

    const schema = validRelationshipOptions.find(
      option => option.relationship_type === selectedRelationshipType
    );

    if (!schema) {
      setValidTargetNodes([]);
      setTargetNodeType(null);
      return;
    }

    const targetType = isOutgoing ? schema.to_type : schema.from_type;
    setTargetNodeType(targetType as NodeType);
    
    const filteredNodes = nodes.filter(
      node => node.type === targetType && node.id !== startNode.id
    );

    setValidTargetNodes(filteredNodes);
    setSelectedTargetNode(null);
  }, [selectedRelationshipType, validRelationshipOptions, nodes, startNode.id, isOutgoing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRelationshipType || !selectedTargetNode) return;

    onSubmit(
      startNode,
      selectedTargetNode,
      selectedRelationshipType,
      isOutgoing
    );
  };

  const handleCreateNode = async (nodeData: NodeApiData) => {
    console.log('WARNING: handleCreateNode called directly - this should not happen anymore');
    console.trace();
    // This function should no longer be called directly
    try {
      const newNode = await onCreateNode(nodeData);
      setSelectedTargetNode(newNode);
      setIsCreatingNewNode(false);
      setValidTargetNodes(prev => [...prev, newNode]);
      
      if (selectedRelationshipType) {
        onSubmit(
          startNode,
          newNode,
          selectedRelationshipType,
          isOutgoing
        );
      }
    } catch (error) {
      console.error('Failed to create node:', error);
    }
  };

  // Helper function to group nodes by type
  const groupNodesByType = (nodes: Node[]) => {
    return nodes.reduce((groups, node) => {
      const type = node.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(node);
      return groups;
    }, {} as Record<string, Node[]>);
  };

  // Helper function to get contextual node labels
  const getContextualLabels = () => {
    if (isOutgoing) {
      return {
        sourceLabel: 'Source',
        targetLabel: 'Target',
        directionText: 'from',
        arrowSymbol: '→',
        nodeSelectionLabel: 'Select Target Node',
        placeholderText: 'Select target node...'
      };
    } else {
      return {
        sourceLabel: 'Target',
        targetLabel: 'Source',
        directionText: 'to',
        arrowSymbol: '←',
        nodeSelectionLabel: 'Select Source Node',
        placeholderText: 'Select source node...'
      };
    }
  };

  // Render different content based on state
  if (isCreatingNewNode && targetNodeType && selectedRelationshipType) {
    const labels = getContextualLabels();
    const relationshipDescription = isOutgoing
      ? `${startNode.name} ${labels.arrowSymbol} New ${targetNodeType}`
      : `New ${targetNodeType} ${labels.arrowSymbol} ${startNode.name}`;

    console.log('Rendering node creation view');
    return (
      <div className="form-base">
        <div className="form-header">
          <button 
            type="button" 
            onClick={() => {
              console.log('Canceling node creation');
              setIsCreatingNewNode(false);
              onCancelNodeCreation?.();
            }}
            className="btn btn-secondary"
          >
            ← Back to Relationship
          </button>
          <h3 className="form-heading">Creating New {targetNodeType}</h3>
        </div>
        <div className="creation-message">
          <div>Creating a new {targetNodeType.toLowerCase()} for relationship:</div>
          <div className="relationship-preview">
            <strong>{relationshipDescription}</strong>
          </div>
          <div className="relationship-type">
            Type: <strong>{selectedRelationshipType}</strong>
          </div>
          <div className="creation-instruction">
            Please use the form on the right to create your new {targetNodeType.toLowerCase()}.
            The relationship will be created automatically.
          </div>
        </div>
      </div>
    );
  }

  const labels = getContextualLabels();
  const nodeCountOptionText = targetNodeType
    ? validTargetNodes.length === 0
      ? `No nodes of type ${targetNodeType} in the graph`
      : `${validTargetNodes.length} node${validTargetNodes.length === 1 ? '' : 's'} of type ${targetNodeType} available`
    : '';

  return (
    <form className="form-base relationship-input-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <h3 className="form-heading">
          Add Relationship {labels.directionText} {startNode.name}
        </h3>
      </div>
      
      <div className="form-content">
        <div className="selected-node-info">
          <span className="selected-node-label">{labels.sourceLabel} {startNode.type}:</span>
          <span className="selected-node-name">{startNode.name}</span>
          {startNode.description && (
            <span className="selected-node-description">{startNode.description}</span>
          )}
        </div>

        <div className="form-group">
          <label>Relationship Direction</label>
          <div className="direction-selector">
            <button
              type="button"
              className={`btn ${isOutgoing ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setIsOutgoing(true)}
            >
              Outgoing {startNode.name} → Target
            </button>
            <button
              type="button"
              className={`btn ${!isOutgoing ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setIsOutgoing(false)}
            >
              Incoming Source → {startNode.name}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="required-field">Relationship Type</label>
          <select
            value={selectedRelationshipType || ''}
            onChange={(e) => {
              const relType = e.target.value as RelationshipType;
              setSelectedRelationshipType(relType || null);
            }}
            className="form-control"
            required
          >
            <option value="">Select relationship type...</option>
            {validRelationshipOptions.map(option => (
              <option key={option.relationship_type} value={option.relationship_type}>
                {isOutgoing 
                  ? `${startNode.name} ${option.relationship_type} →`
                  : `← ${option.relationship_type} ${startNode.name}`}
              </option>
            ))}
          </select>
        </div>

        {selectedRelationshipType && (
          <div className="form-group">
            <label className="required-field">{labels.nodeSelectionLabel}</label>
            <select
              value={selectedTargetNode?.id || ''}
              onChange={(e) => {
                if (e.target.value === 'create_new') {
                  setIsCreatingNewNode(true);
                } else {
                  const node = validTargetNodes.find(n => n.id === e.target.value);
                  setSelectedTargetNode(node || null);
                }
              }}
              className="form-control relationship-select"
              required
            >
              <option value="">{labels.placeholderText}</option>
              {targetNodeType && (
                <option value="__info" disabled className="node-count-option">
                  {nodeCountOptionText}
                </option>
              )}
              {Object.entries(groupNodesByType(validTargetNodes)).map(([type, nodes]) => (
                <optgroup key={type} label={`${type}s (${labels.targetLabel}s)`}>
                  {nodes.map(node => (
                    <option key={node.id} value={node.id} title={node.description || undefined}>
                      {node.name}
                      {node.description ? ` - ${node.description.substring(0, 60)}${node.description.length > 60 ? '...' : ''}` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
              {targetNodeType && (
                <optgroup label="Actions">
                  <option value="create_new" className="create-new-option">
                    ➕ Create New {targetNodeType} as {labels.targetLabel}...
                  </option>
                </optgroup>
              )}
            </select>
            {validTargetNodes.length === 0 && !targetNodeType && (
              <div className="no-nodes-message">
                No valid {labels.targetLabel.toLowerCase()} nodes available for this relationship type
              </div>
            )}
          </div>
        )}
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={!selectedRelationshipType || !selectedTargetNode} 
          className="btn btn-primary"
        >
          Create {selectedRelationshipType} Relationship
        </button>
      </div>
    </form>
  );
};

export default AddRelationshipPanel; 
