/**
 * @file NodeDetailsPanel.tsx
 * @description Dynamic panel showing node details based on backend schema
 */

import React, { useMemo, useState, useEffect } from 'react';
import '../styles/main.scss';
import { Node, SchemaNodeType } from '../../types/graph';
import GraphService from '../services/GraphService';
import ConfirmDialog from './ConfirmDialog';
import LLMService from '../services/LLMService';

interface NodeDetailsPanelProps {
  node: Node;
  nodeTypes: SchemaNodeType[];
  onClose?: () => void;
  onDelete?: () => void;
  onUpdate?: (updated: Node) => void;
  className?: string;
}

interface DetailField {
  label: string;
  value: string | number;
  type: 'text' | 'id' | 'type' | 'description';
}

const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({
  node, 
  onClose,
  onDelete,
  onUpdate,
  nodeTypes,
  className = ''
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [editDescription, setEditDescription] = useState(node.description || '');
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiInstructions, setAIInstructions] = useState('');

  const [aiSuggestedDescription, setAISuggestedDescription] = useState<string | null>(null);

  const [showConfirm, setShowConfirm] = useState(false);


  const resetEdits = () => {
    setEditName(node.name);
    setEditDescription(node.description || '');
  };

  const hasUnsavedChanges =
    editName !== node.name || editDescription !== node.description;

  React.useEffect(() => {
    resetEdits();
    setIsEditing(false);
  }, [node]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Delete' &&
        !showConfirm &&
        !isEditing &&
        document.activeElement &&
        !(document.activeElement instanceof HTMLInputElement) &&
        !(document.activeElement instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setShowConfirm(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirm, isEditing]);

  if (!node) return null;

  // Find the matching node type to get its schema information
  const nodeType = nodeTypes.find(t => t.value.toLowerCase() === node.type.toLowerCase());

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await GraphService.deleteNode(node.elementId);
      onDelete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete node');
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleSave = async () => {
    try {
      const updated = await GraphService.updateNode(node.elementId, {
        name: editName,
        description: editDescription
      });
      node.name = updated.name;
      node.description = updated.description;
      onUpdate?.(updated);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update node');
    }
  };

  const handleAIEdit = async () => {
    try {
      setIsAILoading(true);
      const instruction = aiInstructions.trim() || 'Make this longer';
      const updated = await LLMService.getInstance().editNodeDescription(
        node.elementId,
        instruction
      );
      setAIInstructions('');
      setAISuggestedDescription(updated.description);
      setIsEditing(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI suggestion failed');
    } finally {
      setIsAILoading(false);
    }
  };

  const acceptAISuggestion = () => {
    if (aiSuggestedDescription) {
      setEditDescription(aiSuggestedDescription);
      setAISuggestedDescription(null);
    }
  };

  const discardAISuggestion = () => {
    setAISuggestedDescription(null);
  };

  // Build fields based on the node data and schema
  const fields = useMemo(() => {
    const baseFields: DetailField[] = [
      {
        label: 'Name',
        value: node.name,
        type: 'text'
      },
      {
        label: 'Type',
        value: nodeType?.label || node.type,
        type: 'type'
      },
      {
        label: 'Description',
        value: node.description || '',
        type: 'description'
      },
      {
        label: 'Neo4j ID',
        value: node.elementId,
        type: 'id'
      }
    ];

    // Add any additional schema-defined fields
    if (nodeType?.metadata) {
      Object.entries(nodeType.metadata).forEach(([key, value]) => {
        if (!baseFields.some(f => f.label.toLowerCase() === key.toLowerCase())) {
          baseFields.push({
            label: key.charAt(0).toUpperCase() + key.slice(1),
            value: String(value),
            type: 'text'
          });
        }
      });
    }

    return baseFields;
  }, [node, nodeType]);

  const renderField = (field: DetailField): JSX.Element => {
    switch (field.type) {
      case 'description':
        return (
          <div key={field.label} className="detail-row description">
            <span className="detail-label">{field.label}:</span>
            <span className="detail-value">
              {field.value || 'No description provided'}
            </span>
          </div>
        );
      case 'type':
        return (
          <div key={field.label} className="detail-row">
            <span className="detail-label">{field.label}:</span>
            <span className="detail-value">
              <span className={`type-badge ${node.type.toLowerCase()}`}>
                {field.value}
              </span>
            </span>
          </div>
        );
      case 'id':
        return (
          <div key={field.label} className="detail-row">
            <span className="detail-label">{field.label}:</span>
            <span className="detail-value id-text" title={String(field.value)}>
              {String(field.value)}
            </span>
          </div>
        );
      default:
        return (
          <div key={field.label} className="detail-row">
            <span className="detail-label">{field.label}:</span>
            <span className="detail-value">{String(field.value)}</span>
          </div>
        );
    }
  };

  return (
    <div className={`node-details-panel ${className}`}>
      <div className="node-details-content">
        <div className="detail-section">
          {isEditing ? (
            <>
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">
                  <input value={editName} onChange={e => setEditName(e.target.value)} />
                </span>
              </div>
              <div className="detail-row description">
                <span className="detail-label">Description:</span>
                <span className="detail-value">
                  <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} />
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Neo4j ID:</span>
                <span className="detail-value id-text">{node.elementId}</span>
              </div>
            </>
          ) : (
            <>
              {fields.map(field => renderField(field))}
            </>
          )}
        </div>

        {/* Schema-specific section */}
        {/* {nodeType?.metadata && Object.keys(nodeType.metadata).length > 0 && (
          <div className="detail-section">
            <h3>Schema Metadata</h3>
            {Object.entries(nodeType.metadata).map(([key, value]) => (
              <div key={key} className="detail-row">
                <span className="detail-label">{key}:</span>
                <span className="detail-value">{String(value)}</span>
              </div>
            ))}
          </div>
        )} */}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {isEditing && (
          <>
            <div className="ai-instructions">
              <textarea
                placeholder="Make this longer"
                value={aiInstructions}
                onChange={e => setAIInstructions(e.target.value)}
                disabled={isAILoading}
              />
            </div>
            {aiSuggestedDescription && (
              <div className="ai-suggestion-preview">
                <p>AI Suggestion:</p>
                <pre>{aiSuggestedDescription}</pre>
                <button className="btn" onClick={acceptAISuggestion}>Accept</button>
                <button className="btn" onClick={discardAISuggestion}>Discard</button>
              </div>
            )}
          </>
        )}

        <div className="node-actions">
          {isEditing ? (
            <>
              <button className="btn btn-primary" onClick={handleSave} disabled={!hasUnsavedChanges}>
                Save
              </button>
              <button className="btn" onClick={() => { resetEdits(); setIsEditing(false); }}>Cancel</button>
              <button className="btn" onClick={handleAIEdit} disabled={isAILoading}>
                {isAILoading ? 'AI...' : 'AI Suggest'}
              </button>
              {hasUnsavedChanges && <span className="unsaved">Unsaved changes</span>}
            </>
          ) : (
            <>
              <button className="btn" onClick={() => setIsEditing(true)}>Edit</button>
            </>
          )}
          {onDelete && (
            <button
              onClick={() => setShowConfirm(true)}
              className="btn btn-danger"
              aria-label="Delete node"
            >
              Delete Node
            </button>
          )}
          {showConfirm && (
            <ConfirmDialog
              message="Are you sure you want to delete this node? This will also delete all its relationships."
              onConfirm={handleDelete}
              onCancel={() => setShowConfirm(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeDetailsPanel; 