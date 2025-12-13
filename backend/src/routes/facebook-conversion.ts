import express from 'express';
import crypto from 'crypto';

const router = express.Router();

interface PixelConfig {
  id: string;
  name: string;
  pixelId: string;
  conversionApiToken: string;
  slug: string;
}

const PIXEL_CONFIGS: Record<string, PixelConfig> = {
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
};

interface LeadData {
  email: string;
  phone: string;
  name: string;
}

async function sendConversionApiEvent(
  pixelConfig: PixelConfig,
  eventName: string,
  userData: LeadData,
  eventSourceUrl: string,
  userAgent?: string,
  ipAddress?: string,
  fbc?: string,
  fbp?: string
) {
  try {
    // Hash user data for privacy (required by Facebook)
    const hashedEmail = crypto
      .createHash('sha256')
      .update(userData.email.toLowerCase().trim())
      .digest('hex');

    const hashedPhone = crypto
      .createHash('sha256')
      .update(userData.phone.replace(/\D/g, ''))
      .digest('hex');

    const [firstName, ...lastNameParts] = userData.name.split(' ');
    const lastName = lastNameParts.join(' ');

    const hashedFirstName = crypto
      .createHash('sha256')
      .update(firstName.toLowerCase().trim())
      .digest('hex');

    const hashedLastName = lastName
      ? crypto
          .createHash('sha256')
          .update(lastName.toLowerCase().trim())
          .digest('hex')
      : null;

    const eventData = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: eventSourceUrl,
          user_data: {
            em: [hashedEmail],
            ph: [hashedPhone],
            fn: [hashedFirstName],
            ...(hashedLastName && { ln: [hashedLastName] }),
            client_ip_address: ipAddress,
            client_user_agent: userAgent,
            fbc: fbc,
            fbp: fbp,
          },
          custom_data: {
            content_name: 'Lead Form Submission',
            content_category: 'proftest',
            value: 1,
            currency: 'USD',
          },
        },
      ],
    };

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pixelConfig.pixelId}/events?access_token=${pixelConfig.conversionApiToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Facebook Conversion API Error:', errorData);
      throw new Error('Failed to send conversion event');
    }

    const result: any = await response.json();
    console.log('✅ Conversion API Event Sent:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending Conversion API event:', error);
    throw error;
  }
}

// POST /api/track-lead
router.post('/track-lead', async (req, res) => {
  try {
    const { campaignSlug, email, phone, name } = req.body;

    // Validate input
    if (!campaignSlug || !email || !phone || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    // Get pixel configuration
    const pixelConfig = PIXEL_CONFIGS[campaignSlug];
    if (!pixelConfig) {
      return res.status(400).json({
        error: 'Invalid campaign slug',
      });
    }

    // Extract tracking data from request
    const userAgent = req.headers['user-agent'] || undefined;
    const ipAddress = 
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      undefined;
    const referer = req.headers['referer'] || '';

    // Get Facebook cookies (fbc, fbp) from request
    const fbc = req.cookies?._fbc;
    const fbp = req.cookies?._fbp;

    console.log('📊 Tracking Lead Event:', {
      campaign: pixelConfig.name,
      pixelId: pixelConfig.pixelId,
      email: email.substring(0, 3) + '***',
      phone: phone.substring(0, 3) + '***',
      userAgent: userAgent?.substring(0, 50) + '...',
      ipAddress,
      fbc,
      fbp,
    });

    // Send to Facebook Conversion API
    const result = await sendConversionApiEvent(
      pixelConfig,
      'Lead',
      { email, phone, name },
      referer,
      userAgent,
      ipAddress,
      fbc,
      fbp
    );

    res.json({
      success: true,
      message: 'Lead tracked successfully',
      eventId: result.events_received,
    });
  } catch (error) {
    console.error('Error tracking lead:', error);
    res.status(500).json({
      error: 'Failed to track lead',
    });
  }
});

export default router;

