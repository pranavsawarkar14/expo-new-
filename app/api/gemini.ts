import { GeminiResponse } from '../types/chat';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export async function generateGeminiResponse(query: string): Promise<GeminiResponse> {
  try {
    if (!GEMINI_API_KEY) {
      console.error('Gemini API key is not configured');
      throw new Error('API key not configured');
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: query
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API error:', data);
      throw new Error(data.error?.message || 'Failed to fetch response from Gemini');
    }

    // Check for the correct response format
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Invalid response format from Gemini:', data);
      throw new Error('Invalid response format from Gemini');
    }

    // Extract the response text
    const answer = data.candidates[0].content.parts[0].text;

    // Check if the response is empty or too short
    if (!answer || answer.trim().length < 2) {
      console.error('Empty or invalid response from Gemini');
      throw new Error('Empty response from Gemini');
    }

    return {
      answer: answer.trim(),
      relatedContent: []
    };
  } catch (error) {
    console.error('Error fetching from Gemini:', error);
    
    // More specific error messages based on the error type
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return {
          answer: "I'm not properly configured yet. Please make sure the API key is set up correctly.",
          relatedContent: []
        };
      } else if (error.message.includes('network')) {
        return {
          answer: "I'm having trouble connecting to the internet. Please check your connection and try again.",
          relatedContent: []
        };
      } else if (error.message.includes('Empty response')) {
        return {
          answer: "I received an empty response. Please try asking your question again.",
          relatedContent: []
        };
      }
    }
    
    return {
      answer: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
      relatedContent: []
    };
  }
}

// Helper function to check if the API is properly configured
export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY;
}

// Helper function to validate the API key
export async function validateGeminiApiKey(): Promise<boolean> {
  try {
    if (!GEMINI_API_KEY) return false;
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Hello"
          }]
        }]
      })
    });

    const data = await response.json();
    return response.ok && !!data.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (error) {
    console.error('Error validating Gemini API key:', error);
    return false;
  }
} 