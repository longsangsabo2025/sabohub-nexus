import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Google Analytics configuration
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';

// Initialize Google Analytics
export const initGA = () => {
  if (typeof globalThis.window !== 'undefined' && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Initialize gtag
    globalThis.window.gtag = globalThis.window.gtag || function(...args: unknown[]) {
      const gtag = globalThis.window.gtag as { q?: unknown[] };
      gtag.q = gtag.q || [];
      gtag.q.push(args);
    };
    globalThis.window.gtag('js', new Date());
    globalThis.window.gtag('config', GA_MEASUREMENT_ID, {
      page_title: document.title,
      page_location: globalThis.window.location.href,
    });
  }
};

// Track page views
export const trackPageView = (path: string) => {
  if (typeof globalThis.window !== 'undefined' && globalThis.window.gtag) {
    globalThis.window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: path,
      page_title: document.title,
      page_location: globalThis.window.location.href,
    });
  }
};

// Track events
export const trackEvent = (
  action: string,
  category: string = 'general',
  label?: string,
  value?: number
) => {
  if (typeof globalThis.window !== 'undefined' && globalThis.window.gtag) {
    globalThis.window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Track user interactions
export const trackClick = (elementName: string, location?: string) => {
  const eventLabel = location ? `${elementName} - ${location}` : elementName;
  trackEvent('click', 'engagement', eventLabel);
};

export const trackFormSubmit = (formName: string) => {
  trackEvent('form_submit', 'engagement', formName);
};

export const trackDownload = (fileName: string) => {
  trackEvent('download', 'engagement', fileName);
};

// Google Analytics Hook
export const useAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Initialize GA on first load
    initGA();
  }, []);

  useEffect(() => {
    // Track page view on route change
    trackPageView(location.pathname + location.search);
  }, [location]);

  return {
    trackEvent,
    trackClick,
    trackFormSubmit,
    trackDownload,
  };
};

// Simple analytics for development/fallback
export const useSimpleAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Log page views in development
    if (import.meta.env.DEV) {
      console.log(`📊 Page view: ${location.pathname}`, {
        title: document.title,
        timestamp: new Date().toISOString(),
      });
    }
  }, [location]);

  const logEvent = (action: string, details?: Record<string, unknown>) => {
    if (import.meta.env.DEV) {
      console.log(`📊 Event: ${action}`, details);
    }
  };

  return {
    logEvent,
    trackClick: (elementName: string) => logEvent('click', { element: elementName }),
    trackFormSubmit: (formName: string) => logEvent('form_submit', { form: formName }),
  };
};

// Global gtag type declaration
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}