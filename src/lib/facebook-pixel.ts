// TypeScript declarations for Facebook Pixel
declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

// Browser-side pixel tracking
export const initPixel = (pixelId: string) => {
  if (typeof window !== 'undefined' && !window.fbq) {
    // Initialize Facebook Pixel
    (function(f: any, b: any, e: any, v: any, n: any, t: any, s: any) {
      if (f.fbq) return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(
      window,
      document,
      'script',
      'https://connect.facebook.net/en_US/fbevents.js'
    );

    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
  } else if (typeof window !== 'undefined' && window.fbq) {
    // Pixel already loaded, just init new pixel ID
    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
  }
};

export const trackPageView = () => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'PageView');
  }
};

export const trackLead = (data?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Lead', data || {});
    console.log('✅ Facebook Pixel: Lead event tracked', data);
  }
};

// Export type for Lead data
export interface LeadData {
  email: string;
  phone: string;
  name: string;
}

