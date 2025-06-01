/**
 * @file NodeView.tsx
 * @description View component for displaying node details
 */

import React from 'react';
import '../styles/main.scss';
import { Node, SchemaNodeType } from '../../types/graph';
import NodeDetailsPanel from './ContextPanelNodeDetailsPanel';

interface NodeViewProps {
  node: Node;
  nodeTypes: SchemaNodeType[];
  onClose?: () => void;
  onDelete?: () => void;
  onUpdate?: (node: Node) => void;
}

const NodeView: React.FC<NodeViewProps> = ({
  node,
  nodeTypes,
  onClose,
  onDelete,
  onUpdate
}) => {
  return (
    <div className="node-view">
      <NodeDetailsPanel
        node={node}
        nodeTypes={nodeTypes}
        onClose={onClose}
        onDelete={onDelete}
        onUpdate={onUpdate}
      />
    </div>
  );
};

export default NodeView; 