import { useEffect } from 'react';
import { initPixel } from '@/lib/facebook-pixel';
import { PixelConfig } from '@/config/pixels';

interface FacebookPixelProps {
  pixelConfig: PixelConfig;
}

export default function FacebookPixel({ pixelConfig }: FacebookPixelProps) {
  useEffect(() => {
    // Initialize pixel on client side
    initPixel(pixelConfig.pixelId);
    console.log(`✅ Facebook Pixel initialized: ${pixelConfig.name} (${pixelConfig.pixelId})`);
  }, [pixelConfig.pixelId, pixelConfig.name]);

  return (
    <>
      {/* Noscript fallback */}
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelConfig.pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

