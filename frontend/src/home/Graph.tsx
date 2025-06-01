/**
 * @file Graph.tsx
 * @description Interactive graph visualization component using D3.js
 * @dependencies d3, graph.ts types
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as d3 from 'd3';
import '../styles/main.scss';
import { getNodeColor } from '../utils/nodeColors';
import { Node, Link, GraphData } from '../../types/graph';

const Graph: React.FC<GraphProps> = ({
  nodes,
  links,
  onNodeClick,
  onLinkClick,
  selectedNodeId,
  focusNodeId,
  width: propWidth,
  height: propHeight,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, node: null });
  const simulationRef = useRef<any>(null);
  const zoomRef = useRef<d3.ZoomBehavior<Element, unknown> | null>(null);
  const gRef = useRef<SVGGElement | null>(null);

  const getContainerDimensions = useCallback(() => {
    if (!containerRef.current) {
      return { width: 800, height: 600 };
    }
    const { width, height } = containerRef.current.getBoundingClientRect();
    return {
      width: propWidth || width,
      height: propHeight || height
    };
  }, [propWidth, propHeight]);

  useEffect(() => {
    if (!svgRef.current || !nodes.length) {
      return;
    }

    const { width, height } = getContainerDimensions();
    const svg = d3.select(svgRef.current);

    // Clear previous content
    svg.selectAll("*").remove();

    // Set SVG dimensions
    svg.attr("width", width)
       .attr("height", height);

    // First create the main group for zooming
    const g = svg.append("g")
      .attr("class", "zoom-group");
    gRef.current = g.node();

    // Then create zoom behavior with smoother transitions
    const zoom = d3.zoom()
      .scaleExtent([0.2, 2])
      .on("start", (event) => {
        // Only log and clear selection if it's a canvas drag, not a link click
        if (event.sourceEvent?.target.tagName === "svg" || event.sourceEvent?.target.classList.contains("zoom-group")) {
          console.log('Canvas drag started:', {
            transform: event.transform,
            sourceEvent: event.sourceEvent?.type
          });
          onNodeClick?.(null);
        }
      })
      .on("zoom", (event) => {
        console.log('Canvas being dragged:', {
          transform: event.transform,
          sourceEvent: event.sourceEvent?.type
        });
        g.attr("transform", event.transform);
      })
      .on("end", (event) => {
        console.log('Canvas drag ended:', {
          transform: event.transform,
          sourceEvent: event.sourceEvent?.type
        });
      });

    // Apply zoom behavior after g is created
    zoomRef.current = zoom;
    svg.call(zoom as any)
       .call(zoom.transform as any, d3.zoomIdentity.scale(0.8));

    // Create a map of node IDs to node objects for quick lookup
    const nodeMap = new Map(nodes.map(node => [node.id, node]));

    // Create simulation links that reference nodes by object
    const simulationLinks = links.map(link => ({
      source: nodeMap.get(link.source),
      target: nodeMap.get(link.target),
      type: link.type,
      properties: link.properties,
      originalLink: link // Keep reference to original link
    }));

    // Add arrow definitions for each relationship type
    const defs = svg.append("defs");
    
    // Add arrow markers for each relationship type
    const relationshipTypes = Array.from(new Set(links.map(l => l.type)));
    defs.selectAll("marker")
      .data(relationshipTypes)
      .join("marker")
      .attr("id", d => `arrowhead-${d}`)
      .attr("viewBox", "-10 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .attr("class", "arrow-marker")
      .append("path")
      .attr("d", "M -10,-5 L 0,0 L -10,5")
      .attr("fill", "var(--link-color)");

    // Initialize node positions and ensure frozen state is explicit
    nodes.forEach(node => {
      // Ensure fx/fy are explicitly null for unfrozen nodes
      (node as any).fx = (node as any).fx || null;
      (node as any).fy = (node as any).fy || null;

      // Set initial position if none exists
      if (!(node as any).x || !(node as any).y) {
        const angle = Math.random() * 2 * Math.PI;
        const radius = Math.min(width, height) / 3;
        (node as any).x = width / 2 + radius * Math.cos(angle);
        (node as any).y = height / 2 + radius * Math.sin(angle);
      }
    });

    // Enhanced force simulation - work with copied data
    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(simulationLinks as any)
        .id((d: any) => d.id)
        .distance(120))
      .force("charge", d3.forceManyBody()
        .strength(-400)
        .distanceMax(300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(60))
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05))
      .alphaMin(0.001)
      .alphaDecay(0.02);

    simulationRef.current = simulation;

    // Log initial node states after unfreezing
    console.log('Initial node states (after unfreezing):', nodes.map(node => ({
      name: node.name,
      isFrozen: (node as any).fx !== null || (node as any).fy !== null
    })));

    // Create link groups using original data
    const linkGroup = g.append("g")
      .selectAll(".link-group")
      .data(links)  // Use original links
      .join("g")
      .attr("class", "link-group")
      .on("click", (event, d) => {
        event.stopPropagation();
        onLinkClick?.(d);  // Pass original link
      });

    // Add hit detection paths (wider invisible paths for easier clicking)
    const linkHitbox = linkGroup.append("path")
      .attr("class", "link-hitbox")
      .on("mousedown", (event) => {
        // Stop the zoom behavior from capturing this event
        event.stopPropagation();
      })
      .on("mousemove", (event) => {
        // Stop the zoom behavior from capturing this event
        event.stopPropagation();
      })
      .on("mouseup", (event) => {
        // Stop the zoom behavior from capturing this event
        event.stopPropagation();
      });

    // Add the curved paths
    const linkPath = linkGroup.append("path")
      .attr("class", "link")
      .attr("marker-end", d => `url(#arrowhead-${d.type})`);

    // Add link labels
    const linkLabel = linkGroup.append("text")
      .attr("class", "link-label")
      .text(d => d.type);

    // Create node groups
    const node = g.append("g")
      .selectAll(".node")
      .data(nodes)
      .join("g")
      .attr("class", d => `node${(d as any).fx !== null ? ' frozen' : ''}`)
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClick?.(d);
      })
      .on("contextmenu", (event: any, d: any) => {
        event.preventDefault();
        setContextMenu({
          visible: true,
          x: event.pageX,
          y: event.pageY,
          node: d
        });
      });

    // Add circles to nodes
    node.append("circle")
      .attr("r", 25)
      .attr("class", d => d.type.toLowerCase())
      .style("--node-color", d => getNodeColor(d.type));

    // Add labels to nodes
    node.append("text")
      .attr("class", "node-label")
      .attr("dy", 35)
      .attr("text-anchor", "middle")
      .text(d => d.name)
      .each(function(d) {
        const text = d3.select(this);
        const words = d.name.split(/\s+/);
        if (words.length > 2) {
          text.text(words.slice(0, 2).join(" ") + "...");
        }
      });

    // Drag functions
    function dragstarted(event: any) {
      // Warm up the simulation but keep it gentle
      if (!event.active) simulation.alphaTarget(0.3).restart();
      
      // Store the initial offset between mouse and node position
      const dragOffset = {
        x: event.subject.x - event.x,
        y: event.subject.y - event.y
      };
      
      // Attach the offset to the event subject for use during drag
      event.subject.dragOffset = dragOffset;
      
      // Temporarily fix the node position during drag
      event.subject._tempfx = event.subject.fx;  // Store original frozen state
      event.subject._tempfy = event.subject.fy;
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;

      // Select the node being dragged so the details panel updates
      onNodeClick?.(event.subject);
      
      console.log('Drag started:', {
        node: event.subject.name,
        nodePosition: { x: event.subject.x, y: event.subject.y },
        mousePosition: { x: event.x, y: event.y },
        offset: dragOffset,
        wasFrozen: event.subject._tempfx !== null,
        allNodeStates: nodes.map(node => ({
          name: node.name,
          isFrozen: (node as any).fx !== null || (node as any).fy !== null
        }))
      });
    }

    function dragged(event: any) {
      // Update the fixed position based on mouse and offset
      event.subject.fx = event.x + event.subject.dragOffset.x;
      event.subject.fy = event.y + event.subject.dragOffset.y;
      
      // Let the simulation handle the updates
      if (simulation.alpha() < 0.1) {
        simulation.alpha(0.1).restart();
      }
    }

    function dragended(event: any) {
      // Clean up the temporary offset data
      delete event.subject.dragOffset;
      
      // Always freeze the node at its final position after drag
      event.subject.fx = event.x;
      event.subject.fy = event.y;
      
      // Clean up temp storage
      delete event.subject._tempfx;
      delete event.subject._tempfy;

      // Ensure the dragged node remains selected
      onNodeClick?.(event.subject);
      
      console.log('Drag ended:', {
        node: event.subject.name,
        nodePosition: { x: event.subject.x, y: event.subject.y },
        mousePosition: { x: event.x, y: event.y },
        isFrozen: true,  // Will always be true now
        allNodeStates: nodes.map(node => ({
          name: node.name,
          isFrozen: (node as any).fx !== null || (node as any).fy !== null
        }))
      });
    }

    // Update positions on each tick
    simulation.on("tick", () => {
      // Update link paths using simulation data for positions but original data for everything else
      linkPath.attr("d", d => {
        const simLink = simulationLinks.find(sl => 
          sl.originalLink.source === d.source && 
          sl.originalLink.target === d.target
        );
        if (!simLink?.source || !simLink?.target) return "";
        
        const dx = (simLink.target as any).x - (simLink.source as any).x;
        const dy = (simLink.target as any).y - (simLink.source as any).y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 2;
        return `M ${(simLink.source as any).x} ${(simLink.source as any).y} A ${dr} ${dr} 0 0 1 ${(simLink.target as any).x} ${(simLink.target as any).y}`;
      });

      // Update hit detection paths
      linkHitbox.attr("d", d => {
        const simLink = simulationLinks.find(sl => 
          sl.originalLink.source === d.source && 
          sl.originalLink.target === d.target
        );
        if (!simLink?.source || !simLink?.target) return "";
        
        const dx = (simLink.target as any).x - (simLink.source as any).x;
        const dy = (simLink.target as any).y - (simLink.source as any).y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 2;
        return `M ${(simLink.source as any).x} ${(simLink.source as any).y} A ${dr} ${dr} 0 0 1 ${(simLink.target as any).x} ${(simLink.target as any).y}`;
      });

      // Update link labels
      // First, sort labels by length so shorter labels get priority
      const labelData = linkLabel.nodes()
        .map((node, i) => ({
          node,
          text: d3.select(node).text(),
          index: i
        }))
        .sort((a, b) => a.text.length - b.text.length);  // Shorter labels first

      // Keep track of visible label bounds
      const visibleLabelBounds: Array<{x: number, y: number, width: number, height: number}> = [];

      // Process labels in order of length
      labelData.forEach(({node, text, index}) => {
        const path = linkPath.nodes()[index];
        if (!path) return;

        const pathLength = path.getTotalLength();
        const midPoint = path.getPointAtLength(pathLength / 2);
        
        // Get points for angle calculation
        const pointBefore = path.getPointAtLength((pathLength / 2) - 1);
        const pointAfter = path.getPointAtLength((pathLength / 2) + 1);
        
        // Calculate angle of the tangent
        const angle = Math.atan2(pointAfter.y - pointBefore.y, pointAfter.x - pointBefore.x) * 180 / Math.PI;
        const rotation = angle > 90 || angle < -90 ? angle + 180 : angle;

        // Get the actual text width for centering
        const labelWidth = (node as SVGTextElement).getComputedTextLength();
        const labelHeight = 16;  // Approximate text height

        // Calculate label bounds
        const bounds = {
          x: midPoint.x - labelWidth / 2,
          y: midPoint.y - labelHeight / 2,
          width: labelWidth,
          height: labelHeight
        };

        // Check for node overlaps
        const isOverlappingNode = nodes.some(n => {
          const dx = (n as any).x - midPoint.x;
          const dy = (n as any).y - midPoint.y;
          return Math.sqrt(dx * dx + dy * dy) < 25 + labelWidth / 2;  // Node radius + half label width
        });

        // Check for label overlaps
        const isOverlappingLabel = visibleLabelBounds.some(existing => {
          return !(bounds.x + bounds.width < existing.x ||
                  bounds.x > existing.x + existing.width ||
                  bounds.y + bounds.height < existing.y ||
                  bounds.y > existing.y + existing.height);
        });

        // Show or hide label based on overlaps
        const label = d3.select(node);
        if (!isOverlappingNode && !isOverlappingLabel) {
          label
            .style("opacity", 1)
            .attr("text-anchor", "middle")
            .attr("transform", `translate(${midPoint.x},${midPoint.y}) rotate(${rotation})`);
          
          // Add to visible labels if shown
          visibleLabelBounds.push(bounds);
        } else {
          label.style("opacity", 0);
        }
      });

      // Update node positions and frozen state
      node
        .attr("class", d => `node${(d as any).fx !== null ? ' frozen' : ''}`)
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Add click handler to reset zoom
    svg.on("dblclick.zoom", null);
    svg.on("dblclick", () => {
      svg.transition()
        .duration(750)
        .call(zoom.transform as any, d3.zoomIdentity.scale(0.8));
    });

    // Handle window resize
    const handleResize = () => {
      const { width: newWidth, height: newHeight } = getContainerDimensions();
      svg.attr("width", newWidth)
         .attr("height", newHeight);
      simulation.force("center", d3.forceCenter(newWidth / 2, newHeight / 2));
      simulation.alpha(0.3).restart();
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      simulation.stop();
      window.removeEventListener("resize", handleResize);
    };
  }, [nodes, links, getContainerDimensions]);

  // Highlight the selected node
  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .selectAll<SVGGElement, Node>('g.node')
      .classed('selected', d => !!selectedNodeId && d.id === selectedNodeId);
  }, [selectedNodeId]);

  // Center and zoom when focusing on a node
  useEffect(() => {
    if (!focusNodeId || !svgRef.current || !zoomRef.current) return;
    const node = nodes.find(n => n.id === focusNodeId);
    if (!node) return;

    // Freeze the node at its current position
    (node as any).fx = (node as any).x;
    (node as any).fy = (node as any).y;

    const { width, height } = getContainerDimensions();
    const zoomLevel = 1.2;
    const t = d3.zoomIdentity
      .translate(width / 2 - ((node as any).x ?? 0) * zoomLevel,
                height / 2 - ((node as any).y ?? 0) * zoomLevel)
      .scale(zoomLevel);

    d3.select(svgRef.current)
      .transition()
      .duration(750)
      .call(zoomRef.current.transform as any, t);
  }, [focusNodeId, nodes, getContainerDimensions]);

  // Handle toggling freeze state of the clicked node
  const handleToggleFreeze = () => {
    if (!contextMenu.node) return;
    
    const wasFrozen = (contextMenu.node as any).fx !== null;
    
    if (wasFrozen) {
      // Node is frozen, unfreeze it
      (contextMenu.node as any).fx = null;
      (contextMenu.node as any).fy = null;
      
      // Give the simulation a gentle push
      if (simulationRef.current) {
        simulationRef.current.alpha(0.1).restart();
      }
    } else {
      // Node is unfrozen, freeze it at current position
      (contextMenu.node as any).fx = (contextMenu.node as any).x;
      (contextMenu.node as any).fy = (contextMenu.node as any).y;
    }
    
    console.log('Node freeze toggled:', {
      node: (contextMenu.node as any).name,
      action: wasFrozen ? 'unfrozen' : 'frozen',
      allNodeStates: nodes.map(node => ({
        name: node.name,
        isFrozen: (node as any).fx !== null || (node as any).fy !== null
      }))
    });
    
    setContextMenu({ visible: false, x: 0, y: 0, node: null });
  };

  // Unfreeze all nodes except the one that was right-clicked
  const handleUnfreezeOthers = () => {
    if (!contextMenu.node) return;

    nodes.forEach(node => {
      if (node !== contextMenu.node) {
        (node as any).fx = null;
        (node as any).fy = null;
      }
    });

    console.log('Unfroze other nodes', {
      kept: (contextMenu.node as any).name,
      allNodeStates: nodes.map(node => ({
        name: node.name,
        isFrozen: (node as any).fx !== null || (node as any).fy !== null
      }))
    });

    // Restart simulation so nodes move again
    if (simulationRef.current) {
      simulationRef.current.alpha(0.1).restart();
    }

    setContextMenu({ visible: false, x: 0, y: 0, node: null });
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({ visible: false, x: 0, y: 0, node: null });
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`graph-container card ${className}`}>
      <svg ref={svgRef}></svg>
      {contextMenu.visible && (
        <div 
          className="context-menu"
          style={{ 
            left: contextMenu.x,
            top: contextMenu.y
          }}
        >
          <div
            onClick={handleToggleFreeze}
            className="context-menu-item"
          >
            {(contextMenu.node as any).fx !== null ? 'Unfreeze' : 'Freeze'}
          </div>
          <div
            onClick={handleUnfreezeOthers}
            className="context-menu-item"
          >
            Unfreeze all other nodes
          </div>
        </div>
      )}
    </div>
  );
};

export default Graph; 