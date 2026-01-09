const server_endpoint = process.env.MCP_ENDPOINT;

export async function callMCP({ endPoint = server_endpoint, tool, params }) {
  try {
    const requestBody = { 
      jsonrpc: "2.0",
      id: Date.now(), //unique ID per request
      method: "tools/call", //tells the MCP server to invoke a registered tool.
      params: {
        name: tool, // Tool name to call
        arguments: { ...params}
      }
    };
    const response = await fetch(endPoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json, text/event-stream"
      },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.statusText}`);
    }
    console.log("MCP response status:", response);
    const responseText = await response.text();
    try {
      const result = JSON.parse(responseText);
      return result;
    } catch (parseError) {
      return { error: "Response is not valid JSON", responseText };
    }
  } catch (error) {
    console.error("MCP Call Error:", error);
    return { error: error.message };
  }
}