import React, { useState, useMemo } from 'react';
import '../styles/main.scss';
import { Node, SchemaNodeType } from '../../types/graph';

interface SearchPanelProps {
  nodes: Node[];
  nodeTypes: SchemaNodeType[];
  selectedNodeId?: string;
  onSelect?: (node: Node) => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ nodes, nodeTypes, selectedNodeId, onSelect }) => {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return nodes.filter(n => {
      const matchesType = typeFilter === 'all' || n.type === typeFilter;
      const q = query.toLowerCase();
      const matchesQuery = !q || n.name.toLowerCase().includes(q) || (n.description ?? '').toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [nodes, typeFilter, query]);

  return (
    <div className="search-panel card">
      <div className="search-controls">
        <select className="form-control" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          {nodeTypes.map(nt => (
            <option key={nt.value} value={nt.value}>{nt.label}</option>
          ))}
        </select>
        <input
          className="form-control"
          type="text"
          placeholder="Search by name..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      <ul className="search-results">
        {filtered.map(node => (
          <li
            key={node.id}
            className={`search-item${selectedNodeId === node.id ? ' selected' : ''}`}
            onClick={() => onSelect?.(node)}
          >
            <span className="search-item-name">{node.name}</span>
            <span className="search-item-type">{node.type}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SearchPanel;
