/**
 * @file LLMService.ts
 * @description Service for interacting with the LLM API endpoints
 */

import { Node, NodeType } from '../types/graph';

interface LLMCandidate {
  name: string;
  type: NodeType;
  description: string;
}

interface LLMResponse {
  candidates: LLMCandidate[];
  message?: string;
}

interface CandidateGraph {
  candidates: Node[];
}

interface InstructionData {
  relationship_type: string;
  source_type: string;
  target_type: string;
  is_source: boolean;
  additional_instructions: string;
}

class LLMService {
  private static instance: LLMService;

  private constructor() {}

  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  async generateCandidates(instructionData: InstructionData, contextNode?: Node): Promise<CandidateGraph> {
    console.log('Step 2: LLMService - Making API call', {
      instruction: instructionData,
      contextNode: contextNode ? {
        id: contextNode.id,
        name: contextNode.name,
        type: contextNode.type,
        description: contextNode.description
      } : 'No context node'
    });

    const requestBody = {
      instruction: {
        relationship_type: instructionData.relationship_type,
        source_type: instructionData.source_type,
        target_type: instructionData.target_type,
        is_source: instructionData.is_source,
        additional_instructions: instructionData.additional_instructions || ''
      },
      context: contextNode ? {
        node_id: contextNode.id,
        node_type: contextNode.type.toLowerCase(),
        node_name: contextNode.name,
        node_description: contextNode.description
      } : undefined
    };

    console.log('Step 2: LLMService - Request body:', requestBody);

    const response = await fetch('/api/llm/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Step 2: LLMService - Error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to generate candidates: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Step 2: LLMService - Received API response', {
      candidates: data.candidates,
      message: data.message,
      raw_response: data,
      response_status: response.status,
      response_ok: response.ok,
      response_headers: Object.fromEntries(response.headers.entries())
    });
    
    return {
      candidates: data.candidates.map((c: any) => ({
        id: `candidate-${Math.random().toString(36).substr(2, 9)}`,
        elementId: `candidate-${Math.random().toString(36).substr(2, 9)}`,
        name: c.name,
        type: c.type,
        description: c.description
      }))
    };
  }

  async editNodeDescription(nodeId: string, instruction: string): Promise<Node> {
    const response = await fetch('/api/llm/edit-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node_id: nodeId, instruction })
    });

    if (!response.ok) {
      throw new Error(`Failed to edit description: ${response.statusText}`);
    }

    return response.json();
  }
}

export default LLMService; 