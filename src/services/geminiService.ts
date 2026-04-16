import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

// Model configuration
const modelConfig = {
  temperature: 0.9,
  topP: 0.95,
  maxOutputTokens: 100,
};

export interface SessionData {
  totalCompressions: number;
  duration: number; // in seconds
  averageRate: number;
  cyclesCompleted: number;
}

/**
 * Generate contextual encouragement phrase using Gemini
 */
export async function generateEncouragement(sessionData: SessionData): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: modelConfig,
    });

    const minutes = Math.floor(sessionData.duration / 60);
    const seconds = sessionData.duration % 60;

    const prompt = `You are a calm, supportive emergency response AI assistant. 
Generate a short encouragement phrase (maximum 15 words) for someone performing CPR.

Context:
- Duration: ${minutes} minutes ${seconds} seconds
- Total compressions: ${sessionData.totalCompressions}
- Cycles completed: ${sessionData.cyclesCompleted}

Requirements:
- Be calm, reassuring, and supportive
- Acknowledge their effort
- Remind them help is coming
- Do NOT give medical advice
- Keep it conversational and natural

Generate ONLY the encouragement phrase, no explanation.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating encouragement:', error);
    // Fallback encouragement messages
    const fallbacks = [
      "You're doing great. Keep going, help is on the way.",
      "Stay focused. You're making a difference right now.",
      "Excellent work. Keep those compressions steady.",
      "You're a hero. Emergency services are coming.",
      "Keep it up. Your efforts are saving a life.",
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

/**
 * Generate session summary using Gemini
 */
export async function generateSessionSummary(sessionData: SessionData): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: { ...modelConfig, maxOutputTokens: 150 },
    });

    const minutes = Math.floor(sessionData.duration / 60);
    const seconds = sessionData.duration % 60;

    const prompt = `You are a compassionate emergency response AI. Generate a supportive summary for someone who just completed CPR.

Session Data:
- Total compressions: ${sessionData.totalCompressions}
- Duration: ${minutes} minutes ${seconds} seconds
- Average rate: ${sessionData.averageRate} compressions per minute
- Cycles completed: ${sessionData.cyclesCompleted}

Requirements:
- 50-75 words
- Acknowledge their heroic effort
- Confirm they did the right thing
- Mention if they followed proper technique (100-120 bpm is optimal)
- End with emotional support and validation
- Write in second person ("You")

Generate ONLY the summary text.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating summary:', error);
    // Fallback summary
    const minutes = Math.floor(sessionData.duration / 60);
    const seconds = sessionData.duration % 60;
    const isOptimalRate = sessionData.averageRate >= 100 && sessionData.averageRate <= 120;
    return `You completed ${sessionData.totalCompressions} compressions over ${minutes} minutes and ${seconds} seconds. ${
      isOptimalRate 
        ? 'Your compression rate was excellent, maintaining the recommended 100-120 BPM.' 
        : 'You stayed focused and kept going.'
    } You did everything right. Your quick action and determination could have saved a life. You should be proud of your courage in this critical moment.`;
  }
}

/**
 * Answer CPR-related questions using Gemini (Stretch Goal)
 */
export async function answerCPRQuestion(question: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: { ...modelConfig, maxOutputTokens: 50 },
    });

    const prompt = `You are an emergency response AI assistant. Answer this CPR question briefly and clearly based on American Heart Association guidelines.

Question: ${question}

Requirements:
- Maximum 25 words
- Be clear and direct
- Based on AHA CPR guidelines
- If unsure, say "Continue compressions and wait for EMS"

Answer:`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error answering question:', error);
    return "Continue compressions at 100-120 per minute. Help is on the way.";
  }
}

/**
 * Translate CPR instructions (Stretch Goal)
 */
export async function translateInstruction(text: string, language: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: modelConfig,
    });

    const prompt = `Translate this CPR instruction to ${language}: ${text}

Generate ONLY the translation, no explanation.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error translating:', error);
    return text; // Return original if translation fails
  }
}
