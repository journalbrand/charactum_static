/**
 * @file RelationshipDetailsPanel.tsx
 * @description Panel component for displaying relationship details
 */

import React, { useState, useEffect } from 'react';
import '../styles/main.scss';
import { Link, Node, SchemaRelationshipType } from '../../types/graph';
import GraphService from '../services/GraphService';
import ConfirmDialog from './ConfirmDialog';

interface RelationshipDetailsPanelProps {
  relationship: Link;
  relationshipTypes: SchemaRelationshipType[];
  sourceNode?: Node;
  targetNode?: Node;
  onClose?: () => void;
  onDelete?: () => void;
}

const RelationshipDetailsPanel: React.FC<RelationshipDetailsPanelProps> = ({
  relationship,
  relationshipTypes,
  sourceNode,
  targetNode,
  onClose,
  onDelete
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const relType = relationshipTypes.find(t => t.value === relationship.type);
  const typeLabel = relType?.label || relationship.type;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Delete' &&
        !showConfirm &&
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
  }, [showConfirm]);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await GraphService.deleteRelationship(relationship.id);
      onDelete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete relationship');
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="relationship-details-panel">
      <div className="relationship-details-header">

        {onClose && (
          <button 
            className="close-button" 
            onClick={onClose} 
            aria-label="Close details"
          >×</button>
        )}
      </div>
      
      <div className="relationship-details-content">
        <div className="detail-row">
          <span className="detail-label">Type:</span>
          <span className="detail-value">
            <span className={`type-badge ${relationship.type.toLowerCase()}`}>
              {typeLabel}
            </span>
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">ID:</span>
          <span className="detail-value id-text">
            {relationship.id}
          </span>
        </div>

        {/* Properties */}
        {relationship.properties && Object.keys(relationship.properties).length > 0 && (
          <div className="detail-section">
            <h3>Additional Properties</h3>
            {Object.entries(relationship.properties).map(([key, value]) => (
              <div key={key} className="detail-row">
                <span className="detail-label">{key}:</span>
                <span className="detail-value">{String(value)}</span>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="relationship-actions">
          <button
            onClick={() => setShowConfirm(true)}
            className="btn btn-danger"
            disabled={isDeleting}
            aria-label="Delete relationship"
          >
            {isDeleting ? 'Deleting...' : 'Delete Relationship'}
          </button>
          {showConfirm && (
            <ConfirmDialog
              message="Are you sure you want to delete this relationship?"
              onConfirm={handleDelete}
              onCancel={() => setShowConfirm(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RelationshipDetailsPanel; 