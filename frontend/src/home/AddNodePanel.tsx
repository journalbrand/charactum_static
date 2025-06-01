/**
 * @file AddNodePanel.tsx
 * @description Form component for creating new nodes with proper type validation and metadata support
 */

import React, { useState, useEffect } from 'react';
import '../styles/main.scss';
import { Node, NodeType, RelationshipType, SchemaNodeType } from '../../types/graph';

interface NodeTypeMetadata {
  properties: string[];
  label: string;
}

interface NodeFormData {
  type: NodeType;
  properties: Record<string, string>;
}

interface NodeApiData {
  type: NodeType;
  name: string;
  description: string;
}

interface AddNodePanelProps {
  onSubmit: (nodeData: NodeApiData) => void;
  nodeTypes: SchemaNodeType[];
  relationshipMode?: {
    targetType: NodeType;
    sourceNode: Node;
    relationshipType: RelationshipType;
    isOutgoing: boolean;
    onComplete: (newNode: Node) => void;
  };
}

const AddNodePanel: React.FC<AddNodePanelProps> = ({ onSubmit, nodeTypes, relationshipMode }) => {
  const [formData, setFormData] = useState<NodeFormData>(() => {
    // Initialize with relationship target type if in relationship mode
    const initialType = relationshipMode?.targetType || 
      (nodeTypes.length > 0 ? nodeTypes[0].value as NodeType : 'Particular');
    const initialProperties = nodeTypes.find(t => t.value === initialType)?.metadata?.properties || [];
    return {
      type: initialType,
      properties: initialProperties.reduce((acc, prop) => ({
        ...acc,
        [prop]: ''
      }), {})
    };
  });

  const [currentMetadata, setCurrentMetadata] = useState<NodeTypeMetadata | null>(
    nodeTypes[0]?.metadata || null
  );

  // Update form data when type changes to include all required properties
  useEffect(() => {
    const selectedType = nodeTypes.find(t => t.value === formData.type);
    if (selectedType?.metadata) {
      setCurrentMetadata(selectedType.metadata);
      
      // Preserve existing values for properties that exist in new type
      const newProperties = selectedType.metadata.properties.reduce((acc, prop) => ({
        ...acc,
        [prop]: formData.properties[prop] || ''
      }), {});

      setFormData(prev => ({
        ...prev,
        properties: newProperties
      }));
    }
  }, [formData.type, nodeTypes]);

  useEffect(() => {
    // When entering relationship mode, update the form type
    if (relationshipMode) {
      const typeSchema = nodeTypes.find(t => t.value === relationshipMode.targetType);
      if (typeSchema?.metadata) {
        setFormData(prev => ({
          ...prev,
          type: relationshipMode.targetType,
          properties: typeSchema.metadata.properties.reduce((acc, prop) => ({
            ...acc,
            [prop]: ''
          }), {})
        }));
      }
    }
  }, [relationshipMode, nodeTypes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Transform data to match API expectations
    const apiData = {
      type: formData.type,
      name: formData.properties.name || '',
      description: formData.properties.description || ''
    };
    
    onSubmit(apiData);
    
    // Reset form with empty values for all properties of selected type
    const selectedType = nodeTypes.find(t => t.value === formData.type);
    if (selectedType?.metadata) {
      setFormData({
        type: formData.type,
        properties: selectedType.metadata.properties.reduce((acc, prop) => ({
          ...acc,
          [prop]: ''
        }), {})
      });
    }
  };

  const handlePropertyChange = (propertyName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      properties: {
        ...prev.properties,
        [propertyName]: value
      }
    }));
  };

  const renderPropertyInput = (prop: string) => {
    const isRequired = prop === 'name' || prop === 'type';
    const label = prop.charAt(0).toUpperCase() + prop.slice(1);
    
    if (prop === 'type' || prop === 'id') return null; // These are handled separately
    
    return (
      <div key={prop} className="form-group">
        <label htmlFor={prop} className={isRequired ? 'required-field' : ''}>
          {label}:
        </label>
        {prop === 'description' ? (
          <textarea
            id={prop}
            value={formData.properties[prop] || ''}
            onChange={(e) => handlePropertyChange(prop, e.target.value)}
            className="form-control"
            required={isRequired}
          />
        ) : (
          <input
            type="text"
            id={prop}
            value={formData.properties[prop] || ''}
            onChange={(e) => handlePropertyChange(prop, e.target.value)}
            className="form-control"
            required={isRequired}
          />
        )}
      </div>
    );
  };

  if (!currentMetadata) return null;

  return (
    <form className="form-base node-input-form" onSubmit={handleSubmit}>
      <h3 className="form-heading">Add New {currentMetadata?.label || 'Node'}</h3>
      
      <div className="form-content">
        <div className="form-group">
          <label htmlFor="type" className="required-field">Type:</label>
          <select
            id="type"
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ 
              ...prev,
              type: e.target.value as NodeType 
            }))}
            className="form-control"
            required
          >
            {nodeTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {currentMetadata && (
            <div className="type-description">
              {currentMetadata.label}
            </div>
          )}
        </div>

        {/* Render all properties from metadata */}
        {currentMetadata.properties.map(prop => renderPropertyInput(prop))}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          Add {currentMetadata.label}
        </button>
      </div>
    </form>
  );
};

export default AddNodePanel; 
