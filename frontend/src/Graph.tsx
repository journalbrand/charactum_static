/**
 * @file Graph.tsx
 * @description Interactive graph visualization component using D3.js
 * @dependencies d3, graph.ts types
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { GraphProps, Node, Link } from '../../types/graph';
import './styles/global.css';
import { testCurvePath } from '../../curve_test';

const Graph: React.FC<GraphProps> = ({
  nodes,
  links,
  onNodeClick,
  onLinkClick,
  width: propWidth,
  height: propHeight,
  className = ''
}) => {
  // ... existing code ...

  useEffect(() => {
    console.log('Graph.tsx: useEffect triggered. svgRef.current:', svgRef.current, 'Nodes:', nodes.length, 'Links:', links.length);
    if (!svgRef.current) {
      console.error('Graph.tsx: svgRef.current is null or undefined. Cannot proceed with D3 rendering/clearing.');
      return;
    }

    const { width, height } = getContainerDimensions();
    const svg = d3.select(svgRef.current);

    // Clear previous content
    svg.selectAll("*").remove();

    // Set SVG dimensions
    svg.attr("width", width)
       .attr("height", height);

    // Add background rect to handle empty space clicks
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("click", () => {
        console.log('Graph: Background clicked - clearing selection');
        onNodeClick?.(null);
      });

    // If no nodes or links, display message and exit
    if (nodes.length === 0 && links.length === 0) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-size", "16px")
        .attr("class", "empty-graph-message")
        .text("Graph is empty");
      return;
    }

    // First create the main group for zooming
    const g = svg.append("g")
      .attr("class", "zoom-group");

    // ... rest of the existing code ...

    // Create link groups using original data
    const linkGroup = g.append("g")
      .selectAll(".link-group")
      .data(links)
      .join("g")
      .attr("class", "link-group")
      .on("click", (event, d) => {
        event.stopPropagation();
        console.log('Graph: Link clicked', {
          type: d.type,
          source: typeof d.source === 'string' ? d.source : d.source.id,
          target: typeof d.target === 'string' ? d.target : d.target.id,
          properties: d.properties
        });
        onLinkClick?.(d);
      });

    // ... existing code ...

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
        console.log('Graph: Node clicked', {
          id: d.id,
          name: d.name,
          type: d.type,
          description: d.description
        });
        onNodeClick?.(d);
      });
  }, [nodes, links, getContainerDimensions]);

  // ... rest of the existing code ...
}; 