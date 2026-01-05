import { GeminiServer } from '../gemini/geminiServer.js';

let geminiInstance = null;
// initialize the Gemini server instance
export async function getGemini() {
  if (!geminiInstance) {
    console.log('Getting Gemini Instance...');
    geminiInstance = new GeminiServer(process.env.GEMINI_API_KEY);
  }
  return geminiInstance;
}
