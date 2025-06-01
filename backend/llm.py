"""
LLM Service Module

This module provides the LLM service for generating and validating node candidates.
It uses OpenAI's GPT models for natural language processing and understanding.
"""

import os
from typing import List, Dict, Any, Optional
import logging
from openai import AsyncOpenAI
from dotenv import load_dotenv
import json
import re # Added for sanitizing names

# Use dynamic ontology for NodeType and RelationshipType
from .ontology_loader import get_ontology
from .models import NodeType, RelationshipType
# GraphLinter might still be needed if any validation happens here, but not for _get_relationship_prompt
# from .graph_grammar import GraphLinter 

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Get OpenAI model name from environment variable, with a default
OPENAI_CHAT_MODEL = os.getenv("OPENAI_MODEL_NAME", "gpt-4.1")
logger.info(f"Using OpenAI model: {OPENAI_CHAT_MODEL}")

class LLMService:
    """Service for LLM-based node generation."""

    def __init__(self):
        """Initialize the LLM service."""
        logger.info("LLM Service initialized")

    async def generate_candidates(self, instruction: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Generate node candidates based on user instruction and context."""
        try:
            logger.info("\n=== INPUT DATA ===")
            logger.info(f"Instruction: {json.dumps(instruction, indent=2)}")
            logger.info(f"Context: {json.dumps(context, indent=2)}")
            logger.info("=================\n")

            try:
                relationship_type_str = instruction["relationship_type"]
                source_type_str = instruction["source_type"]
                target_type_str = instruction["target_type"]
                is_source_context = bool(instruction["is_source"]) 
            except KeyError as e:
                logger.error(f"Missing required field in instruction: {e}")
                raise ValueError(f"Missing required field in instruction: {e}")

            # Handle potentially None additional_instructions from the dict
            raw_additional_instructions = instruction.get("additional_instructions")
            final_additional_instructions = raw_additional_instructions if raw_additional_instructions is not None else ""

            try:
                RelationshipType(relationship_type_str)
            except ValueError:
                logger.error(f"Invalid relationship type string: {relationship_type_str}")
                raise ValueError(f"Invalid relationship type string: {relationship_type_str}")

            system_message = """Provide a list of names and descriptions."""
            
            # Determine the type of node we are trying to generate
            node_type_to_generate = target_type_str if is_source_context else source_type_str
            clean_node_type_to_generate = re.sub(r'[^a-zA-Z0-9_]', '_', node_type_to_generate.lower()).strip('_')
            if not clean_node_type_to_generate:
                clean_node_type_to_generate = "node" # Fallback

            # Determine the parent node name and type label from context for tool definition
            parent_context_description_for_tool = "any_context" # Fallback if no context
            parent_context_display_for_prompt = "any context" # For user-facing descriptions

            if context and 'node_name' in context and context['node_name'] and 'node_type' in context and context['node_type']:
                raw_parent_name = str(context['node_name'])
                raw_parent_type = str(context['node_type'])

                # Sanitize parent name
                clean_parent_name = re.sub(r'[^a-zA-Z0-9_]', '_', raw_parent_name)
                clean_parent_name = re.sub(r'_+', '_', clean_parent_name).strip('_').lower()
                if not clean_parent_name:
                    clean_parent_name = "unnamed"
                
                current_ontology = get_ontology()
                parent_type_metadata = current_ontology.node_metadata.get(raw_parent_type, {})
                parent_type_label_display = parent_type_metadata.get("label", raw_parent_type.capitalize()) # User-facing label
                
                # Sanitize parent type label for use in identifiers
                clean_parent_type_label = re.sub(r'[^a-zA-Z0-9_]', '_', parent_type_label_display.lower()).strip('_')
                if not clean_parent_type_label:
                    clean_parent_type_label = "unknown_type"

                # Max length for combined segments to keep total name reasonable
                parent_context_description_for_tool = f"{clean_parent_type_label}_{clean_parent_name}"[:35] 
                parent_context_display_for_prompt = f"the {parent_type_label_display} '{raw_parent_name}'"
            elif context and 'node_name' in context and context['node_name']: # Only name is present
                raw_parent_name = str(context['node_name'])
                clean_parent_name = re.sub(r'[^a-zA-Z0-9_]', '_', raw_parent_name)
                clean_parent_name = re.sub(r'_+', '_', clean_parent_name).strip('_').lower()
                if not clean_parent_name:
                    clean_parent_name = "unnamed"
                parent_context_description_for_tool = f"named_{clean_parent_name}"[:35]
                parent_context_display_for_prompt = f"the node '{raw_parent_name}'"
            else: # No context name or type
                parent_context_description_for_tool = "general_context"
                parent_context_display_for_prompt = "a general context"


            # Dynamic tool definition
            tool_function_name = f"create_{clean_node_type_to_generate}s_for_{parent_context_description_for_tool}"
            tool_function_name = tool_function_name[:64] # Ensure function name is compliant

            tool_description = f"Create multiple {clean_node_type_to_generate} name-description pairs. These {clean_node_type_to_generate}s should be related to {parent_context_display_for_prompt}."
            
            nodes_array_key = f"{clean_node_type_to_generate}s_for_{parent_context_description_for_tool}"
            nodes_array_key = nodes_array_key[:64] # Parameter names also have limits

            node_name_key = f"{clean_node_type_to_generate}_name"
            node_name_key = node_name_key[:64]
            node_description_key = f"{clean_node_type_to_generate}_description"
            node_description_key = node_description_key[:64]
            
            # Get the label for the node type being generated, for clearer descriptions
            generating_node_type_label_display = clean_node_type_to_generate.capitalize() # Default
            current_ontology_for_gen_type = get_ontology()
            generating_node_type_metadata = current_ontology_for_gen_type.node_metadata.get(node_type_to_generate, {}) # use original type string
            if "label" in generating_node_type_metadata:
                generating_node_type_label_display = generating_node_type_metadata["label"]


            dynamic_ontology_tools = [
                {
                    "type": "function",
                    "function": {
                        "name": tool_function_name,
                        "description": tool_description,
                        "parameters": {
                            "type": "object",
                            "properties": {
                                nodes_array_key: {
                                    "type": "array",
                                    "description": f"List of {generating_node_type_label_display}s related to {parent_context_display_for_prompt}",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            node_name_key: {
                                                "type": "string",
                                                "description": f"Name for a new {generating_node_type_label_display} related to {parent_context_display_for_prompt}"
                                            },
                                            node_description_key: {
                                                "type": "string",
                                                "description": f"Description for the new {generating_node_type_label_display} related to {parent_context_display_for_prompt}"
                                            }
                                        },
                                        "required": [node_name_key, node_description_key]
                                    }
                                }
                            },
                            "required": [nodes_array_key]
                        }
                    }
                }
            ]

            if context and 'node_type' in context and 'node_name' in context:
                prompt_context_name = context['node_name']
                prompt_context_desc = context.get('node_description', 'No description available')
                # Use parent_type_label_display for the prompt context as well
                prompt_for_relationship = self._get_relationship_prompt(
                    relationship_type_str=relationship_type_str,
                    is_source_context=is_source_context,
                    node_name=prompt_context_name, # Pass the actual name
                    node_description=prompt_context_desc,
                    # Pass the label of the context node's type if available
                    node_type_label=parent_type_label_display if 'parent_type_label_display' in locals() and parent_type_label_display != raw_parent_type.capitalize() else None
                )
                system_message += f"\n\nContext: {prompt_for_relationship}"
            else:
                system_message += f"\n\nPlease generate relevant {generating_node_type_label_display} entities based on the overall instruction."

            if final_additional_instructions: # Use the processed version
                system_message += f"\n\nAdditional requirements: {final_additional_instructions}"

            request_data = {
                "model": OPENAI_CHAT_MODEL,
                "messages": [
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": f"Generate a list of suitable {generating_node_type_label_display} nodes."} # Made user message more specific with label
                ],
                "tools": dynamic_ontology_tools, 
                "tool_choice": {"type": "function", "function": {"name": tool_function_name}}
            }
            logger.info("\n=== OPENAI REQUEST ===\n" + json.dumps(request_data, indent=2) + "\n====================")

            response = await client.chat.completions.create(**request_data)

            message = response.choices[0].message
            logger.info("\n=== OPENAI RESPONSE ===")
            logger.info(f"Response ID: {response.id}")
            logger.info(f"Model: {response.model}")
            logger.info(f"Message Content: {message.content}")
            if message.tool_calls:
                logger.info("\nTool Calls:")
                for tool_call in message.tool_calls:
                    logger.info(f"\n  Tool Call ID: {tool_call.id}")
                    logger.info(f"  Function: {tool_call.function.name}")
                    logger.info(f"  Arguments: {tool_call.function.arguments}")
            logger.info("=====================")

            candidates = []
            if message.tool_calls:
                for tool_call in message.tool_calls:
                    if tool_call.function.name == tool_function_name: # Updated to check for dynamic tool name
                        args = json.loads(tool_call.function.arguments)
                        # Use dynamic key to get nodes list
                        for node_data in args.get(nodes_array_key, []):
                            # Determine the type for the new candidate node (already done by node_type_to_generate)
                            # candidate_node_type is node_type_to_generate

                            # Validate if the determined candidate_node_type is a known type
                            if node_type_to_generate not in get_ontology().node_types:
                                logger.error(f"Instruction implies an invalid candidate node type: '{node_type_to_generate}'. Defaulting to 'universal' for safety.")
                                validated_candidate_node_type = "universal" # Fallback
                            else:
                                validated_candidate_node_type = node_type_to_generate

                            # Use dynamic keys to get name and description
                            name_val = node_data.get(node_name_key)
                            desc_val = node_data.get(node_description_key)

                            if name_val is None or desc_val is None:
                                logger.warning(f"Skipping malformed candidate from LLM due to missing name/description: {node_data} using keys '{node_name_key}', '{node_description_key}'")
                                continue

                            node = {
                                "name": name_val,
                                "type": validated_candidate_node_type, 
                                "description": desc_val
                            }
                            # Redundant check as we now use .get and check for None above
                            # if not all(k in node for k in ["name", "type", "description"]):
                            #     logger.warning(f"Skipping malformed candidate from LLM: {node_data}")
                            #     continue
                            candidates.append(node)
                            logger.info(f"Created Node: {json.dumps(node, indent=2)}")
            
            logger.info("\n=== FINAL CANDIDATES ===")
            logger.info(f"Total Candidates: {len(candidates)}")
            logger.info(json.dumps(candidates, indent=2))
            logger.info("=======================\n")

            return candidates

        except Exception as e:
            logger.error(f"Error generating candidates: {str(e)}", exc_info=True)
            raise 

    def _get_relationship_prompt(
        self, 
        relationship_type_str: str, 
        is_source_context: bool, 
        node_name: str, 
        node_description: str,
        node_type_label: Optional[str] = None # Added to accept the label
    ) -> str:
        """Get a natural language prompt for the relationship type and direction from ontology_spec.json."""
        
        current_ontology = get_ontology() # Get current ontology instance
        # Find the rule for the given relationship_type_str in the dynamic ontology rules
        for rule in current_ontology.relationship_rules:
            if rule["name"] == relationship_type_str:
                prompt_key = "prompt_if_source" if is_source_context else "prompt_if_target"
                prompt_template = rule.get(prompt_key)
                
                # Prepare format arguments
                format_args = {
                    "node_name": node_name,
                    "node_description": node_description,
                    "node_type": node_type_label if node_type_label else "node" # Use label if provided
                }

                if prompt_template:
                    try:
                        # Ensure all expected keys by the template are present in format_args
                        # For safety, we can check if node_type is in the template before adding it
                        # However, a more robust way is to allow extra keys in format_args and let .format ignore them if not in template
                        # Or, make sure all prompts are updated to potentially use {node_type}
                        return prompt_template.format(**format_args)
                    except KeyError as e:
                        logger.error(f"Prompt template for {relationship_type_str} ('{prompt_key}') has missing format key: {e}. Template: '{prompt_template}'. Args: {format_args}")
                        # Fallback to a generic message if formatting fails due to missing specific keys other than node_name/node_description
                        return f"Please generate nodes related to the {node_type_label or 'node'} '{node_name}' ({node_description}) via {relationship_type_str}."
                else:
                    logger.warning(f"No prompt template found for {relationship_type_str} with key '{prompt_key}' in ontology_spec.json.")
                    return f"Please generate nodes related to the {node_type_label or 'node'} '{node_name}' ({node_description}) via {relationship_type_str}."
        
        logger.warning(f"No relationship rule found for type '{relationship_type_str}' in ontology_spec.json.")
        return f"No specific prompt guidance available. Generate nodes related to the {node_type_label or 'node'} '{node_name}' ({node_description})."

    async def edit_description(self, node: Dict[str, Any], instruction: str) -> str:
        """Use the LLM to edit a node description based on an instruction."""
        try:
            logger.info("\n=== EDIT DESCRIPTION REQUEST ===")
            logger.info(f"Node: {json.dumps(node, indent=2)}")
            logger.info(f"Instruction: {instruction}")
            
            system_msg = (
                f"You are assisting with editing the description of a {node.get('type')} node named '{node.get('name')}'. "
                f"The current description is: '{node.get('description', '')}'. "
                f"{instruction} Provide only the new description in your reply."
            )

            request_data = {
                "model": OPENAI_CHAT_MODEL,
                "messages": [
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": "Rewrite the description."}
                ],
            }
            
            logger.info("\n=== OPENAI EDIT REQUEST ===\n" + json.dumps(request_data, indent=2) + "\n====================")

            response = await client.chat.completions.create(**request_data)
            
            logger.info("\n=== OPENAI EDIT RESPONSE ===")
            logger.info(f"Response ID: {response.id}")
            logger.info(f"Model: {response.model}")
            logger.info(f"Message Content: {response.choices[0].message.content}")
            logger.info("===========================")
            
            new_desc = response.choices[0].message.content.strip()
            
            logger.info("\n=== FINAL EDITED DESCRIPTION ===")
            logger.info(new_desc)
            logger.info("===============================\n")
            
            return new_desc
        except Exception as e:
            logger.error(f"Error editing description via LLM: {e}", exc_info=True)
            raise

