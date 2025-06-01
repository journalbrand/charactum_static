/**
 * @file SchemaService.ts
 * @description Service for validating graph schema
 */

import { NodeType, RelationshipType } from '../types/graph';

class SchemaService {
    private static nodeTypes: Set<string> = new Set();
    private static relationshipTypes: Set<string> = new Set();

    static async loadSchema() {
        try {
            const [nodeTypesRes, relTypesRes] = await Promise.all([
                fetch('/api/schema/node-types'),
                fetch('/api/schema/relationship-types')
            ]);

            const nodeTypes = await nodeTypesRes.json();
            const relationshipTypes = await relTypesRes.json();

            this.nodeTypes = new Set(nodeTypes.types.map((t: any) => t.value));
            this.relationshipTypes = new Set(relationshipTypes.types.map((t: any) => t.value));
        } catch (error) {
            console.error('Error loading schema:', error);
            throw error;
        }
    }

    static async isValidNodeType(type: NodeType): Promise<boolean> {
        if (this.nodeTypes.size === 0) {
            await this.loadSchema();
        }
        return this.nodeTypes.has(type);
    }

    static async isValidRelationshipType(type: RelationshipType): Promise<boolean> {
        if (this.relationshipTypes.size === 0) {
            await this.loadSchema();
        }
        return this.relationshipTypes.has(type);
    }
}

export default SchemaService; 