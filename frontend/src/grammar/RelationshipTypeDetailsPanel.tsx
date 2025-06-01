import React, { useState } from 'react';
import GrammarService from '../services/GrammarService';
import './styles/_RelationshipTypeDetailsPanel.scss';

interface RelationshipTypeDetailsProps {
  index: number;
  data: any;
  grammarName: string;
  onUpdate: () => void;
  nodes: string[];
}

const RelationshipTypeDetailsPanel: React.FC<RelationshipTypeDetailsProps> = ({ index, data, grammarName, onUpdate, nodes }) => {
  const [name, setName] = useState(data.name);
  const [from, setFrom] = useState<string[]>(data.from || []);
  const [to, setTo] = useState<string[]>(data.to || []);
  const [description, setDescription] = useState(data.description || '');
  const [required, setRequired] = useState(Boolean(data.required));
  const [promptSource, setPromptSource] = useState(data.prompt_if_source || '');
  const [promptTarget, setPromptTarget] = useState(data.prompt_if_target || '');
  const [properties, setProperties] = useState((data.properties || []).join(', '));

  const handleSave = async () => {
    const grammar = await GrammarService.getGrammar(grammarName);
    grammar.relationships[index] = {
      ...grammar.relationships[index],
      name,
      from,
      to,
      description,
      required,
      properties: properties
        .split(',')
        .map((p: string) => p.trim())
        .filter(Boolean),
      prompt_if_source: promptSource,
      prompt_if_target: promptTarget,
    };
    await GrammarService.updateGrammar(grammarName, grammar);
    onUpdate();
  };

  const handleDelete = async () => {
    const grammar = await GrammarService.getGrammar(grammarName);
    grammar.relationships.splice(index, 1);
    await GrammarService.updateGrammar(grammarName, grammar);
    onUpdate();
  };
  return (
    <div className="panel relationship-type-details">
      <h3>{name}</h3>
      <div className="form-group">
        <label>Name</label>
        <input className="form-control" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="form-group">
        <label>From</label>
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
        <label>To</label>
        <select
          multiple
          className="form-control"
          value={to}
          onChange={(e) => setTo(Array.from(e.target.selectedOptions, (o) => o.value))}
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
        <button className="btn btn-primary" onClick={handleSave}>Save</button>
        <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
};

export default RelationshipTypeDetailsPanel;
