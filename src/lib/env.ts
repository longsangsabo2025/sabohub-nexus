// Environment configuration utility
export const env = {
  // App Information
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SABOHUB',
  APP_DESCRIPTION: import.meta.env.VITE_APP_DESCRIPTION || 'Nền tảng quản lý thông minh',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // Environment
  ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT || 'development',
  DEBUG: import.meta.env.VITE_DEBUG === 'true',
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  
  // API Configuration
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  
  // Supabase Configuration
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  
  // Analytics
  GA_MEASUREMENT_ID: import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX',
  
  // Feature Flags
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false',
  ENABLE_ERROR_REPORTING: import.meta.env.VITE_ENABLE_ERROR_REPORTING !== 'false',
} as const;

// Type-safe environment checker
export const isProduction = () => env.ENVIRONMENT === 'production';
export const isDevelopment = () => env.ENVIRONMENT === 'development';
export const isDebugging = () => env.DEBUG;

// Validate required environment variables
export const validateEnv = () => {
  const requiredVars = {
    'VITE_APP_NAME': env.APP_NAME,
    'VITE_API_URL': env.API_URL,
  } as const;

  const missing: string[] = [];
  
  for (const [key, value] of Object.entries(requiredVars)) {
    if (!value || value === 'undefined') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    if (isProduction()) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
};

// Initialize environment validation
if (typeof globalThis !== 'undefined') {
  validateEnv();
}

// Export environment info for debugging
export const getEnvInfo = () => ({
  app: {
    name: env.APP_NAME,
    version: env.APP_VERSION,
    description: env.APP_DESCRIPTION,
  },
  environment: env.ENVIRONMENT,
  debug: env.DEBUG,
  api: {
    url: env.API_URL,
  },
  features: {
    analytics: env.ENABLE_ANALYTICS,
    errorReporting: env.ENABLE_ERROR_REPORTING,
  },
});

// Log environment info in development
if (isDevelopment() && isDebugging()) {
  console.log('🔧 Environment Configuration:', getEnvInfo());
}