import { GoogleGenAI } from '@google/genai'
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function cosineSimilarity (vecA, vecB) {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  if (normA === 0 || normB === 0) {
    return 0
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export class RAGSystem {
  documents = []
  ai

  constructor (apiKey) {
    this.ai = new GoogleGenAI({ apiKey })
  }

  async initialize (knowledge) {
    // Combine question and answer into a single chunk to preserve context
    const chunks = knowledge.map(
      item => `Question: ${item.question}\nAnswer: ${item.answer}`
    );
    if (chunks.length === 0) return;

    // Create a hash of the knowledge base to use as cache key
    const hash = crypto.createHash('sha256').update(JSON.stringify(chunks)).digest('hex');
    const cachePath = path.resolve('./embeddings-cache-' + hash + '.json');

    let embeddings = [];
    if (fs.existsSync(cachePath)) {
      // Load from cache
      try {
        const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
        if (cache && Array.isArray(cache.embeddings) && cache.embeddings.length === chunks.length) {
          embeddings = cache.embeddings;
          console.log('Loaded embeddings from cache:', cachePath);
        } else {
          throw new Error('Cache mismatch');
        }
      } catch (err) {
        console.warn('Failed to load cache, will re-embed:', err.message);
      }
    }
    if (embeddings.length !== chunks.length) {
      // Not cached or cache invalid, call Gemini API in batches
      try {
        const BATCH_SIZE = 100;
        let allEmbeddings = [];
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
          const batch = chunks.slice(i, i + BATCH_SIZE);
          const result = await this.ai.models.embedContent({
            model: 'text-embedding-004',
            contents: batch.map(chunk => ({ parts: [{ text: chunk }] })),
            taskType: 'SEMANTIC_SIMILARITY'
          });
          allEmbeddings = allEmbeddings.concat(result.embeddings.map(e => e.values));
        }
        embeddings = allEmbeddings;
        // Save to cache
        fs.writeFileSync(cachePath, JSON.stringify({ embeddings }), 'utf-8');
        console.log('Saved embeddings to cache:', cachePath);
      } catch (err) {
        console.error('Error in embedding:', err);
        throw err;
      }
    }

    this.documents = chunks.map((chunk, i) => ({
      text: chunk,
      embedding: embeddings[i]
    }));
  }

  async retrieve (query, k = 3) {
    if (this.documents.length === 0) return []

    // Corrected API call: The method is directly on 'this.ai'
    const queryEmbeddingResponse = await this.ai.models.embedContent({
      model: 'text-embedding-004', // Using a newer model
      contents: [{ parts: [{ text: query }] }],
      taskType: 'RETRIEVAL_QUERY'
    })
    const queryEmbedding = queryEmbeddingResponse.embeddings[0].values;

    const similarities = this.documents.map(doc => ({
      text: doc.text,
      similarity: cosineSimilarity(queryEmbedding, doc.embedding)
    }))

    similarities.sort((a, b) => b.similarity - a.similarity)
    return similarities.slice(0, k).map(item => item.text)
  }
}
