/**
 * OpenAI Assistants Configuration
 * 
 * Хранит ID всех AI-ассистентов используемых в приложении
 * ID берутся из environment variables для безопасности
 */

export interface AssistantConfig {
  id: string;
  name: string;
  description: string;
}

export type AssistantType = 'curator' | 'mentor' | 'analyst' | 'tripwire';

/**
 * Получить конфигурацию ассистента по типу
 */
export function getAssistantConfig(type: AssistantType): AssistantConfig {
  const configs: Record<AssistantType, AssistantConfig> = {
    curator: {
      id: process.env.OPENAI_ASSISTANT_CURATOR_ID || '',
      name: 'AI-Куратор',
      description: 'Помогает студентам с вопросами по обучению',
    },
    mentor: {
      id: process.env.OPENAI_ASSISTANT_MENTOR_ID || '',
      name: 'AI-Наставник',
      description: 'Даёт советы по карьерному развитию',
    },
    analyst: {
      id: process.env.OPENAI_ASSISTANT_ANALYST_ID || '',
      name: 'AI-Аналитик',
      description: 'Анализирует прогресс и даёт рекомендации',
    },
    tripwire: {
      id: process.env.OPENAI_ASSISTANT_CURATOR_TRIPWIRE_ID || '',
      name: 'AI-Куратор (Tripwire)',
      description: 'Куратор для программы Tripwire',
    },
  };

  const config = configs[type];

  if (!config) {
    throw new Error(`Unknown assistant type: ${type}`);
  }

  if (!config.id) {
    throw new Error(`Missing environment variable for assistant: ${type.toUpperCase()}`);
  }

  return config;
}

/**
 * Получить только ID ассистента (для удобства)
 */
export function getAssistantId(type: AssistantType): string {
  return getAssistantConfig(type).id;
}

/**
 * Проверить что все Assistant IDs настроены
 */
export function validateAssistantConfig(): { valid: boolean; missing: string[] } {
  const types: AssistantType[] = ['curator', 'mentor', 'analyst', 'tripwire'];
  const missing: string[] = [];

  for (const type of types) {
    // Special case for tripwire env var naming convention
    const envVar = type === 'tripwire' 
      ? 'OPENAI_ASSISTANT_CURATOR_TRIPWIRE_ID'
      : `OPENAI_ASSISTANT_${type.toUpperCase()}_ID`;
      
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

console.log('✅ Assistants config module loaded');

