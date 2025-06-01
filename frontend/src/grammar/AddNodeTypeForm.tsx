import React, { useState } from 'react';
import GrammarService from '../services/GrammarService';
import './styles/_AddNodeTypeForm.scss';

interface AddNodeTypeFormProps {
  grammarName: string;
  onAdd: () => void;
}

const AddNodeTypeForm: React.FC<AddNodeTypeFormProps> = ({ grammarName, onAdd }) => {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [properties, setProperties] = useState('id,name,description');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const grammar = await GrammarService.getGrammar(grammarName);
    if (grammar.nodes[name]) {
      alert('Node type already exists');
      return;
    }
    grammar.nodes[name] = {
      label,
      properties: properties.split(',').map(p => p.trim()).filter(Boolean)
    };
    await GrammarService.updateGrammar(grammarName, grammar);
    onAdd();
    setName('');
    setLabel('');
    setProperties('id,name,description');
  };

  return (
    <form className="panel form-base" onSubmit={handleSubmit}>
      <h3>Add Node Type</h3>
      <div className="form-group">
        <label>Name</label>
        <input className="form-control" value={name} onChange={e => setName(e.target.value)} required />
      </div>
      <div className="form-group">
        <label>Label</label>
        <input className="form-control" value={label} onChange={e => setLabel(e.target.value)} required />
      </div>
      <div className="form-group">
        <label>Properties (comma separated)</label>
        <input className="form-control" value={properties} onChange={e => setProperties(e.target.value)} />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Add</button>
      </div>
    </form>
  );
};

export default AddNodeTypeForm;
