/**
 * SABO Billiards - Centralized Constants & Configuration
 * Single source of truth for all SABO Billiards related data
 */

// Company Information
export const SABO_BILLIARDS = {
  COMPANY_ID: 'feef10d3-899d-4554-8107-b2256918213a',
  NAME: 'SABO Billiards',
  FULL_NAME: 'SABO Billiards - TP. Vũng Tàu',
  BUSINESS_TYPE: 'billiards_hall',
  
  // Location Details
  ADDRESS: '601A Nguyễn An Ninh, Vũng Tàu, Bà Rịa - Vũng Tàu',
  COORDINATES: {
    LATITUDE: 10.3631589,
    LONGITUDE: 107.0940979
  },
  CHECK_IN_RADIUS: 100, // meters
  
  // Social Media & Marketing
  FACEBOOK: {
    PAGE_ID: '118356497898536',
    PAGE_TOKEN: 'EAATDePmTd34BQDJMP9a6IqX79SZBtE1MuOuvP1cyZAWQ1Kmh8ceGrsUpyYk0P7P0S7IZAHMndzVt11gCWPunK6KWKl4rospYBj9Bm75mdOaKpX3nTay7kX5AGT5ZBdY2c8ippUXdhyL7CQeCw1ijB8gksw2NqT4j5svZCxt9IuCFblGksu5PFYwyMuT8Qxi4Np2oeZBTkZD',
    AD_ACCOUNT_ID: 'act_5736017743171140'
  },
  INSTAGRAM: {
    ID: '17841474279844606'
  },
  
  // Contact Information
  CONTACT: {
    EMAIL: 'contact@sabobilliards.com',
    PHONE: '+84 123 456 789',
    WEBSITE: 'https://sabobilliards.com'
  }
} as const;

// Database Tables Related to SABO Billiards
export const SABO_TABLES = {
  COMPANIES: 'companies',
  EMPLOYEES: 'employees',
  USERS: 'users',
  TASKS: 'tasks',
  TASK_TEMPLATES: 'task_templates',
  ORDERS: 'orders',
  CHECKINS: 'checkins',
  DOCUMENTS: 'documents',
  TABLES: 'tables'
} as const;

// User Roles within SABO Billiards
export const SABO_ROLES = {
  CEO: 'ceo',
  MANAGER: 'manager',
  STAFF: 'staff',
  TRAINEE: 'trainee'
} as const;

// Business Hours & Operations
export const SABO_OPERATIONS = {
  BUSINESS_HOURS: {
    OPEN: '08:00',
    CLOSE: '23:00',
    DAYS: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  },
  SERVICES: [
    'pool_billiards',
    'snooker',
    'carom_billiards',
    'food_beverage',
    'events',
    'tournaments'
  ]
} as const;

// Export types for TypeScript
export type SaboRole = typeof SABO_ROLES[keyof typeof SABO_ROLES];
export type SaboTable = typeof SABO_TABLES[keyof typeof SABO_TABLES];
export type SaboService = typeof SABO_OPERATIONS.SERVICES[number];