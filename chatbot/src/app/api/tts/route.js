import { callMCP } from '@/lib/mcpClient'

export async function POST(req) {
  try {
    const { text } = await req.json();
    if (!text) throw new Error("No text provided");
    // Call MCP TextToSpeech tool
    const mcpResponse = await callMCP({
      tool: 'TextToSpeech',
      params: { text }
    })

    const res = mcpResponse.result?.structuredContent || {}
    return new Response(
      JSON.stringify({ audioContent: res.audioBase64 }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.log("TTS response err:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};