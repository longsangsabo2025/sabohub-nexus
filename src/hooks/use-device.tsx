import { useState, useEffect } from 'react';

// Hook để detect mobile device
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(globalThis.innerWidth < 768);
    };

    checkDevice();
    globalThis.addEventListener('resize', checkDevice);

    return () => {
      globalThis.removeEventListener('resize', checkDevice);
    };
  }, []);

  return isMobile;
};

// Hook để detect if app is installed as PWA
export const useIsPWA = () => {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    if (typeof globalThis !== 'undefined') {
      const isInstalled = 
        globalThis.matchMedia?.('(display-mode: standalone)').matches ||
        (globalThis.navigator as Window['navigator'] & { standalone?: boolean })?.standalone ||
        document.referrer.includes('android-app://');
      
      setIsPWA(isInstalled);
    }
  }, []);

  return isPWA;
};

// Hook để detect touch device
export const useIsTouch = () => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof globalThis !== 'undefined') {
      setIsTouch(
        'ontouchstart' in globalThis ||
        globalThis.navigator?.maxTouchPoints > 0
      );
    }
  }, []);

  return isTouch;
};

// Hook để get device info
export const useDeviceInfo = () => {
  const isMobile = useIsMobile();
  const isPWA = useIsPWA();
  const isTouch = useIsTouch();

  return {
    isMobile,
    isPWA,
    isTouch,
    isDesktop: !isMobile,
  };
};