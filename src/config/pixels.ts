export interface PixelConfig {
  id: string;
  name: string;
  pixelId: string;
  conversionApiToken: string;
  slug: string;
}

export const PIXEL_CONFIGS: Record<string, PixelConfig> = {
  muha: {
    id: 'muha',
    name: 'Muha Campaign',
    pixelId: '835997012375916',
    conversionApiToken: 'EAARL0VhA9AkBQBWy0rSd5qpm5RazZALB55YOTNk1sZCST8WUSIs3yZA60x12eGeSJCGtj1umsgWJn1GElkuZA1ouGjZAY6xJgXQkZBLdCib5ZBDZBsNCtqZAReRiztImLqbGawBIfFMnBedkv0voWzzzZAozvHfcZBcG3KNp99AIiEZCM9oK0BWNGhuw8s9rT0CSupjgQAZDZD',
    slug: 'muha',
  },
  arystan: {
    id: 'arystan',
    name: 'Arystan Campaign',
    pixelId: '1173453391598938',
    conversionApiToken: 'EAAKYbknYoUoBQLhQNZAeXcWOw5EAoi7pJjZCEsTItqyoNofUZC8zeWM3V4zuYDkUuu1YpxRFNtt23M4y61QIEWDlbDwu3eZBD1rV5WD9ZBHbT6LMkZBY88nmunSpgyuaZA5dd2ZCPwY1ZCjfKyW2tU9mpMj6D5LZAZAPuiZCR7VvjCP1HzMWFtWE0zIoUZAZAYp3xOewZDZD',
    slug: 'arystan',
  },
  kenesary: {
    id: 'kenesary',
    name: 'Kenesary Campaign',
    pixelId: '2082923049114502',
    conversionApiToken: 'EAAUxRozkwe4BQEPkILTCnNgvqdDPp7wPe15mJCBZALVExqt6U07XpyUsLb5P9qy9AJOUdd9fbo2fiU3ya7BW0wMzzYHbtG8JPosaAVWpDqXYFwMiZCfPyxxYgB25vKi4iV5dm8jgtUIqfVbAzxrK3szqlywL2Fcn6XdiXNJ1bb1gTfbRlX8gae168A09kX4gZDZD',
    slug: 'kenesary',
  },
  traf4: {
    id: 'traf4',
    name: 'Traf4 Campaign',
    pixelId: '1244019480344673',
    conversionApiToken: 'EAAT6kCZBcCdoBQCYTD1nnsWBCTFBdUZC2PXEl9lBE3wnlGsXZBJAhYwI6c3Kb1LRHNvKO3iSKyidUG6qFahmOhRC2ZAcwT1Nv0JOZAdBUwz32JKxEUd66XWZCeviKvd2NLoLnj4F7vZBPf1OMPRu7dQyP597z6pveImuZCUaBhlhWUT1ZChyL3r5rMtbDKZCzB1he9mQZDZD',
    slug: 'traf4',
  },
};

export function getPixelConfig(slug: string): PixelConfig | null {
  return PIXEL_CONFIGS[slug] || null;
}

