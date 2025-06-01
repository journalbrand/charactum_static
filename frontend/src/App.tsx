import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import './styles/main.scss'
import AddNodePanel from './home/AddNodePanel'
import ContextPanel from './home/ContextPanel'
import Graph from './home/Graph'
import type { Node } from './types/graph'
import {
  GraphData,
  Link,
  CandidateNode,
  NodeType,
  RelationshipType,
  SchemaNodeType,
  SchemaRelationshipType,
  AllowedRelationshipSchema,
  GraphStatistics,
} from './types/graph'
import Header from './home/Header'
import FooterPane from './home/FooterPane'
import AddRelationshipPanel from './home/AddRelationshipPanel'
import GraphStatisticsPanel from './home/GraphStatisticsPanel'
import GenerateRelatedNodesPanel from './home/GenerateRelatedNodesPanel'
import GraphService from './services/GraphService'
import CandidateAnalysisPanel from './home/CandidateAnalysisPanel'
import AccordionSection from './home/AccordionSection'
import SearchPanel from './home/SearchPanel'
import { useAppLayout, initialSectionsState } from './hooks/useAppLayout'
import { useGraphData } from './hooks/useGraphData'
import { useSchemaData } from './hooks/useSchemaData'
import { useSelectionManagement } from './hooks/useSelectionManagement'
import { useNodeCreationContext } from './hooks/useNodeCreationContext'
import { useCandidateProcessing } from './hooks/useCandidateProcessing'

function App() {
  console.log('App component rendering');
  
  const svgRef = useRef<SVGSVGElement>(null)
  // const fileInputRef = useRef<HTMLInputElement>(null); // Commented out for static demo
  const [appActionError, setAppActionError] = useState<string | null>(null);

  const {
    data,
    graphStats,
    loading: graphDataLoading,
    error: graphDataError,
    fetchDataWithSchema,
    addNodeToState,
    addLinkToState,
    updateNodeInState,
    deleteNodeFromState,
    deleteLinkFromState,
    clearGraphDataState,
    fetchGraphStatistics,
    setGraphError,
  } = useGraphData();

  const {
    nodeTypes,
    relationshipTypes,
    allowedRelationshipSchemas,
    loading: schemaLoading,
    error: schemaError,
    fetchSchema
  } = useSchemaData();

  const {
    showCreatePane,
    setShowCreatePane,
    showEditPane,
    setShowEditPane,
    showFooterPane,
    setShowFooterPane,
    sectionsOpen,
    toggleSection,
    collapseAllSections,
    expandAllSections,
    adjustLayoutForNodeSelection,
    openStatisticsPanel,
    setSectionsOpen
  } = useAppLayout();

  const DEFAULT_DETAILS_WIDTH = 450;
  const MIN_DETAILS_WIDTH = 250;
  const [detailsWidth, setDetailsWidth] = useState<number>(DEFAULT_DETAILS_WIDTH);
  const DEFAULT_CREATE_WIDTH = 450;
  const MIN_CREATE_WIDTH = 250;
  const [createWidth, setCreateWidth] = useState<number>(DEFAULT_CREATE_WIDTH);
  
  const {
    selection,
    focusNodeId,
    handleSelect,
    handleSearchSelect,
    clearSelection,
    setFocusNodeId
  } = useSelectionManagement({ 
    nodes: data.nodes, 
    adjustLayoutForNodeSelection 
  });

  const {
    nodeCreationContext,
    startNodeCreation,
    cancelNodeCreation,
    completeNodeCreation
  } = useNodeCreationContext();

  const {
    candidatesForReview,
    candidateAnalysis,
    candidateRelationshipContext,
    handleCandidatesGenerated,
    handleCandidatesApproved,
    handleCandidatesRejected
  } = useCandidateProcessing({
    addNodeToState,
    addLinkToState,
    setAppActionError: setAppActionError
  });

  useEffect(() => {
    if (!showEditPane) {
      setDetailsWidth(DEFAULT_DETAILS_WIDTH);
    }
  }, [showEditPane]);

  useEffect(() => {
    if (!showCreatePane) {
      setCreateWidth(DEFAULT_CREATE_WIDTH);
    }
  }, [showCreatePane]);

  useEffect(() => {
    if (selection) {
      setShowEditPane(true);
    } else {
      // Keep the details pane state as is but reset sections
      setSectionsOpen(initialSectionsState);
    }
  }, [selection, setShowEditPane, setSectionsOpen]);

  useEffect(() => {
    if (candidatesForReview && candidatesForReview.length > 0) {
      openStatisticsPanel();
    }
  }, [candidatesForReview, openStatisticsPanel]);

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

  const DEFAULT_FOOTER_HEIGHT = 0.3 * window.innerHeight;
  const MIN_FOOTER_HEIGHT = 100;
  const [footerHeight, setFooterHeight] = useState<number>(DEFAULT_FOOTER_HEIGHT);

  const handleAddNode = async (nodeData: { type: NodeType; name: string; description: string }): Promise<Node> => {
    console.warn("handleAddNode disabled in static mode");
    // Simulate adding a node for UI consistency if needed, but it won't persist
    const mockNode = { id: `mock-${Date.now()}`, elementId: `mock-${Date.now()}`, ...nodeData };
    // addNodeToState(mockNode); // Optionally add to local state for immediate UI feedback
    // await fetchGraphStatistics(); // Recalculate stats if added locally
    return Promise.resolve(mockNode as Node);
    // setAppActionError(null);
    // try {
    //   const newNode = await GraphService.createNode(nodeData);
    //   if (nodeCreationContext) {
    //     nodeCreationContext.onComplete(newNode);
    //     completeNodeCreation(newNode);
    //   }
    //   addNodeToState(newNode);
    //   await fetchGraphStatistics();
    //   return newNode;
    // } catch (error) {
    //   console.error('Failed to create node:', error);
    //   const message = error instanceof Error ? error.message : 'Failed to create node';
    //   setAppActionError(message);
    //   setGraphError(message);
    //   throw error;
    // }
  };

  const handleAddRelationship = async (startNode: Node, endNode: Node, relationshipType: RelationshipType, isOutgoing: boolean) => {
    console.warn("handleAddRelationship disabled in static mode");
    // Simulate for UI if needed
    const mockRelationship = { 
    //   id: `mock-rel-${Date.now()}`, 
    //   source: isOutgoing ? startNode.id : endNode.id, 
    //   target: isOutgoing ? endNode.id : startNode.id, 
    //   type: relationshipType 
    };
    // addLinkToState(mockRelationship as Link);
    // await fetchGraphStatistics();
    return Promise.resolve();
    // setAppActionError(null);
    // try {
    //   const relationshipData = {
    //     type: relationshipType,
    //     source: isOutgoing ? startNode.id : endNode.id,
    //     target: isOutgoing ? endNode.id : startNode.id
    //   };
    //   const newRelationship = await GraphService.createRelationship(relationshipData);
    //   addLinkToState(newRelationship);
    //   await fetchGraphStatistics();
    // } catch (error) {
    //   console.error('Error creating relationship:', error);
    //   const message = error instanceof Error ? error.message : 'Failed to create relationship';
    //   setAppActionError(message);
    //   setGraphError(message);
    // }
  };

  const handleNodeUpdate = async (updated: Node) => {
    console.warn("handleNodeUpdate disabled in static mode");
    // updateNodeInState(updated); // Optionally update local state
    // if (selection && selection.type === 'node' && (selection.data as Node).id === updated.id) {
    //   handleSelect(updated, 'node');
    // }
    // await fetchGraphStatistics();
    return Promise.resolve();
    // setAppActionError(null);
    // try {
    //   await GraphService.updateNode(updated.id, updated);
    //   updateNodeInState(updated);
    //   if (selection && selection.type === 'node' && (selection.data as Node).id === updated.id) {
    //     handleSelect(updated, 'node');
    //   }
    //   await fetchGraphStatistics();
    // } catch (error) {
    //   console.error('Error updating node:', error);
    //   const message = error instanceof Error ? error.message : 'Failed to update node';
    //   setAppActionError(message);
    //   setGraphError(message);
    // }
  };

  const handleNodeDelete = async () => {
    console.warn("handleNodeDelete disabled in static mode");
    // if (!selection || selection.type !== 'node') return;
    // const nodeToDelete = selection.data as Node;
    // deleteNodeFromState(nodeToDelete.id);
    // await fetchGraphStatistics();
    // clearSelection();
    return Promise.resolve();
    // setAppActionError(null);
    // try {
    //   await GraphService.deleteNode(nodeToDelete.id);
    //   deleteNodeFromState(nodeToDelete.id);
    //   await fetchGraphStatistics();
    //   clearSelection();
    // } catch (error) {
    //   console.error('Error handling node deletion:', error);
    //   const message = error instanceof Error ? error.message : 'Failed to delete node';
    //   setAppActionError(message);
    //   setGraphError(message);
    // }
  };

  const handleRelationshipDelete = async () => {
    console.warn("handleRelationshipDelete disabled in static mode");
    // if (!selection || selection.type !== 'relationship') return;
    // const linkToDelete = selection.data as Link;
    // deleteLinkFromState(linkToDelete.id);
    // await fetchGraphStatistics();
    // clearSelection();
    return Promise.resolve();
    // setAppActionError(null);
    // try {
    //   await GraphService.deleteRelationship(linkToDelete.id);
    //   deleteLinkFromState(linkToDelete.id);
    //   await fetchGraphStatistics();
    //   clearSelection();
    // } catch (error) {
    //   console.error('Error handling relationship deletion:', error);
    //   const message = error instanceof Error ? error.message : 'Failed to delete relationship';
    //   setAppActionError(message);
    //   setGraphError(message);
    // }
  };

  const handleClearDatabase = async () => {
    console.warn("handleClearDatabase disabled in static mode");
    // clearGraphDataState(); // Clear local state
    // await fetchGraphStatistics(); // Recalculate (should be 0)
    return Promise.resolve();
    // setAppActionError(null);
    // try {
    //   await GraphService.clearDatabase();
    //   clearGraphDataState();
    //   console.log("Database cleared and local state reset.");
    //   await fetchGraphStatistics();
    // } catch (error) {
    //   console.error("Error clearing database:", error);
    //   const message = error instanceof Error ? error.message : 'Failed to clear database';
    //   setAppActionError(message);
    //   setGraphError(message);
    // }
  };

  const handleExportDatabase = async () => {
    console.warn("handleExportDatabase disabled in static mode");
    return Promise.resolve();
  };

  const triggerImport = () => {
    console.warn("triggerImport disabled in static mode");
    // Original line: fileInputRef.current?.click(); 
    // fileInputRef is now commented out.
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.warn("handleFileSelected disabled in static mode");
    // if (e.target.files && e.target.files[0]) {
    //   const file = e.target.files[0];
    //   setAppActionError(null);
    //   try {
    //     await GraphService.importDatabase(file, true); // Assuming clear before import
    //     // After import, refetch data to update the view
    //     await fetchDataWithSchema(); // This will now fetch from static or updated static if import was somehow mocked
    //     console.log("Static data import simulated/processed.");
    //   } catch (error) {
    //     console.error("Error importing database:", error);
    //     const message = error instanceof Error ? error.message : 'Failed to import database';
    //     setAppActionError(message);
    //     setGraphError(message);
    //   }
    // }
  };

  useEffect(() => {
    // Fetch static graph data on initial mount
    fetchDataWithSchema(undefined); // Pass undefined as schemaNodeTypes is optional
    // We might still want to fetch schema for type information display, if any part of UI uses it.
    fetchSchema();
  }, [fetchDataWithSchema, fetchSchema]);

  useEffect(() => {
    console.log('Current graph data state (nodes, links):', data.nodes.length, data.links.length);
  }, [data]);

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
    if (showFooterPane) {
      setFooterHeight(DEFAULT_FOOTER_HEIGHT);
    }
  }, [showFooterPane]);

  const appIsLoading = schemaLoading || graphDataLoading;
  const topLevelError = schemaError || graphDataError || appActionError;
  const appVersion = import.meta.env.VITE_APP_VERSION || '0.0.1';

  return (
    <div
      className="App"
      style={{

        gridTemplateColumns: `${showCreatePane ? createWidth + 'px' : '0px'} 1fr ${showEditPane ? detailsWidth + 'px' : '0px'}`,
        gridTemplateRows: `auto 1fr ${showFooterPane ? 'var(--footer-pane-height, 30vh)' : '0px'}`,
        '--right-pane-width': `${detailsWidth}px`,
        '--left-pane-width': `${createWidth}px`,

        '--footer-pane-height': `${footerHeight}px`

      } as React.CSSProperties}
    >
      <Header
        isDarkMode={false}
        onThemeToggle={() => {}}
        onExport={handleExportDatabase}
        onImport={triggerImport}
        onClear={handleClearDatabase}
        onToggleCreate={() => setShowCreatePane(v => !v)}
        onToggleDetails={() => setShowEditPane(v => !v)}
        onToggleFooter={() => setShowFooterPane(v => !v)}
        onCollapseAll={collapseAllSections}
        onExpandAll={expandAllSections}
      />
      {/* <input
        type="file"
        ref={fileInputRef} // ref would cause error if fileInputRef is not defined
        style={{ display: 'none' }}
        accept="application/json"
        onChange={handleFileSelected}
      /> */}

      {topLevelError ? (
        <div className="error">Error: {topLevelError}</div>
      ) : appIsLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div
            className={`create-pane scrollable${showCreatePane ? '' : ' collapsed'}`}
            data-area="create"
          >
            <div
              className="resize-handle-vertical"
              onMouseDown={onCreateMouseDown}
              style={{ right: '-3px', left: 'auto' }}
            />
            <div className="create-forms">
              {selection?.type === 'node' && !nodeCreationContext && (
                <AccordionSection
                  title="Add Relationship"
                  open={sectionsOpen.addRelationship}
                  onToggle={() => toggleSection('addRelationship')}
                >
                  <AddRelationshipPanel
                    startNode={selection.data as Node}
                    nodeTypes={nodeTypes}
                    nodes={data.nodes}
                    allowedRelationshipSchemas={allowedRelationshipSchemas}
                    onSubmit={handleAddRelationship}
                    onCancel={() => clearSelection()}
                    onCreateNode={handleAddNode}
                    onStartNodeCreation={startNodeCreation}
                    onCancelNodeCreation={cancelNodeCreation}
                  />
                </AccordionSection>
              )}
              {(!selection || nodeCreationContext) && (
                <AccordionSection
                  title="Add Node"
                  open={sectionsOpen.addNode}
                  onToggle={() => toggleSection('addNode')}
                >
                  <AddNodePanel
                    onSubmit={handleAddNode}
                    nodeTypes={nodeTypes}
                    relationshipMode={nodeCreationContext}
                  />
                </AccordionSection>
              )}
              {selection?.type === 'node' && !nodeCreationContext && (
                <AccordionSection
                  title="Generate Related Nodes"
                  open={sectionsOpen.generateRelated}
                  onToggle={() => toggleSection('generateRelated')}
                >
                  <GenerateRelatedNodesPanel
                    onCandidatesGenerated={(genNodes, relCtx) => {
                      const adaptedRelCtx = relCtx ? {
                        sourceNode: relCtx.contextNode,
                        relationshipType: relCtx.relationshipType,
                        isOutgoing: relCtx.isOutgoing
                      } : undefined;
                      handleCandidatesGenerated(genNodes as CandidateNode[], adaptedRelCtx);
                    }}
                    onCandidatesApproved={(approvedNodes, approvedRelationships, instruction) => {
                      console.warn('GenerateRelatedNodesPanel.onCandidatesApproved called directly. Instruction:', instruction, 'Nodes:', approvedNodes, 'Rels:', approvedRelationships);
                    }}
                    onCandidatesRejected={() => {
                      console.log('GenerateRelatedNodesPanel locally rejected/cancelled candidate generation.');
                    }}
                    contextNode={selection.data as Node}
                  />
                </AccordionSection>
              )}
            </div>
          </div>

          <div className="graph-area" data-area="graph">
            <Graph
              svgRef={svgRef}
              nodes={data.nodes}
              links={data.links}
              selectedNodeId={selection?.type === 'node' ? (selection.data as Node).id : undefined}
              focusNodeId={focusNodeId}
              onNodeClick={(node: Node) => {
                if (nodeCreationContext) return;
                handleSelect(node, 'node');
              }}
              onLinkClick={(link: Link) => {
                if (nodeCreationContext) return;
                handleSelect(link, 'relationship');
              }}
              className="graph-container"
            />
          </div>

          <div
            className={`edit-pane scrollable${showEditPane ? '' : ' collapsed'}`}
            data-area="details"
          >
            <div
              className="resize-handle-vertical"
              onMouseDown={onDetailMouseDown}
            />

            <AccordionSection
              title="Search"
              open={sectionsOpen.search}
              onToggle={() => toggleSection('search')}
            >
              <SearchPanel
                nodes={data.nodes}
                nodeTypes={nodeTypes}
                selectedNodeId={selection?.type === 'node' ? (selection.data as Node).id : undefined}
                onSelect={handleSearchSelect}
              />
            </AccordionSection>

            {selection && (
              <AccordionSection
                title="Selected Node"
                open={sectionsOpen.selectedNode}
                onToggle={() => toggleSection('selectedNode')}
              >
                <ContextPanel
                  selection={selection}
                  onClose={() => {
                    if (nodeCreationContext) return;
                    clearSelection();
                  }}
                  onNodeDelete={handleNodeDelete}
                  onNodeUpdate={handleNodeUpdate}
                  onRelationshipDelete={handleRelationshipDelete}
                  schema={{ nodeTypes, relationshipTypes }}
                />
              </AccordionSection>
            )}

              <AccordionSection
                title="Search"
                open={sectionsOpen.search}
                onToggle={() => toggleSection("search")}
              >
                <SearchPanel
                  nodes={data.nodes}
                  nodeTypes={nodeTypes}
                  selectedNodeId={selection?.type === "node" ? (selection.data as Node).id : undefined}
                  onSelect={handleSearchSelect}
                />
              </AccordionSection>

          </div>
        </>
      )}
      <FooterPane
        showPanel={showFooterPane}
        appVersion={appVersion}
        height={footerHeight}
        onHeightChange={setFooterHeight}
        minHeight={MIN_FOOTER_HEIGHT}
      >
        {candidatesForReview && candidatesForReview.length > 0 ? (
            <CandidateAnalysisPanel
              candidates={candidatesForReview as Node[]}
              relationshipContext={candidateRelationshipContext ? {
                  contextNode: candidateRelationshipContext.sourceNode,
                  relationshipType: candidateRelationshipContext.relationshipType,
                  isOutgoing: candidateRelationshipContext.isOutgoing
                } : undefined
              }
              onApprove={handleCandidatesApproved}
              onReject={handleCandidatesRejected}
            />
          ) : graphStats ? (
            <GraphStatisticsPanel
              totalNodes={graphStats.total_nodes}
              totalRelationships={graphStats.total_relationships}
              averageDegree={graphStats.average_degree}
              nodeTypeDistribution={graphStats.node_type_distribution}
              relationshipTypeDistribution={graphStats.relationship_type_distribution}
            />
          ) : (
            <div className="basic-stats">
              <h3>Graph Statistics</h3>
              <div className="stats-content">
                <div className="stat-item">
                  <span className="stat-label">Nodes:</span>
                  <span className="stat-value">{data.nodes.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Relationships:</span>
                  <span className="stat-value">{data.links.length}</span>
                </div>
              </div>
            </div>
          )}
      </FooterPane>
    </div>
  )
}

export default App 
