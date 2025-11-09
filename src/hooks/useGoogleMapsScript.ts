import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Loads Google Maps JS API once and exposes a ready boolean
export function useGoogleMapsScript() {
  const [ready, setReady] = useState<boolean>(!!(window as any).google);

  useEffect(() => {
    if ((window as any).google) {
      setReady(true);
      return;
    }

    // If script already exists, attach listeners
    const existing = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    ) as HTMLScriptElement | null;

    const onLoad = () => setReady(true);
    const onError = (e: any) => {
      console.error('Google Maps script load error:', e);
    };

    if (existing) {
      if ((existing as any)._loaded) {
        setReady(true);
      } else {
        existing.addEventListener('load', onLoad);
        existing.addEventListener('error', onError);
      }
      return () => {
        existing.removeEventListener('load', onLoad);
        existing.removeEventListener('error', onError);
      };
    }

    let script: HTMLScriptElement | null = null;
    let canceled = false;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-google-maps-key');
        if (error || !data?.key) {
          console.error('Maps key fetch error:', error);
          return;
        }
        if (canceled) return;

        script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;
        (script as any)._loaded = false;
        script.addEventListener('load', () => {
          (script as any)._loaded = true;
          setReady(true);
          window.dispatchEvent(new Event('google-maps-loaded'));
        });
        script.addEventListener('error', onError);
        document.head.appendChild(script);
      } catch (e) {
        console.error('Maps loader error:', e);
      }
    })();

    return () => {
      canceled = true;
      if (script) {
        script.removeEventListener('load', onLoad);
        script.removeEventListener('error', onError);
      }
    };
  }, []);

  return ready;
}
