import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

// ✅ ИСПРАВЛЕНО - v2 API с обязательным beta заголовком
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: {
    'OpenAI-Beta': 'assistants=v2',
  },
});

console.log('✅ OpenAI client initialized with Assistants API v2');

