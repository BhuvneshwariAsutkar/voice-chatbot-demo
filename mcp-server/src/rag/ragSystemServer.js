import { RAGSystem } from '../lib/ragSystem.js'
import { getCombinedKnowledgeData } from '../data/dynamicKnowledgeLoader.js';

let ragSystemInstance = null;
let lastInitTime = 0;
const RAG_RELOAD_INTERVAL = 10 * 60 * 1000; // 10 minutes

// initialize the RAG system and used cached instance if within the reload interval
export async function getRagSystem({ forceReload = false } = {}) {
  const now = Date.now();
  // Reload if forced or interval passed
  if (
    !ragSystemInstance ||
    forceReload ||
    (now - lastInitTime > RAG_RELOAD_INTERVAL)
  ) {
    try {
      console.log('Initializing RAG system...');
      const rag = new RAGSystem(process.env.GEMINI_API_KEY);
      // Load dynamic knowledge data
      const combinedKnowledge = await getCombinedKnowledgeData();
      await rag.initialize(combinedKnowledge);
      ragSystemInstance = rag;
      lastInitTime = now;
      console.log(
        `RAG system initialized with dynamic knowledge. Knowledge size: ${Array.isArray(combinedKnowledge) ? combinedKnowledge.length : 'unknown'}`
      );
    } catch (err) {
      console.error('RAG system initialization failed:', err);
      throw new Error('RAG system could not be initialized.');
    }
  }
  return ragSystemInstance;
}