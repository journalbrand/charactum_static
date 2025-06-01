/**
 * @file useGraphData.ts
 * @description Custom hook to manage the graph data (nodes, links) and statistics,
 *              fetching data for static demo or from API, and providing methods to manipulate local state.
 * @requires react
 * @uses ../types/graph Node, Link, GraphData, GraphStatistics, SchemaNodeType
 * @uses ../services/GraphService
 * @see ./useGraphData.test.ts Corresponding unit tests
 */
import { useState, useEffect, useCallback } from 'react';
import { GraphData, Node, Link, GraphStatistics, SchemaNodeType } from '../types/graph';
import GraphService from '../services/GraphService'; // Import GraphService

export interface UseGraphDataState {
  data: GraphData;
  graphStats: GraphStatistics | null;
  loading: boolean;
  error: string | null;
}

export interface GraphDataActions {
  fetchGraphStatistics: () => Promise<void>;
  addNodeToState: (node: Node) => void;
  addLinkToState: (link: Link) => void;
  updateNodeInState: (node: Node) => void;
  deleteNodeFromState: (nodeId: string) => void;
  deleteLinkFromState: (linkId: string) => void;
  setGraphError: (message: string | null) => void;
  setGraphData: (data: GraphData) => void;
  fetchDataWithSchema: (schemaNodeTypes?: SchemaNodeType[]) => Promise<void>;
  clearGraphDataState: () => void;
}

const initialGraphData: GraphData = { nodes: [], links: [] };

export function useGraphData(
  // props?: UseGraphDataProps // No longer taking props directly, App.tsx will call fetchDataWithSchema
): UseGraphDataState & GraphDataActions {
  const [data, setDataInternal] = useState<GraphData>(initialGraphData);
  const [graphStats, setGraphStatsInternal] = useState<GraphStatistics | null>(null);
  const [loading, setLoadingInternal] = useState<boolean>(true); // Initial loading true
  const [error, setErrorInternal] = useState<string | null>(null);

  const fetchGraphStatistics = useCallback(async () => {
    console.log('(useGraphData) Fetching graph statistics...');
    if (data.nodes.length > 0 || data.links.length > 0) {
      const stats: GraphStatistics = {
        total_nodes: data.nodes.length,
        total_relationships: data.links.length,
        average_degree: data.nodes.length > 0 ? (data.links.length * 2) / data.nodes.length : 0, // Basic average degree
        node_type_distribution: data.nodes.reduce((acc, node) => {
          acc[node.type] = (acc[node.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        relationship_type_distribution: data.links.reduce((acc, link) => {
          acc[link.type] = (acc[link.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };
      setGraphStatsInternal(stats);
      console.log('(useGraphData) Static graph statistics calculated:', stats);
    } else {
      setGraphStatsInternal({
        total_nodes: 0,
        total_relationships: 0,
        average_degree: 0,
        node_type_distribution: {},
        relationship_type_distribution: {},
      }); 
      console.log('(useGraphData) No data to calculate stats, set to default.');
    }
  }, [data]);


  const fetchDataWithSchema = useCallback(async (schemaNodeTypes?: SchemaNodeType[]) => {
    console.log('(useGraphData) Starting data fetch...');
    if (!schemaNodeTypes || schemaNodeTypes.length === 0) {
      console.log('(useGraphData) No schemaNodeTypes provided, fetching all static data.');
    }
    setLoadingInternal(true);
    setErrorInternal(null);
    try {
      const nodes = await GraphService.fetchAllNodes();
      const links = await GraphService.fetchAllRelationships();
      
      setDataInternal({ nodes, links });
      console.log(`(useGraphData) Static data loaded. Nodes: ${nodes.length}, Links: ${links.length}`);
      
      // Fetch/calculate statistics after data is loaded
      await fetchGraphStatistics();

    } catch (e) {
      console.error('(useGraphData) Failed to fetch static data:', e);
      setErrorInternal(e instanceof Error ? e.message : 'An unknown error occurred while fetching static data.');
      setDataInternal(initialGraphData); // Reset to initial on error
      setGraphStatsInternal(null);    // Reset stats on error
    } finally {
      setLoadingInternal(false);
    }
  }, [fetchGraphStatistics]); // fetchGraphStatistics is a dependency


  // Initial useEffect no longer calls a self-contained fetchDataAndStats.
  // App.tsx will be responsible for calling fetchDataWithSchema when schema is ready.
  // We can keep loading as true initially until App.tsx signals data fetch has started/completed.
  useEffect(() => {
    // Set loading to false initially only if no immediate fetch is triggered by this hook itself.
    // App.tsx will manage the overall loading state based on schema and then graph data.
    // For now, useGraphData's loading is true until fetchDataWithSchema is called and completes.
  }, []);


  const addNodeToState = useCallback((node: Node) => {
    setDataInternal(prev => ({ ...prev, nodes: [...prev.nodes, node] }));
  }, []);

  const addLinkToState = useCallback((link: Link) => {
    setDataInternal(prev => ({ ...prev, links: [...prev.links, link] }));
  }, []);

  const updateNodeInState = useCallback((node: Node) => {
    setDataInternal(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === node.id ? node : n),
    }));
  }, []);

  const deleteNodeFromState = useCallback((nodeId: string) => {
    setDataInternal(prev => ({
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      links: prev.links.filter(l => l.source !== nodeId && l.target !== nodeId),
    }));
  }, []);

  const deleteLinkFromState = useCallback((linkId: string) => {
    setDataInternal(prev => ({
      ...prev,
      links: prev.links.filter(l => l.id !== linkId),
    }));
  }, []);

  const setGraphError = useCallback((message: string | null) => {
    setErrorInternal(message);
  }, []);

  const setGraphData = useCallback((newData: GraphData) => {
    setDataInternal(newData);
    // When data is set externally, loading should probably be false, and errors cleared.
    setLoadingInternal(false);
    setErrorInternal(null);
  }, []);

  const clearGraphDataState = useCallback(() => {
    setDataInternal(initialGraphData);
    setGraphStatsInternal(null);
    setErrorInternal(null);
    // Should loading be set to false or true here? 
    // If cleared, usually means no data, so not loading new data yet.
    setLoadingInternal(false); 
  }, []);

  return {
    data,
    graphStats,
    loading,
    error,
    fetchGraphStatistics,
    addNodeToState,
    addLinkToState,
    updateNodeInState,
    deleteNodeFromState,
    deleteLinkFromState,
    setGraphError,
    setGraphData,
    fetchDataWithSchema, // Export the new explicit fetcher
    clearGraphDataState, // Export the new clear action
  };
} 