import React, { useState } from 'react';
import GrammarService from '../services/GrammarService';
import './styles/_AddRelationshipTypeForm.scss';

interface AddRelationshipTypeFormProps {
  grammarName: string;
  onAdd: () => void;
  nodes: string[];
}

const AddRelationshipTypeForm: React.FC<AddRelationshipTypeFormProps> = ({ grammarName, onAdd, nodes }) => {
  const [name, setName] = useState('');
  const [from, setFrom] = useState<string[]>([]);
  const [to, setTo] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [required, setRequired] = useState(false);
  const [promptSource, setPromptSource] = useState('');
  const [promptTarget, setPromptTarget] = useState('');
  const [properties, setProperties] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const grammar = await GrammarService.getGrammar(grammarName);
    grammar.relationships.push({
      name,
      from,
      to,
      description,
      required,
      properties: properties
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
      prompt_if_source: promptSource,
      prompt_if_target: promptTarget,
    });
    await GrammarService.updateGrammar(grammarName, grammar);
    onAdd();
    setName('');
    setFrom([]);
    setTo([]);
    setDescription('');
    setRequired(false);
    setPromptSource('');
    setPromptTarget('');
    setProperties('');
  };

  return (
    <form className="panel form-base" onSubmit={handleSubmit}>
      <h3>Add Relationship Type</h3>
      <div className="form-group">
        <label>Name</label>
        <input className="form-control" value={name} onChange={e => setName(e.target.value)} required />
      </div>
      <div className="form-group">
        <label>From Node Types</label>
        <select
          multiple
          className="form-control"
          value={from}
          onChange={(e) =>
            setFrom(Array.from(e.target.selectedOptions, (o) => o.value))
          }
        >
          {nodes.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>To Node Types</label>
        <select
          multiple
          className="form-control"
          value={to}
          onChange={(e) =>
            setTo(Array.from(e.target.selectedOptions, (o) => o.value))
          }
        >
          {nodes.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea
          className="form-control"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
          />
          Required
        </label>
      </div>
      <div className="form-group">
        <label>Properties (comma separated)</label>
        <input
          className="form-control"
          value={properties}
          onChange={(e) => setProperties(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Prompt if Source</label>
        <textarea
          className="form-control"
          value={promptSource}
          onChange={(e) => setPromptSource(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Prompt if Target</label>
        <textarea
          className="form-control"
          value={promptTarget}
          onChange={(e) => setPromptTarget(e.target.value)}
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Add</button>
      </div>
    </form>
  );
};

export default AddRelationshipTypeForm;
