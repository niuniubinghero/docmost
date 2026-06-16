export interface AiToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface AiToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface AiToolResult {
  tool_call_id: string;
  name: string;
  result: string;
}

export const AI_TOOLS: AiToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'read_page',
      description: 'Read the content of a document page. Use this to understand the current content before making edits.',
      parameters: {
        type: 'object',
        properties: {
          page_id: {
            type: 'string',
            description: 'The ID of the page to read',
          },
        },
        required: ['page_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_page_content',
      description: 'Update the content of a document page. You can append, prepend, or replace content. Content should be in markdown format.',
      parameters: {
        type: 'object',
        properties: {
          page_id: {
            type: 'string',
            description: 'The ID of the page to update',
          },
          content: {
            type: 'string',
            description: 'The markdown content to write',
          },
          operation: {
            type: 'string',
            enum: ['append', 'prepend', 'replace'],
            description: 'The operation to perform: append adds to end, prepend adds to beginning, replace replaces all content',
          },
        },
        required: ['page_id', 'content', 'operation'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_pages',
      description: 'Search for pages in the workspace by title or content.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_page',
      description: 'Create a new document page in a space.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The title of the new page',
          },
          space_id: {
            type: 'string',
            description: 'The ID of the space to create the page in',
          },
          content: {
            type: 'string',
            description: 'Initial markdown content for the page (optional)',
          },
        },
        required: ['title', 'space_id'],
      },
    },
  },
];
