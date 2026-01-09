import { callMCP } from '@/lib/mcpClient';

export async function POST(req) {
  try {
    const { prompt, userId = null } = await req.json();
    // Always call MCP server to match index.js logic
    const mcpResult = await callMCP({
      tool: 'GetAnswer',
      params: { prompt }
    });
    if (mcpResult && mcpResult.error) {
      console.error('MCP Error Response:', mcpResult);
      return new Response(JSON.stringify({ error: mcpResult.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify(mcpResult), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error calling MCP server:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
