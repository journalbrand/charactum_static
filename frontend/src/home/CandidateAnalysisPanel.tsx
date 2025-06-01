/**
 * @file CandidateAnalysisPanel.tsx
 * @description Component for displaying statistical analysis of LLM-generated candidates using Plotly.js
 * @dependencies Node type from graph.ts, react-plotly.js
 */

import React, { useEffect, useState, useRef } from 'react';
import Plot from 'react-plotly.js';
import { Slider, Typography, Box } from '@mui/material';
import '../styles/main.scss';
import { Node, Link } from '../../types/graph';
import { getNodeColor } from '../utils/nodeColors';

// Remove PlotlyFont interface, let TypeScript infer or use Plotly's own types if available
// interface PlotlyFont {
//   family?: string;
//   size?: number;
//   color?: string;
// }

interface EmbeddingVisualization {
  x: number[];
  y: number[];
  labels: string[];
  cluster_assignments: number[];
}

interface DistributionStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
  q1: number;
  q3: number;
  histogram_data: {
    bins: number[];
    frequencies: number[];
  };
}

interface AnalysisResult {
  distances: { [key: string]: number };
  sorted_nodes: Array<[{ name: string; type: string; description: string }, number]>;
  statistics: DistributionStats;
  selected_indices: number[];
  visualizations: { [key: string]: string };
  embedding_viz: EmbeddingVisualization;
}

interface CandidateAnalysisPanelProps {
  candidates: Node[];
  relationshipContext?: {
    contextNode: Node;
    relationshipType: string;
    isOutgoing: boolean;
  };
  onApprove: (approvedCandidates: Node[], approvedRelationships: Link[]) => void;
  onReject: () => void;
}

const CandidateAnalysisPanel: React.FC<CandidateAnalysisPanelProps> = ({
  candidates,
  relationshipContext,
  onApprove,
  onReject
}) => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedRelationshipIds, setSelectedRelationshipIds] = useState<string[]>([]);
  const [numClusters, setNumClusters] = useState<number>(3);
  const [positionMode, setPositionMode] = useState<'distance' | 'order'>('distance');
  const [hoveredCandidateId, setHoveredCandidateId] = useState<string | null>(null); // For push-away effect
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({}); // For push-away effect

  useEffect(() => {
    // Clear refs when candidates change to prevent memory leaks with stale refs
    cellRefs.current = {};
    if (candidates.length > 0) {
      console.log('CandidateAnalysisPanel: Analyzing candidates:', {
        candidateCount: candidates.length,
        candidates: candidates.map(c => ({ id: c.id, name: c.name, type: c.type }))
      });
      setLoading(true);
      setError(null);
      fetch('/api/analysis/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          candidates,
          config: {
            num_clusters: numClusters
          }
        })
      })
        .then(async (res) => {
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Analysis failed: ${errorText}`);
          }
          return res.json();
        })
        .then((data) => {
          console.log('CandidateAnalysisPanel: Analysis results received:', {
            statistics: data.statistics,
            selectedIndices: data.selected_indices,
            nodeCount: data.sorted_nodes?.length
          });
          setAnalysisResult(data);
          if (data.selected_indices && data.sorted_nodes) {
            // Map the recommended nodes to their actual node objects
            const recommendedNodes = data.selected_indices.map(
              (index: number) => candidates.find(c => 
                c.name === data.sorted_nodes[index][0].name
              )
            ).filter(Boolean);
            
            console.log('CandidateAnalysisPanel: Setting recommended nodes:', {
              recommendedCount: recommendedNodes.length,
              recommendedNodes: recommendedNodes.map(n => n?.name)
            });
            
            setSelectedNodeIds(recommendedNodes.map(n => n!.id));
          }
        })
        .catch((err) => {
          console.error("CandidateAnalysisPanel: Error analyzing candidates:", err);
          setError(err.message || 'Failed to analyze candidates');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [candidates, numClusters]);

  const handleClusteringChange = (_: Event, value: number | number[]) => {
    const newValue = Array.isArray(value) ? value[0] : value;
    console.log('CandidateAnalysisPanel: Updating cluster count:', newValue);
    setNumClusters(newValue);
  };

  const handleToggleNode = (nodeId: string) => {
    console.log('CandidateAnalysisPanel: Toggling node selection:', {
      nodeId,
      currentlySelected: selectedNodeIds.includes(nodeId),
      node: candidates.find(c => c.id === nodeId)
    });
    setSelectedNodeIds(prev =>
      prev.includes(nodeId) ? prev.filter(item => item !== nodeId) : [...prev, nodeId]
    );
  };

  const handleToggleRelationship = (relationshipId: string) => {
    console.log('CandidateAnalysisPanel: Toggling relationship selection:', {
      relationshipId,
      currentlySelected: selectedRelationshipIds.includes(relationshipId)
    });
    setSelectedRelationshipIds(prev =>
      prev.includes(relationshipId) ? prev.filter(id => id !== relationshipId) : [...prev, relationshipId]
    );
  };

  const handleApprove = () => {
    console.log('CandidateAnalysisPanel: Starting approval process', {
      selectedNodeIds,
      relationshipContext,
      selectedNodeCount: selectedNodeIds.length
    });

    // Find the actual node objects that were selected
    const approvedNodes = candidates.filter(node => selectedNodeIds.includes(node.id));
    console.log('CandidateAnalysisPanel: Found approved nodes:', {
      approvedCount: approvedNodes.length,
      approvedNodes: approvedNodes.map(n => ({ id: n.id, name: n.name, type: n.type }))
    });

    // Generate relationships if we have context
    const approvedRelationships: Link[] = [];
    if (relationshipContext && approvedNodes.length > 0) {
      console.log('CandidateAnalysisPanel: Generating relationships with context:', {
        contextNode: {
          id: relationshipContext.contextNode.id,
          name: relationshipContext.contextNode.name,
          type: relationshipContext.contextNode.type
        },
        relationshipType: relationshipContext.relationshipType,
        isOutgoing: relationshipContext.isOutgoing
      });

      approvedNodes.forEach(node => {
        const relationship: Link = {
          id: `temp-${Math.random()}`, // This will be replaced by the backend
          type: relationshipContext.relationshipType,
          source: relationshipContext.isOutgoing ? relationshipContext.contextNode.id : node.id,
          target: relationshipContext.isOutgoing ? node.id : relationshipContext.contextNode.id
        };
        console.log('CandidateAnalysisPanel: Generated relationship:', {
          id: relationship.id,
          type: relationship.type,
          source: relationship.source,
          target: relationship.target,
          sourceNode: relationshipContext.isOutgoing ? relationshipContext.contextNode.name : node.name,
          targetNode: relationshipContext.isOutgoing ? node.name : relationshipContext.contextNode.name
        });
        approvedRelationships.push(relationship);
      });
    } else {
      console.log('CandidateAnalysisPanel: No relationship context available or no nodes approved', {
        hasContext: !!relationshipContext,
        approvedNodeCount: approvedNodes.length
      });
    }

    console.log('CandidateAnalysisPanel: Finalizing approval', {
      approvedNodeCount: approvedNodes.length,
      approvedRelationshipCount: approvedRelationships.length,
      approvedNodes: approvedNodes.map(n => ({ id: n.id, name: n.name, type: n.type })),
      approvedRelationships: approvedRelationships.map(r => ({
        type: r.type,
        source: r.source,
        target: r.target
      }))
    });

    onApprove(approvedNodes, approvedRelationships);
  };

  const getThemeColors = () => ({
    text: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(),
    background: getComputedStyle(document.documentElement).getPropertyValue('--bg-elevated').trim(),
    accent: getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim(),
    grid: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim(),
  });

  // Common font configuration for plots
  const getThemeFonts = (color: string) => ({
    family: 'Inter, system-ui, sans-serif',
    size: 12,
    color,
  });

  const renderScatterPlot = () => {
    if (!analysisResult?.embedding_viz) return null;
    const { x, y, labels, cluster_assignments } = analysisResult.embedding_viz;
    const colors = getThemeColors();
    const fonts = getThemeFonts(colors.text);
    
    return (
      <Plot
        data={[
          {
            x,
            y,
            mode: 'markers',
            type: 'scatter',
            marker: {
              size: 12,
              color: cluster_assignments,
              colorscale: 'Viridis',
              colorbar: {
                title: 'Cluster',
                thickness: 15,
                len: 0.5,
                y: 0.5,
                titlefont: fonts as any,
                tickfont: fonts as any
              }
            },
            text: labels,
            hoverinfo: 'text',
            name: 'Candidates'
          }
        ]}
        layout={{
          width: 400,
          height: 300,
          margin: { l: 50, r: 50, t: 40, b: 50 },
          title: {
            text: 'Semantic Similarity Map',
            font: { ...fonts, size: 14 } as any
          },
          xaxis: { 
            title: 'First Principal Component',
            gridcolor: colors.grid,
            zerolinecolor: colors.grid,
            tickfont: fonts as any,
            titlefont: fonts as any
          },
          yaxis: { 
            title: 'Second Principal Component',
            gridcolor: colors.grid,
            zerolinecolor: colors.grid,
            tickfont: fonts as any,
            titlefont: fonts as any
          },
          plot_bgcolor: colors.background,
          paper_bgcolor: colors.background,
          font: fonts as any,
          showlegend: false
        }}
        config={{
          displayModeBar: false, // Hide the modebar for cleaner look
          responsive: true
        }}
      />
    );
  };

  const renderHistogram = () => {
    if (!analysisResult?.statistics?.histogram_data) return null;
    const { bins, frequencies } = analysisResult.statistics.histogram_data;
    const colors = getThemeColors();
    const fonts = getThemeFonts(colors.text);
    
    return (
      <Plot
        data={[
          {
            type: 'bar',
            x: bins.slice(0, -1),
            y: frequencies,
            name: 'Frequency',
            marker: {
              color: colors.accent,
              opacity: 0.7
            }
          }
        ]}
        layout={{
          width: 300,
          height: 200,
          margin: { l: 50, r: 20, t: 40, b: 50 },
          title: {
            text: 'Distance Distribution',
            font: { ...fonts, size: 14 } as any
          },
          xaxis: { 
            title: 'Semantic Distance',
            gridcolor: colors.grid,
            zerolinecolor: colors.grid,
            tickfont: fonts as any,
            titlefont: fonts as any
          },
          yaxis: { 
            title: 'Count',
            gridcolor: colors.grid,
            zerolinecolor: colors.grid,
            tickfont: fonts as any,
            titlefont: fonts as any
          },
          plot_bgcolor: colors.background,
          paper_bgcolor: colors.background,
          font: fonts as any,
          bargap: 0.1
        }}
        config={{
          displayModeBar: false,
          responsive: true
        }}
      />
    );
  };

  const renderBoxPlot = () => {
    if (!analysisResult?.sorted_nodes) return null;
    const distances = analysisResult.sorted_nodes.map(([_, distance]) => distance);
    const colors = getThemeColors();
    const fonts = getThemeFonts(colors.text);
    
    return (
      <Plot
        data={[
          {
            type: 'box',
            y: distances,
            name: 'Distribution',
            boxpoints: 'suspectedoutliers',
            marker: {
              color: colors.accent,
              opacity: 0.7
            },
            boxmean: true,
            line: { color: colors.accent },
            fillcolor: colors.background
          }
        ]}
        layout={{
          width: 300,
          height: 200,
          margin: { l: 50, r: 20, t: 40, b: 50 },
          title: {
            text: 'Distance Summary',
            font: { ...fonts, size: 14 } as any
          },
          yaxis: { 
            title: 'Semantic Distance',
            gridcolor: colors.grid,
            zerolinecolor: colors.grid,
            tickfont: fonts as any,
            titlefont: fonts as any
          },
          plot_bgcolor: colors.background,
          paper_bgcolor: colors.background,
          font: fonts as any,
          showlegend: false
        }}
        config={{
          displayModeBar: false,
          responsive: true
        }}
      />
    );
  };

  const renderStatistics = () => {
    if (!analysisResult?.statistics) return null;
    return (
      <div className="statistics-list">
        {Object.entries(analysisResult.statistics)
          .filter(([key]) => key !== 'histogram_data')
          .map(([key, value]) => (
            <div key={key} className="statistics-item">
              <span className="statistics-label">{key}</span>
              <span className="statistics-value">
                {typeof value === 'number' ? value.toFixed(3) : value}
              </span>
            </div>
        ))}
      </div>
    );
  };

  // Constants for the push-away effect
  const PUSH_DISTANCE_PX = 20; // How far (in pixels) to push other cells
  const PUSH_INFLUENCE_PERCENT = 15; // Affect cells within this % distance on the axis
  const HOVER_SCALE = 1.1;

  const handleCellMouseEnter = (hoveredNodeId: string) => {
    setHoveredCandidateId(hoveredNodeId);
    const hoveredCell = cellRefs.current[hoveredNodeId];
    if (!hoveredCell || !analysisResult?.sorted_nodes) return;

    const hoveredPositionPercent = parseFloat(hoveredCell.style.left);

    analysisResult.sorted_nodes.forEach(([nodeData, _distance], index) => {
      const actualNode = candidates.find(c => c.name === nodeData.name);
      if (!actualNode) return;
      const currentCellId = actualNode.id;
      const cell = cellRefs.current[currentCellId];
      if (!cell) return;

      const cellPositionPercent = parseFloat(cell.style.left);

      if (currentCellId === hoveredNodeId) {
        cell.style.transform = `translateX(-50%) scale(${HOVER_SCALE})`;
        cell.style.zIndex = '20';
      } else {
        const distanceBetweenCellsPercent = Math.abs(cellPositionPercent - hoveredPositionPercent);
        let translateXPx = 0;

        if (distanceBetweenCellsPercent < PUSH_INFLUENCE_PERCENT && distanceBetweenCellsPercent > 0.01) { // Avoid pushing self
          if (cellPositionPercent < hoveredPositionPercent) {
            translateXPx = -PUSH_DISTANCE_PX;
          } else {
            translateXPx = PUSH_DISTANCE_PX;
          }
          cell.style.transform = `translateX(calc(-50% + ${translateXPx}px))`;
          cell.style.zIndex = '0';
        } else {
          cell.style.transform = 'translateX(-50%)'; // Reset to normal if not pushed
          cell.style.zIndex = '1';
        }
      }
    });
  };

  const handleCellMouseLeave = () => {
    setHoveredCandidateId(null);
    Object.values(cellRefs.current).forEach(cell => {
      if (cell) {
        cell.style.transform = 'translateX(-50%)'; // Base transform
        cell.style.zIndex = '1'; // Base z-index
      }
    });
  };

  const renderCandidatesDistribution = () => {
    if (!analysisResult) return null;

    if (positionMode === 'order') {
      const total = candidates.length;
      const step = total > 1 ? 100 / (total - 1) : 0;

      const orderedCandidates = candidates.map((cand, index) => ({
        node: { name: cand.name, type: cand.type, description: cand.description },
        actualNode: cand,
        distance: analysisResult.distances[cand.name],
        isRecommended: analysisResult.selected_indices.includes(index),
        position: total > 1 ? index * step : 50
      }));

      return (
        <div className="candidates-distribution">
          <div className="distribution-axis">LLM Order</div>
          <div className="distribution-scale">
            <div className="scale-marker min" style={{ left: '0%' }}>1</div>
            <div className="scale-marker max" style={{ left: '100%' }}>{total}</div>
          </div>

          <div className="distribution-plot">
            <div className="candidates-cells">
              {orderedCandidates.map(({ node, actualNode, position }) => (
                <div
                  key={actualNode.id}
                  ref={el => {
                    if (el) cellRefs.current[actualNode.id] = el;
                    else delete cellRefs.current[actualNode.id];
                  }}
                  className={`candidate-cell ${selectedNodeIds.includes(actualNode.id) ? 'selected' : ''} ${hoveredCandidateId === actualNode.id ? 'is-hovered' : ''}`}
                  style={{
                    left: `${position}%`,
                    '--candidate-color': getNodeColor(node.type)
                  } as React.CSSProperties}
                  title={`${node.name}: ${node.description}`}
                  onMouseEnter={() => handleCellMouseEnter(actualNode.id)}
                  onMouseLeave={handleCellMouseLeave}
                >
                  <label className="cell-content">
                    <input
                      type="checkbox"
                      checked={selectedNodeIds.includes(actualNode.id)}
                      onChange={() => handleToggleNode(actualNode.id)}
                      className="candidate-checkbox"
                    />
                    <div className="cell-info">
                      <span className="cell-name">{node.name}</span>
                    </div>
                    <div className="cell-tooltip">{node.description}</div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (!analysisResult.sorted_nodes || !analysisResult.statistics) return null;

    const { min, max, q1, q3, median } = analysisResult.statistics;
    const range = max - min;

    const sortedCandidates = analysisResult.sorted_nodes
      .map(([nodeData, distance], index) => ({
        node: nodeData,
        distance,
        actualNode: candidates.find(c => c.name === nodeData.name),
        isRecommended: analysisResult.selected_indices.includes(index),
        position: ((distance - min) / range) * 100
      }))
      .filter(item => item.actualNode);

    return (
      <div className="candidates-distribution">
        <div className="distribution-axis">Distance from Context</div>
        <div className="distribution-scale">
          <div className="scale-marker min" style={{ left: '0%' }}>{min.toFixed(3)}</div>
          <div className="scale-marker q1" style={{ left: `${((q1 - min) / range) * 100}%` }}>{q1.toFixed(3)}</div>
          <div className="scale-marker median" style={{ left: `${((median - min) / range) * 100}%` }}>{median.toFixed(3)}</div>
          <div className="scale-marker q3" style={{ left: `${((q3 - min) / range) * 100}%` }}>{q3.toFixed(3)}</div>
          <div className="scale-marker max" style={{ left: '100%' }}>{max.toFixed(3)}</div>
        </div>

        <div className="distribution-plot">
          {/* Add region backgrounds */}
          <div className="region-background strong" />
          <div className="region-background medium" />
          <div className="region-background weak" />

          {/* Add region indicators */}
          <div className="distribution-regions">
            <div className="region-indicator strong" data-label="Strong Match" />
            <div className="region-indicator medium" data-label="Medium Match" />
            <div className="region-indicator weak" data-label="Weak Match" />
          </div>

          <div className="box-plot">
            <div className="box"
              style={{
                left: `${((q1 - min) / range) * 100}%`,
                width: `${((q3 - q1) / range) * 100}%`
              }}
            >
              <div className="median-line"
                style={{
                  left: `${((median - q1) / (q3 - q1)) * 100}%`
                }}
              />
            </div>
            <div className="whisker left"
              style={{
                left: '0%',
                width: `${((q1 - min) / range) * 100}%`
              }}
            />
            <div className="whisker right"
              style={{
                left: `${((q3 - min) / range) * 100}%`,
                width: `${((max - q3) / range) * 100}%`
              }}
            />
          </div>

          <div className="candidates-cells">
            {sortedCandidates.map(({ node, distance, actualNode, position }) => (
              <div
                key={actualNode!.id}
                ref={el => {
                  if (el) cellRefs.current[actualNode!.id] = el;
                  else delete cellRefs.current[actualNode!.id];
                }}
                className={`candidate-cell ${selectedNodeIds.includes(actualNode!.id) ? 'selected' : ''} ${hoveredCandidateId === actualNode!.id ? 'is-hovered' : ''}`}
                style={{
                  left: `${position}%`,
                  '--candidate-color': getNodeColor(node.type)
                } as React.CSSProperties}
                title={`${node.name}: ${node.description} (Distance: ${distance.toFixed(3)})`}
                onMouseEnter={() => handleCellMouseEnter(actualNode!.id)}
                onMouseLeave={handleCellMouseLeave}
              >
                <label className="cell-content">
                  <input
                    type="checkbox"
                    checked={selectedNodeIds.includes(actualNode!.id)}
                    onChange={() => handleToggleNode(actualNode!.id)}
                    className="candidate-checkbox"
                  />
                  <div className="cell-info">
                    <span className="cell-name">{node.name}</span>
                  </div>
                  <div className="cell-tooltip">{node.description}</div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="candidate-stats-panel">
      <h3>Candidate Analysis</h3>
      <div className="stats-content">
        {loading && <p>Analyzing candidates…</p>}
        {error && <div className="error">{error}</div>}
        {analysisResult && (
          <>
            <div className="visualization-container">
              <div className="plot-container cluster-display">
                {renderScatterPlot()}
                <div className="cluster-slider">
                  <Typography variant="caption">
                    Number of Clusters: {numClusters}
                  </Typography>
                  <Slider
                    orientation="vertical"
                    sx={{ height: '100%' }}
                    value={numClusters}
                    onChange={handleClusteringChange}
                    step={1}
                    marks
                    min={2}
                    max={10}
                    size="small"
                  />
                </div>
              </div>
              <div className="plot-container">
                <div className="plot-stack">
                  {renderHistogram()}
                  {renderBoxPlot()}
                </div>
              </div>
            </div>

            <div className="candidates-panel">
              <div className="candidates-container">
                <h4>Candidates Distribution</h4>
                <div className="order-toggle">
                  <button
                    type="button"
                    className={`btn ${positionMode === 'distance' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPositionMode('distance')}
                  >
                    Distance
                  </button>
                  <button
                    type="button"
                    className={`btn ${positionMode === 'order' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPositionMode('order')}
                  >
                    LLM Order
                  </button>
                </div>
                {renderCandidatesDistribution()}
              </div>
            </div>

            {relationshipContext && (
              <div className="relationship-context">
                <h4>Relationship Context</h4>
                <p>
                  {relationshipContext.isOutgoing ? 'Outgoing' : 'Incoming'} relationship from node: {relationshipContext.contextNode.name}
                </p>
              </div>
            )}

            <div className="actions">
              <button
                className="btn-primary"
                onClick={handleApprove}
                disabled={selectedNodeIds.length === 0}
              >
                Approve Selected
              </button>
              <button className="btn-secondary" onClick={onReject}>
                Reject All
              </button>
            </div>
          </>
        )}
        {!loading && !error && !analysisResult && <p>No candidates to analyze.</p>}
      </div>
    </div>
  );
};

export default CandidateAnalysisPanel; 
