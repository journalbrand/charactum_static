/**
 * @file RelationshipView.tsx
 * @description View component for displaying relationship details with source node, relationship, and target node in a sandwich layout
 */

import React from 'react';
import '../styles/main.scss';
import { Link, Node, SchemaRelationshipType, SchemaNodeType } from '../../types/graph';
import RelationshipDetailsPanel from './ContextPanelRelationshipDetailsPanel';
import NodeDetailsPanel from './ContextPanelNodeDetailsPanel';

interface RelationshipViewProps {
  relationship: Link;
  sourceNode?: Node;
  targetNode?: Node;
  relationshipTypes: SchemaRelationshipType[];
  nodeTypes: SchemaNodeType[];
  onClose: () => void;
  onDelete?: () => void;
  onNodeUpdate?: (node: Node) => void;
}

const RelationshipView: React.FC<RelationshipViewProps> = ({
  relationship,
  sourceNode,
  targetNode,
  relationshipTypes,
  nodeTypes,
  onClose,
  onNodeUpdate
}) => {
  return (
    <div className="relationship-view">
      <div className="relationship-view-header">
        <h2>Relationship Details</h2>
        {onClose && (
          <button className="close-button" onClick={onClose}>×</button>
        )}
      </div>
      <div className="relationship-view-content">
        {sourceNode && (
          <div className="node-section">
            <h3>Source: {sourceNode.name}</h3>
            <NodeDetailsPanel
              node={sourceNode}
              nodeTypes={nodeTypes}
              className="embedded-node-panel"
              onUpdate={onNodeUpdate}
            />
          </div>
        )}

        <div className="relationship-section">
          <div className="arrow-indicator top"></div>
          <RelationshipDetailsPanel 
            relationship={relationship}
            relationshipTypes={relationshipTypes}
            sourceNode={sourceNode}
            targetNode={targetNode}
          />
          <div className="arrow-indicator bottom"></div>
        </div>

        {targetNode && (
          <div className="node-section">
            <h3>Target: {targetNode.name}</h3>
            <NodeDetailsPanel
              node={targetNode}
              nodeTypes={nodeTypes}
              className="embedded-node-panel"
              onUpdate={onNodeUpdate}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default RelationshipView; 