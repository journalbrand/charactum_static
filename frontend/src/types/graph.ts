/**
 * @file graph.ts
 * @description Type definitions for graph data structures
 * These types mirror the backend models but remain decoupled for frontend independence
 */

// Node Types and Relationship Types are fetched from the API
// These are just type definitions for TypeScript, actual values come from the API
export type NodeType = string;  // Values will be validated against API response
export type RelationshipType = string;  // Values will be validated against API response

// Schema types from API
export interface SchemaNodeType {
    value: string;
    label: string;
    metadata: {
        label: string;
        properties: string[];
    };
}

export interface SchemaRelationshipType {
    value: string;
    label: string;
}

export interface AllowedRelationshipSchema {
    from_type: string;
    to_type: string;
    relationship_type: string;
    properties: Record<string, any>;
    required?: boolean;
    description?: string;
}

// Base Node interface
export interface Node {
    id: string;
    elementId: string;  // Should match id
    name: string;
    type: NodeType;
    description: string;
}

// Link/Relationship interface
export interface Link {
    id: string;  // Neo4j ID
    source: string;  // Node id
    target: string;  // Node id
    type: RelationshipType;
    properties?: Record<string, unknown>;
}

// Complete graph data structure
export interface GraphData {
    nodes: Node[];
    links: Link[];
}

// Props for Graph component
export interface GraphProps {
    nodes: Node[];
    links: Link[];
    onNodeClick?: (node: Node) => void;
    onLinkClick?: (link: Link) => void;
    selectedNodeId?: string;
    /** Node id to center and zoom on */
    focusNodeId?: string;
    width?: number;
    height?: number;
    className?: string;
}

// Type guard functions
export function isNode(obj: unknown): obj is Node {
    if (!obj || typeof obj !== 'object') return false;
    const node = obj as Node;
    return (
        typeof node.id === 'string' &&
        typeof node.elementId === 'string' &&
        typeof node.name === 'string' &&
        typeof node.type === 'string' &&
        typeof node.description === 'string' &&
        node.id === node.elementId
    );
}

export function isLink(obj: unknown): obj is Link {
    if (!obj || typeof obj !== 'object') return false;
    const link = obj as Link;
    return (
        typeof link.source === 'string' &&
        typeof link.target === 'string' &&
        typeof link.type === 'string'
    );
}

// Validation functions now use SchemaService
import SchemaService from '../services/SchemaService';

export async function validateNode(node: Node): Promise<boolean> {
    if (!isNode(node)) return false;
    return SchemaService.isValidNodeType(node.type);
}

export async function validateLink(link: Link): Promise<boolean> {
    if (!isLink(link)) return false;
    return SchemaService.isValidRelationshipType(link.type);
}

// Analysis types for candidate generation
export interface EmbeddingVisualization {
  x: number[];
  y: number[];
  labels: string[];
  cluster_assignments: number[];
}

export interface DistributionStats {
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

export interface AnalysisResult {
  distances: { [key: string]: number };
  sorted_nodes: Array<[{ name: string; type: string; description: string }, number]>;
  statistics: DistributionStats;
  selected_indices: number[];
  visualizations: { [key: string]: string };
  embedding_viz: EmbeddingVisualization;
}

export interface GraphStatistics {
  total_nodes: number;
  total_relationships: number;
  average_degree: number;
  node_type_distribution: { [key: string]: number };
  relationship_type_distribution: { [key: string]: number };
}

// Candidate types for AI-generated suggestions
export interface CandidateNode {
  name: string;
  type: NodeType;
  description?: string;
  properties?: Record<string, any>;
  temporaryId?: string; // Used to link candidate relationships before nodes are created
}

export interface CandidateRelationship {
  sourceNodeId?: string; // ID of an existing source node
  sourceNodeTemporaryId?: string; // Temporary ID of a new candidate source node
  targetNodeId?: string; // ID of an existing target node
  targetNodeTemporaryId?: string; // Temporary ID of a new candidate target node
  type: RelationshipType;
  properties?: Record<string, any>;
  isOutgoing?: boolean; // Relative to the primary context node if applicable
  temporaryId?: string; // Unique ID for the candidate relationship itself
}

export interface CandidateAnalysis {
  // This was previously AnalysisResult and had different fields.
  // Aligning with what useCandidateProcessing and its tests expect:
  candidates: CandidateNode[];
  relationships: CandidateRelationship[];
  summary: string; // A textual summary of the candidates
  // Other fields like distances, sorted_nodes, statistics, visualizations from old AnalysisResult can be added if needed.
}
