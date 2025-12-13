import { useEffect } from 'react';
import { captureUTMParams, storeUTMParams } from '@/lib/utm-tracker';

export default function UTMTracker() {
  useEffect(() => {
    const params = captureUTMParams();
    if (Object.keys(params).length > 0) {
      storeUTMParams(params);
      console.log('📊 UTM captured:', params);
    }
  }, []);

  return null;
}

