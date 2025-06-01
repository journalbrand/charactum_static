import React, { useEffect, useState } from 'react';
import Header from '../home/Header';
import FooterPane from '../home/FooterPane';
import { Link } from 'react-router-dom';
import { useAppLayout } from '../hooks/useAppLayout';
import GrammarService from '../services/GrammarService';
import AddNodeTypeForm from './AddNodeTypeForm';
import AddRelationshipTypeForm from './AddRelationshipTypeForm';
import NodeTypeDetailsPanel from './NodeTypeDetailsPanel';
import RelationshipTypeDetailsPanel from './RelationshipTypeDetailsPanel';
import GrammarStatisticsPanel from './GrammarStatisticsPanel';
import '../styles/main.scss';

const GrammarPage: React.FC = () => {
  const [grammarList, setGrammarList] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [schema, setSchema] = useState<any>({ nodes: {}, relationships: [] });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedRel, setSelectedRel] = useState<number | null>(null);
  const [showAddNode, setShowAddNode] = useState(false);
  const [showAddRel, setShowAddRel] = useState(false);

  const {
    showCreatePane,
    setShowCreatePane,
    showEditPane,
    setShowEditPane,
    showFooterPane,
    setShowFooterPane,
  } = useAppLayout({ showFooterPane: false });

  const DEFAULT_DETAILS_WIDTH = 400;
  const MIN_DETAILS_WIDTH = 250;
  const [detailsWidth, setDetailsWidth] = useState<number>(DEFAULT_DETAILS_WIDTH);
  const DEFAULT_CREATE_WIDTH = 300;
  const MIN_CREATE_WIDTH = 250;
  const [createWidth, setCreateWidth] = useState<number>(DEFAULT_CREATE_WIDTH);
  const DEFAULT_FOOTER_HEIGHT = 0.3 * window.innerHeight;
  const MIN_FOOTER_HEIGHT = 100;
  const [footerHeight, setFooterHeight] = useState<number>(DEFAULT_FOOTER_HEIGHT);

  useEffect(() => {
    const load = async () => {
      const list = await GrammarService.listGrammars();
      setGrammarList(list.grammars);
      setCurrent(list.current);
      const data = await GrammarService.getGrammar(list.current);
      setSchema(data);
    };
    load();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === 'b') {
        e.preventDefault();
        setShowCreatePane(v => !v);
      }
      if ((e.ctrlKey || e.metaKey) && key === 'd') {
        e.preventDefault();
        setShowEditPane(v => !v);
      }
      if ((e.ctrlKey || e.metaKey) && key === 's') {
        e.preventDefault();
        setShowFooterPane(v => !v);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setShowCreatePane, setShowEditPane, setShowFooterPane]);

  useEffect(() => {
    if (!showEditPane) setDetailsWidth(DEFAULT_DETAILS_WIDTH);
  }, [showEditPane]);

  useEffect(() => {
    if (!showCreatePane) setCreateWidth(DEFAULT_CREATE_WIDTH);
  }, [showCreatePane]);

  useEffect(() => {
    if (showFooterPane) setFooterHeight(DEFAULT_FOOTER_HEIGHT);
  }, [showFooterPane]);

  const onDetailMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = detailsWidth;
    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      setDetailsWidth(Math.max(MIN_DETAILS_WIDTH, startWidth + delta));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onCreateMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = createWidth;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      setCreateWidth(Math.max(MIN_CREATE_WIDTH, startWidth + delta));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onFooterMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const startY = e.clientY;
    const startHeight = footerHeight;
    const onMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      setFooterHeight(Math.max(MIN_FOOTER_HEIGHT, startHeight + delta));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const selectGrammar = async (name: string) => {
    await GrammarService.selectGrammar(name);
    const data = await GrammarService.getGrammar(name);
    setCurrent(name);
    setSchema(data);
    setSelectedNode(null);
    setSelectedRel(null);
  };

  const createGrammar = async () => {
    let name = window.prompt('New grammar name');
    if (!name) return;
    if (!name.endsWith('.json')) name += '.json';
    await GrammarService.updateGrammar(name, { nodes: {}, relationships: [] });
    await GrammarService.selectGrammar(name);
    const data = await GrammarService.getGrammar(name);
    setGrammarList(list => [...list, name]);
    setCurrent(name);
    setSchema(data);
  };

  const duplicateGrammar = async () => {
    let newName = window.prompt('Duplicate as');
    if (!newName) return;
    if (!newName.endsWith('.json')) newName += '.json';
    await GrammarService.duplicateGrammar(current, newName);
    setGrammarList(list => [...list, newName]);
  };

  const deleteGrammar = async () => {
    if (!window.confirm('Delete grammar?')) return;
    await GrammarService.deleteGrammar(current);
    setGrammarList(list => list.filter(g => g !== current));
    setCurrent('');
    setSchema({ nodes: {}, relationships: [] });
  };

  return (
    <div
      className="App grammar-app"
      style={{
        gridTemplateColumns: `${showCreatePane ? createWidth + 'px' : '0px'} 1fr ${showEditPane ? detailsWidth + 'px' : '0px'}`,
        gridTemplateRows: `auto 1fr ${showFooterPane ? 'var(--footer-pane-height, 30vh)' : '0px'}`,
        '--right-pane-width': `${detailsWidth}px`,
        '--left-pane-width': `${createWidth}px`,
        '--footer-pane-height': `${footerHeight}px`,
      } as React.CSSProperties}
    >
      <Header
        isDarkMode={false}
        onThemeToggle={() => {}}
        onExport={() => {}}
        onImport={() => {}}
        onClear={() => {}}
        onToggleCreate={() => setShowCreatePane(v => !v)}
        onToggleDetails={() => setShowEditPane(v => !v)}
        onToggleFooter={() => setShowFooterPane(v => !v)}
        onCollapseAll={() => {}}
        onExpandAll={() => {}}
        rightContent={
          <div className="grammar-toolbar">
            <Link to="/" className="btn btn-secondary">Home</Link>
            <select value={current} onChange={e => selectGrammar(e.target.value)}>
              {grammarList.map(g => <option key={g}>{g}</option>)}
            </select>
            <button className="btn btn-secondary" onClick={createGrammar}>New</button>
            <button className="btn btn-secondary" onClick={duplicateGrammar}>Duplicate</button>
            <button className="btn btn-danger" onClick={deleteGrammar}>Delete</button>
          </div>
        }
      />

      <div className={`create-pane scrollable${showCreatePane ? '' : ' collapsed'}`} data-area="create">
        <div className="resize-handle-vertical" onMouseDown={onCreateMouseDown} style={{ right: '-3px', left: 'auto' }} />
        {showAddNode && <AddNodeTypeForm grammarName={current} onAdd={() => selectGrammar(current)} />}
        {showAddRel && (
          <AddRelationshipTypeForm grammarName={current} onAdd={() => selectGrammar(current)} nodes={Object.keys(schema.nodes)} />
        )}
      </div>

      <div className="graph-area" data-area="graph">
        <div className="panel nodes-panel">
          <h3>Node Types</h3>
          <button className="btn btn-secondary" onClick={() => { setShowAddNode(true); setShowAddRel(false); }}>
            Add
          </button>
          <ul>
            {Object.keys(schema.nodes).map(n => (
              <li key={n} onClick={() => { setSelectedNode(n); setSelectedRel(null); setShowAddNode(false); }}>
                {n}
              </li>
            ))}
          </ul>
        </div>
        <div className="panel rels-panel">
          <h3>Relationship Types</h3>
          <button className="btn btn-secondary" onClick={() => { setShowAddRel(true); setShowAddNode(false); }}>
            Add
          </button>
          <ul>
            {schema.relationships.map((r: any, idx: number) => (
              <li key={idx} onClick={() => { setSelectedRel(idx); setSelectedNode(null); setShowAddRel(false); }}>
                {r.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={`edit-pane scrollable${showEditPane ? '' : ' collapsed'}`} data-area="details">
        <div className="resize-handle-vertical" onMouseDown={onDetailMouseDown} />
        {selectedNode && !showAddNode && (
          <NodeTypeDetailsPanel
            name={selectedNode}
            data={schema.nodes[selectedNode]}
            grammarName={current}
            onUpdate={() => selectGrammar(current)}
          />
        )}
        {selectedRel !== null && !showAddRel && (
          <RelationshipTypeDetailsPanel
            index={selectedRel}
            data={schema.relationships[selectedRel]}
            grammarName={current}
            onUpdate={() => selectGrammar(current)}
            nodes={Object.keys(schema.nodes)}
          />
        )}
      </div>

      <FooterPane showPanel={showFooterPane} height={footerHeight} onHeightChange={setFooterHeight} minHeight={MIN_FOOTER_HEIGHT}>
        <div className="footer-resize-handle" onMouseDown={onFooterMouseDown} />
        <GrammarStatisticsPanel schema={schema} currentGrammarName={current} />
      </FooterPane>
    </div>
  );
};

export default GrammarPage;
