import React, { useState } from 'react';
import GrammarService from '../services/GrammarService';
import './styles/_NodeTypeDetailsPanel.scss';

interface NodeTypeDetailsProps {
  name: string;
  data: { label: string; properties: string[] };
  grammarName: string;
  onUpdate: () => void;
}

const NodeTypeDetailsPanel: React.FC<NodeTypeDetailsProps> = ({ name, data, grammarName, onUpdate }) => {
  const [label, setLabel] = useState(data.label);
  const [properties, setProperties] = useState(data.properties.join(', '));

  const handleSave = async () => {
    const grammar = await GrammarService.getGrammar(grammarName);
    grammar.nodes[name] = {
      label,
      properties: properties.split(',').map(p => p.trim()).filter(Boolean)
    };
    await GrammarService.updateGrammar(grammarName, grammar);
    onUpdate();
  };

  const handleDelete = async () => {
    const grammar = await GrammarService.getGrammar(grammarName);
    delete grammar.nodes[name];
    grammar.relationships = grammar.relationships.filter((r: any) => !r.from.includes(name) && !r.to.includes(name));
    await GrammarService.updateGrammar(grammarName, grammar);
    onUpdate();
  };

  return (
    <div className="panel node-type-details">
      <h3>{name}</h3>
      <div className="form-group">
        <label>Label</label>
        <input className="form-control" value={label} onChange={e => setLabel(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Properties (comma separated)</label>
        <input className="form-control" value={properties} onChange={e => setProperties(e.target.value)} />
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" onClick={handleSave}>Save</button>
        <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
};

export default NodeTypeDetailsPanel;
