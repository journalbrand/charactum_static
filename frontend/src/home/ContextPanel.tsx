/**
 * @file ContextPanel.tsx
 * @description Main panel for displaying node and relationship details
 */

import React from 'react';
import '../styles/main.scss';
import ContextPanelNodeView from './ContextPanelNodeView';
import ContextPanelRelationshipView from './ContextPanelRelationshipView';
import { Node, Link, SchemaNodeType, SchemaRelationshipType } from '../types/graph';

interface ContextPanelProps {
  selection: {
    type: 'node' | 'relationship';
    data: Node | Link;
    // For relationships, include the connected nodes
    sourceNode?: Node;
    targetNode?: Node;
  } | null;
  onClose: () => void;
  onNodeDelete?: () => void;
  onRelationshipDelete?: () => void;
  onNodeUpdate?: (node: Node) => void;
  schema: {
    nodeTypes: SchemaNodeType[];
    relationshipTypes: SchemaRelationshipType[];
  };
}

const ContextPanel: React.FC<ContextPanelProps> = ({
  selection,
  onClose,
  onNodeDelete,
  onRelationshipDelete,
  onNodeUpdate,
  schema
}) => {
  if (!selection) return null;

  return (
    <div className="context-panel">
      {selection.type === 'node' ? (
        <ContextPanelNodeView
          node={selection.data as Node}
          nodeTypes={schema.nodeTypes}
          onClose={onClose}
          onDelete={onNodeDelete}
          onUpdate={onNodeUpdate}
        />
      ) : (
        <ContextPanelRelationshipView
          relationship={selection.data as Link}
          sourceNode={selection.sourceNode}
          targetNode={selection.targetNode}
          relationshipTypes={schema.relationshipTypes}
          nodeTypes={schema.nodeTypes}
          onClose={onClose}
          onDelete={onRelationshipDelete}
          onNodeUpdate={onNodeUpdate}
        />
      )}
    </div>
  );
};

export default ContextPanel; 