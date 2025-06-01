import React, { useMemo, useState } from 'react';
import './styles/_GrammarStatisticsPanel.scss';

interface GrammarSchema {
  nodes: Record<string, { label?: string; [key: string]: any }>;
  relationships: any[];
}

interface GrammarStatisticsPanelProps {
  schema: GrammarSchema;
  currentGrammarName?: string;
}

const GrammarStatisticsPanel: React.FC<GrammarStatisticsPanelProps> = ({ schema, currentGrammarName }) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [filterRelations, setFilterRelations] = useState<boolean>(false);
  const [showExport, setShowExport] = useState<boolean>(false);
  const nodeKeys = useMemo(() => Object.keys(schema?.nodes || {}).sort(), [schema]);

  const nodeLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    nodeKeys.forEach(k => {
      labels[k] = schema.nodes?.[k]?.label || k;
    });
    return labels;
  }, [schema, nodeKeys]);

  const relationshipNames = useMemo(() => {
    const set = new Set<string>();
    (schema.relationships || []).forEach((r: any) => {
      if (r.name) set.add(r.name);
    });
    return Array.from(set).sort();
  }, [schema]);

  const relConnectionsMap = useMemo(() => {
    const map: Record<string, Record<string, Set<string>>> = {};
    nodeKeys.forEach(from => {
      map[from] = {};
      nodeKeys.forEach(to => {
        map[from][to] = new Set<string>();
      });
    });
    (schema.relationships || []).forEach((rel: any) => {
      const relName = rel.name;
      (rel.from || []).forEach((from: string) => {
        (rel.to || []).forEach((to: string) => {
          if (!map[from]) map[from] = {};
          if (!map[from][to]) map[from][to] = new Set<string>();
          map[from][to].add(relName);
        });
      });
    });
    return map;
  }, [schema, nodeKeys]);

  const nodeStats = useMemo(() => {
    const outgoing: Record<string, Set<string>> = {};
    const incoming: Record<string, Set<string>> = {};
    nodeKeys.forEach(k => {
      outgoing[k] = new Set();
      incoming[k] = new Set();
    });
    (schema.relationships || []).forEach((rel: any) => {
      const name = rel.name;
      (rel.from || []).forEach((f: string) => {
        if (outgoing[f]) outgoing[f].add(name);
      });
      (rel.to || []).forEach((t: string) => {
        if (incoming[t]) incoming[t].add(name);
      });
    });
    const result = nodeKeys.map(k => {
      const outArr = Array.from(outgoing[k]);
      const inArr = Array.from(incoming[k]);
      const total = new Set([...outArr, ...inArr]).size;
      const type = outArr.length > 0 && inArr.length > 0 ? 'connected' : outArr.length > 0 ? 'source' : inArr.length > 0 ? 'sink' : 'isolated';
      return { key: k, label: nodeLabels[k], outgoing: outArr, incoming: inArr, total, type };
    });
    return { outgoing, incoming, result };
  }, [schema, nodeKeys, nodeLabels]);

  const missingPairs = useMemo(() => {
    const checked = new Set<string>();
    const results: string[] = [];
    nodeKeys.forEach(t1 => {
      nodeKeys.forEach(t2 => {
        const pairId = [t1, t2].sort().join('|');
        if (checked.has(pairId)) return;
        const connected1 = relConnectionsMap[t1]?.[t2]?.size > 0;
        if (t1 === t2) {
          if (!connected1) {
            results.push(`No self-loop relationship defined for '${nodeLabels[t1]}' (${t1})`);
          }
        } else {
          const connected2 = relConnectionsMap[t2]?.[t1]?.size > 0;
          if (!connected1 && !connected2) {
            results.push(`No relationship defined between '${nodeLabels[t1]}' (${t1}) and '${nodeLabels[t2]}' (${t2})`);
          }
        }
        checked.add(pairId);
      });
    });
    return results;
  }, [nodeKeys, relConnectionsMap, nodeLabels]);

  const multiConnections = useMemo(() => {
    const checked = new Set<string>();
    const list: { pair: string; names: string[]; definitions: any[] }[] = [];
    nodeKeys.forEach(t1 => {
      nodeKeys.forEach(t2 => {
        const pairId = [t1, t2].sort().join('|');
        if (checked.has(pairId)) return;
        const names = new Set<string>();
        relConnectionsMap[t1]?.[t2]?.forEach(n => names.add(n));
        if (t1 !== t2) {
          relConnectionsMap[t2]?.[t1]?.forEach(n => names.add(n));
        }
        if (names.size > 1) {
          const defs = (schema.relationships || []).filter(rel => {
            const from = rel.from || [];
            const to = rel.to || [];
            const match1 = from.includes(t1) && to.includes(t2);
            const match2 = t1 !== t2 ? from.includes(t2) && to.includes(t1) : false;
            return match1 || match2;
          });
          list.push({ pair: t1 === t2 ? `${nodeLabels[t1]} (${t1})` : `${nodeLabels[t1]} (${t1}) ↔ ${nodeLabels[t2]} (${t2})`, names: Array.from(names).sort(), definitions: defs });
        }
        checked.add(pairId);
      });
    });
    return list;
  }, [nodeKeys, relConnectionsMap, schema, nodeLabels]);

  const exportDefinitions = useMemo(() => {
    if (!selectedNode) return [] as any[];
    const list: any[] = [];
    (schema.relationships || []).forEach(rel => {
      if ((rel.from || []).includes(selectedNode) || (rel.to || []).includes(selectedNode)) {
        list.push(rel);
      }
    });
    return list;
  }, [schema, selectedNode]);

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportDefinitions, null, 2));
      alert('Copied to clipboard');
    } catch (err) {
      console.error(err);
    }
  };

  const selectedStats = useMemo(() => nodeStats.result.find(r => r.key === selectedNode), [nodeStats, selectedNode]);

  return (
    <div className="panel grammar-stats-panel">
      <h3>Grammar Statistics</h3>
      {nodeKeys.length === 0 ? (
        <p>No grammar data loaded.</p>
      ) : (
        <div className="stats-grid">
          <div className="stat-item">
            <h4>Overview</h4>
            <div className="stat-row">
              <span className="stat-label">Node Types:</span>
              <span className="stat-value">{nodeKeys.length}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Relationship Names:</span>
              <span className="stat-value">{relationshipNames.length}</span>
            </div>
          </div>
        </div>
      )}
      {nodeKeys.length > 0 && (
        <>
          <h4>Node Types</h4>
          <ul className="stats-node-list">
            {nodeKeys.map(k => (
              <li key={k}
                  className={selectedNode === k ? 'selected' : ''}
                  onClick={() => { setSelectedNode(k); setShowExport(false); }}>
                {nodeLabels[k]} ({k})
              </li>
            ))}
          </ul>
          <h4>Relationship Types</h4>
          <div>
            <label>
              <input type="checkbox" checked={filterRelations} onChange={e => setFilterRelations(e.target.checked)} /> Show only related
            </label>
          </div>
          <ul className="stats-rel-list">
            {relationshipNames
              .filter(name => {
                if (!filterRelations || !selectedNode) return true;
                const defs = schema.relationships.filter(r => r.name === name);
                return defs.some(r => (r.from || []).includes(selectedNode) || (r.to || []).includes(selectedNode));
              })
              .map(name => {
                const involves = selectedNode && schema.relationships.some(r => r.name === name && ((r.from || []).includes(selectedNode) || (r.to || []).includes(selectedNode)));
                return (
                  <li key={name} className={involves ? 'highlight' : ''}>{name}</li>
                );
              })}
          </ul>
          <h4>Selected Node Details</h4>
          {selectedStats ? (
            <div className="stat-item">
              <p><strong>{selectedStats.label}</strong> ({selectedStats.key})</p>
              <p>Outgoing: {selectedStats.outgoing.join(', ') || 'None'}</p>
              <p>Incoming: {selectedStats.incoming.join(', ') || 'None'}</p>
              <p>Total Relationship Names: {selectedStats.total}</p>
              <p>Status: {selectedStats.type === 'connected' ? 'Connected (Source & Sink)' : selectedStats.type === 'source' ? 'Source-Only Node' : selectedStats.type === 'sink' ? 'Sink-Only Node' : 'Isolated Node'}</p>
            </div>
          ) : (
            <p>Select a node type for details.</p>
          )}
          <h4>Missing Relationships</h4>
          <ul className="missing-list">
            {missingPairs.map((m, i) => (<li key={i}>{m}</li>))}
          </ul>
          <h4>Multi-Connections</h4>
          <ul className="multi-list">
            {multiConnections.map((mc, idx) => (
              <li key={idx}>
                <details>
                  <summary>{mc.pair} – {mc.names.join(', ')}</summary>
                  <pre>{mc.definitions.map(d => JSON.stringify(d, null, 2)).join('\n\n')}</pre>
                </details>
              </li>
            ))}
          </ul>
          {selectedNode && (
            <div className="export-section">
              <button className="btn btn-secondary" onClick={() => setShowExport(v => !v)}>View/Copy Related Definitions</button>
              {showExport && (
                <div>
                  <pre>{exportDefinitions.map(d => JSON.stringify(d, null, 2)).join('\n\n')}</pre>
                  <button className="btn btn-secondary" onClick={copyExport}>Copy to Clipboard</button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GrammarStatisticsPanel;
