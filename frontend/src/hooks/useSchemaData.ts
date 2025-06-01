/**
 * @file useSchemaData.ts
 * @description Custom hook to fetch and manage graph schema data (node types, relationship types, allowed relationships).
 * @requires react
 * @uses ../types/graph SchemaNodeType, SchemaRelationshipType, AllowedRelationshipSchema
 * @see ./useSchemaData.test.ts Corresponding unit tests
 */
import { useState, /* useEffect, */ useCallback } from 'react';
import { SchemaNodeType, SchemaRelationshipType, AllowedRelationshipSchema } from '../types/graph';

export interface SchemaData {
  nodeTypes: SchemaNodeType[];
  relationshipTypes: SchemaRelationshipType[];
  allowedRelationshipSchemas: AllowedRelationshipSchema[];
}

export interface SchemaState extends SchemaData {
  loading: boolean;
  error: string | null;
}

export interface SchemaActions {
  fetchSchema: () => Promise<void>;
  // Might add functions to refresh schema or parts of it later if needed
}

const initialSchemaData: SchemaData = {
  nodeTypes: [],
  relationshipTypes: [],
  allowedRelationshipSchemas: [],
};

export function useSchemaData(): SchemaState & SchemaActions {
  const [schema, setSchema] = useState<SchemaData>(initialSchemaData);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchema = useCallback(async () => {
    console.log('(useSchemaData) Fetching schema...');
    setLoading(true);
    setError(null);
    try {
      const [nodeTypesRes, relTypesRes, allowedSchemasRes] = await Promise.all([
        fetch('/api/schema/node-types'),
        fetch('/api/schema/relationship-types'),
        fetch('/api/schema/allowed-relationship-schemas')
      ]);

      if (!nodeTypesRes.ok || !relTypesRes.ok || !allowedSchemasRes.ok) {
        // Collect status for better error reporting
        const statuses = {
            nodeTypes: nodeTypesRes.status,
            relTypes: relTypesRes.status,
            allowedSchemas: allowedSchemasRes.status
        };
        console.error('(useSchemaData) Failed to fetch full schema data, statuses:', statuses);
        throw new Error('Failed to fetch complete schema data. Check console for details.');
      }

      const nodeTypesData = await nodeTypesRes.json();
      const relationshipTypesData = await relTypesRes.json();
      const allowedSchemasData = await allowedSchemasRes.json();

      console.log('(useSchemaData) Schema data parsed:', {
        nodeTypesCount: nodeTypesData.types.length,
        relationshipTypesCount: relationshipTypesData.types.length,
        allowedSchemasCount: allowedSchemasData.relationships.length,
      });

      setSchema({
        nodeTypes: nodeTypesData.types,
        relationshipTypes: relationshipTypesData.types,
        allowedRelationshipSchemas: allowedSchemasData.relationships,
      });
    } catch (e) {
      console.error('(useSchemaData) Error fetching schema:', e);
      setError(e instanceof Error ? e.message : 'Failed to fetch schema');
      setSchema(initialSchemaData); // Reset to initial on error
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    ...schema, // Spread nodeTypes, relationshipTypes, allowedRelationshipSchemas
    loading,
    error,
    fetchSchema,
  };
} 