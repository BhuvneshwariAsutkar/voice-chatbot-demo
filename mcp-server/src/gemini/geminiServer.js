import { GoogleGenAI } from '@google/genai';

export class GeminiServer {
  constructor(apiKey) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateCompletion({ prompt, model = 'gemini-2.0-flash-001', context = '' }) {
    const fullPrompt = context
      ? `${context}\n\nQuestion:\n${prompt}`
      : prompt;
    try {
      const result = await this.ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
      });
      // result.candidates[0].content.parts[0].text is the main completion
      const completion = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return completion;
    } catch (err) {
      console.error('Gemini API error:', err);
      throw err;
    }
  }
}
