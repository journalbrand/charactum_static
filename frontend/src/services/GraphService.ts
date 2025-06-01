/**
 * @file GraphService.ts
 * @description Service layer for handling graph operations, modified for static demo
 * @dependencies graph.ts types, staticgraph.json
 * @test_file frontend/src/services/__tests__/GraphService.test.ts
 */

import { Node, Link, /* GraphData, */ NodeType, RelationshipType } from '../types/graph';
import staticGraphData from '../../staticgraph.json'; // Import static data

class GraphService {
  async createNode(nodeData: { type: NodeType; name: string; description: string }): Promise<Node> {
    console.warn('createNode is disabled in static mode', nodeData);
    // Return a mock node or throw an error, depending on desired behavior
    return Promise.resolve({ id: 'static-mock-node', ...nodeData });
  }

  async createRelationship(relationshipData: {
    type: RelationshipType;
    source: string;
    target: string;
    properties?: Record<string, any>;
  }): Promise<Link> {
    console.warn('createRelationship is disabled in static mode', relationshipData);
    // Return a mock link or throw an error
    return Promise.resolve({ id: 'static-mock-link', ...relationshipData, properties: relationshipData.properties || {} });
  }

  async fetchNodesByType(type: NodeType): Promise<Node[]> {
    console.warn('fetchNodesByType is disabled in static mode, returning all nodes.', type);
    // In a static setup, filtering by type might need to be done client-side
    // or this method could be removed if not used by the static display.
    return Promise.resolve(staticGraphData.nodes);
  }


  async fetchAllNodes(): Promise<Node[]> {
    return Promise.resolve(staticGraphData.nodes);
  }

  async fetchAllRelationships(): Promise<Link[]> {
    return Promise.resolve(staticGraphData.relationships);
  }

  async updateNode(nodeId: string, data: { name: string; description: string }): Promise<Node> {
    console.warn('updateNode is disabled in static mode', nodeId, data);
    const node = staticGraphData.nodes.find(n => n.id === nodeId);
    if (node) {
        return Promise.resolve({ ...node, ...data });
    }
    throw new Error(`Static mock: Node with id ${nodeId} not found`);
  }

  private async handleResponse(response: Response) {
    // This method is likely not needed for static data, but kept for structure
    // or if some parts still simulate async operations.
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to complete operation');
    }
    return response.json();
  }

  async deleteNode(nodeId: string): Promise<boolean> {
    console.warn('deleteNode is disabled in static mode', nodeId);
    return Promise.resolve(true); // Simulate successful deletion
  }

  async deleteRelationship(relationshipId: string): Promise<boolean> {
    console.warn('deleteRelationship is disabled in static mode', relationshipId);
    return Promise.resolve(true); // Simulate successful deletion
  }

  async clearDatabase(): Promise<void> {
    console.warn('clearDatabase is disabled in static mode');
    return Promise.resolve();
  }

  async exportDatabase(): Promise<Blob> {
    console.warn('exportDatabase is disabled in static mode. Returning static data as JSON Blob.');
    const staticDataString = JSON.stringify(staticGraphData);
    const blob = new Blob([staticDataString], { type: 'application/json' });
    return Promise.resolve(blob);
  }

  async importDatabase(file: File, clear = false): Promise<void> {
    console.warn('importDatabase is disabled in static mode', file, clear);
    // This function would typically interact with the backend.
    // For static mode, it does nothing.
    return Promise.resolve();
  }
}

export default new GraphService();
