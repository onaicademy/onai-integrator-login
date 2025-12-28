/**
 * Targetologist Mapper Service
 * 
 * Единый сервис для определения таргетолога по UTM меткам, ad accounts и т.д.
 * Используется во всем проекте для обеспечения согласованности логики маппинга.
 */

interface TargetologistMapping {
  name: string;
  utmPatterns: string[];
  adAccounts: string[];
  teams: string[];
  color: string;
  emoji: string;
}

/**
 * Конфигурация маппинга таргетологов
 * 
 * Включает:
 * - UTM паттерны для автоматического определения по UTM меткам
 * - Ad account IDs для Facebook Ads
 * - Названия команд в системе
 * - Цвета для UI
 * - Эмодзи для Telegram уведомлений
 */
const TARGETOLOGIST_MAPPINGS: TargetologistMapping[] = [
  {
    name: 'Kenesary',
    utmPatterns: ['tripwire', 'nutcab', 'kenesary'],
    adAccounts: ['act_964264512447589'],
    teams: ['nutrients_kz'],
    color: '#3b82f6',
    emoji: '👑',
  },
  {
    name: 'Arystan',
    utmPatterns: ['arystan'],
    adAccounts: ['act_666059476005255'],
    teams: ['arystan_3_1'],
    color: '#8b5cf6',
    emoji: '🦁',
  },
  {
    name: 'Muha',
    utmPatterns: ['on ai', 'onai', 'запуск', 'muha'],
    adAccounts: ['act_839340528712304'],
    teams: ['muha_acc3'],
    color: '#eab308',
    emoji: '🚀',
  },
  {
    name: 'Traf4',
    utmPatterns: ['alex', 'traf4', 'proftest'],
    adAccounts: ['act_30779210298344970'],
    teams: ['traf4_team'],
    color: '#ef4444',
    emoji: '⚡',
  },
];

/**
 * Определяет таргетолога по UTM source
 * 
 * @param utmSource - UTM source параметр (например, "fb_kenesary")
 * @returns Имя таргетолога или null если не найден
 */
export function getTargetologistByUtmSource(utmSource: string): string | null {
  if (!utmSource) return null;
  
  const sourceLower = utmSource.toLowerCase();
  
  for (const mapping of TARGETOLOGIST_MAPPINGS) {
    for (const pattern of mapping.utmPatterns) {
      if (sourceLower.includes(pattern.toLowerCase())) {
        return mapping.name;
      }
    }
  }
  
  return null;
}

/**
 * Определяет таргетолога по UTM campaign
 * 
 * @param utmCampaign - UTM campaign параметр
 * @returns Имя таргетолога или null если не найден
 */
export function getTargetologistByUtmCampaign(utmCampaign: string): string | null {
  if (!utmCampaign) return null;
  
  const campaignLower = utmCampaign.toLowerCase();
  
  for (const mapping of TARGETOLOGIST_MAPPINGS) {
    for (const pattern of mapping.utmPatterns) {
      if (campaignLower.includes(pattern.toLowerCase())) {
        return mapping.name;
      }
    }
  }
  
  return null;
}

/**
 * Определяет таргетолога по UTM source или campaign
 * 
 * @param utmSource - UTM source параметр
 * @param utmCampaign - UTM campaign параметр
 * @returns Имя таргетолога или "Unknown" если не найден
 */
export function determineTargetologist(utmSource: string | null, utmCampaign: string | null): string {
  const targetologist = getTargetologistByUtmSource(utmSource || '') || 
                       getTargetologistByUtmCampaign(utmCampaign || '');
  
  return targetologist || 'Unknown';
}

/**
 * Определяет таргетолога по ad account ID
 * 
 * @param accountId - Facebook ad account ID (например, "act_964264512447589" или "964264512447589")
 * @returns Имя таргетолога или null если не найден
 */
export function getTargetologistByAdAccount(accountId: string): string | null {
  if (!accountId) return null;
  
  // Нормализуем ID (добавляем "act_" если нужно)
  const normalizedId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  
  for (const mapping of TARGETOLOGIST_MAPPINGS) {
    if (mapping.adAccounts.includes(normalizedId)) {
      return mapping.name;
    }
  }
  
  return null;
}

/**
 * Определяет таргетолога по названию команды
 * 
 * @param teamName - Название команды в системе
 * @returns Имя таргетолога или null если не найден
 */
export function getTargetologistByTeam(teamName: string): string | null {
  if (!teamName) return null;
  
  const teamLower = teamName.toLowerCase();
  
  for (const mapping of TARGETOLOGIST_MAPPINGS) {
    for (const team of mapping.teams) {
      if (team.toLowerCase() === teamLower) {
        return mapping.name;
      }
    }
  }
  
  return null;
}

/**
 * Получает полную информацию о таргетологе
 * 
 * @param name - Имя таргетолога
 * @returns Объект с информацией о таргетологе или null если не найден
 */
export function getTargetologistInfo(name: string): TargetologistMapping | null {
  return TARGETOLOGIST_MAPPINGS.find(m => 
    m.name.toLowerCase() === name.toLowerCase()
  ) || null;
}

/**
 * Получает эмодзи для таргетолога
 * 
 * @param name - Имя таргетолога
 * @returns Эмодзи или дефолтный если не найден
 */
export function getTargetologistEmoji(name: string): string {
  const info = getTargetologistInfo(name);
  return info?.emoji || '🎯';
}

/**
 * Получает цвет для таргетолога
 * 
 * @param name - Имя таргетолога
 * @returns Цвет или дефолтный если не найден
 */
export function getTargetologistColor(name: string): string {
  const info = getTargetologistInfo(name);
  return info?.color || '#00FF88';
}

/**
 * Получает всех таргетологов
 * 
 * @returns Массив всех конфигураций таргетологов
 */
export function getAllTargetologists(): TargetologistMapping[] {
  return [...TARGETOLOGIST_MAPPINGS];
}

/**
 * Получает список имен всех таргетологов
 * 
 * @returns Массив имен таргетологов
 */
export function getTargetologistNames(): string[] {
  return TARGETOLOGIST_MAPPINGS.map(m => m.name);
}

/**
 * Проверяет, существует ли таргетолог
 * 
 * @param name - Имя таргетолога
 * @returns true если таргетолог существует
 */
export function targetologistExists(name: string): boolean {
  return getTargetologistInfo(name) !== null;
}

/**
 * Получает ad account ID для таргетолога
 * 
 * @param name - Имя таргетолога
 * @returns Ad account ID или null если не найден
 */
export function getAdAccountForTargetologist(name: string): string | null {
  const info = getTargetologistInfo(name);
  return info?.adAccounts[0] || null;
}

/**
 * Получает команду для таргетолога
 * 
 * @param name - Имя таргетолога
 * @returns Название команды или null если не найден
 */
export function getTeamForTargetologist(name: string): string | null {
  const info = getTargetologistInfo(name);
  return info?.teams[0] || null;
}

// Экспорт типов для использования в других файлах
export type { TargetologistMapping };
