# SABO Billiards - Centralized Data Management

## Overview

This system provides a centralized, type-safe way to manage all SABO Billiards data across both the mobile app (`sabohub-app`) and web app (`sabohub-nexus`). Both applications share the same Supabase database, and this system ensures consistency and eliminates duplicate code.

## Key Features

✅ **Single Source of Truth**: All SABO Billiards constants, types, and API calls in one place  
✅ **Type Safety**: Full TypeScript support with shared interfaces  
✅ **React Hooks**: Ready-to-use hooks for common operations  
✅ **Utility Functions**: Helper functions for formatting, calculations, etc.  
✅ **Real-time Data**: Automatic refetching and state management  
✅ **Error Handling**: Consistent error handling across all operations  

## File Structure

```
src/lib/sabo-billiards/
├── constants.ts     # All SABO Billiards constants and configuration
├── types.ts         # TypeScript interfaces and types
├── api.ts          # Supabase API functions
├── hooks.ts        # React hooks for data management
└── index.ts        # Main export file
```

## Quick Start

### 1. Import the system

```typescript
import { 
  SABO_BILLIARDS,
  useSaboCompany,
  useSaboEmployees,
  saboApi,
  saboUtils
} from '@/lib/sabo-billiards';
```

### 2. Use React hooks in components

```typescript
function MyComponent() {
  const { company, loading, error } = useSaboCompany();
  const { employees, createEmployee } = useSaboEmployees();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h1>{SABO_BILLIARDS.NAME}</h1>
      <p>{company?.address}</p>
      <p>Employees: {employees.length}</p>
    </div>
  );
}
```

### 3. Use API functions directly

```typescript
async function handleCreateEmployee() {
  const result = await saboApi.employee.createEmployee({
    name: 'New Employee',
    email: 'new@example.com',
    role: 'staff',
    is_active: true
  });
  
  if (result.success) {
    console.log('Employee created:', result.data);
  } else {
    console.error('Failed:', result.error);
  }
}
```

## Available Hooks

### `useSaboCompany()`
```typescript
const { company, loading, error, refetch, updateCompany } = useSaboCompany();
```

### `useSaboEmployees()`
```typescript
const { employees, loading, error, refetch, createEmployee } = useSaboEmployees();
```

### `useSaboTasks(filters?)`
```typescript
const { tasks, loading, error, refetch, createTask } = useSaboTasks({ 
  status: 'pending' 
});
```

### `useSaboTodayCheckins()`
```typescript
const { checkins, loading, error, refetch } = useSaboTodayCheckins();
```

### `useSaboOrders(filters?)`
```typescript
const { orders, loading, error, refetch } = useSaboOrders({ 
  date: '2025-12-10' 
});
```

### `useSaboDashboardStats()`
```typescript
const stats = useSaboDashboardStats();
// Returns: { totalEmployees, activeEmployees, todayCheckins, pendingTasks, etc. }
```

## Constants Reference

```typescript
SABO_BILLIARDS.COMPANY_ID         // Company UUID
SABO_BILLIARDS.NAME               // 'SABO Billiards'
SABO_BILLIARDS.ADDRESS            // Full address
SABO_BILLIARDS.COORDINATES        // { LATITUDE, LONGITUDE }
SABO_BILLIARDS.CHECK_IN_RADIUS    // Check-in radius in meters
SABO_BILLIARDS.FACEBOOK.PAGE_ID   // Facebook page ID
SABO_BILLIARDS.CONTACT.EMAIL      // Contact email
```

## Utility Functions

```typescript
// Format phone numbers
saboUtils.formatPhone('0123456789') // '+84123456789'

// Calculate distance
saboUtils.calculateDistance(lat1, lon1, lat2, lon2) // distance in meters

// Check if within check-in radius
saboUtils.isWithinCheckinRadius(userLat, userLon) // boolean

// Format currency
saboUtils.formatCurrency(100000) // '100.000 ₫'

// Format dates
saboUtils.formatDate('2025-12-10') // 'Thứ Ba, 10 tháng 12, 2025'

// Get Google Maps URL
saboUtils.getGoogleMapsUrl() // Google Maps URL for SABO location
```

## Migration Script

To migrate existing code to use this centralized system:

```bash
npm run migrate:sabo-data
# or
node scripts/migrate-sabo-data.ts
```

This script will:
- Replace hardcoded company IDs with `SABO_BILLIARDS.COMPANY_ID`
- Replace hardcoded addresses with `SABO_BILLIARDS.ADDRESS`  
- Replace direct Supabase calls with centralized API functions
- Add necessary imports

## Best Practices

### ✅ DO
- Always use `SABO_BILLIARDS.COMPANY_ID` instead of hardcoded UUIDs
- Use the provided React hooks for data fetching
- Use `saboApi` functions for database operations
- Use `saboUtils` for common formatting and calculations

### ❌ DON'T
- Hardcode company information
- Make direct Supabase calls for SABO data
- Duplicate API logic across components
- Mix different data fetching patterns

## Error Handling

All API functions return a consistent response format:

```typescript
interface SaboApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}
```

Handle errors consistently:

```typescript
const result = await saboApi.employee.createEmployee(data);

if (result.success) {
  // Handle success
  console.log('Success:', result.data);
} else {
  // Handle error
  console.error('Error:', result.error);
  // Show user-friendly error message
}
```

## Extending the System

### Adding new API functions

1. Add the function to the appropriate API object in `api.ts`
2. Add corresponding types in `types.ts` if needed
3. Create React hooks in `hooks.ts` for common use cases
4. Export from `index.ts`

### Adding new constants

1. Add to the appropriate section in `constants.ts`
2. Export the type if needed
3. Update documentation

## Synchronization with Mobile App

Both the web app (`sabohub-nexus`) and mobile app (`sabohub-app`) should use identical:
- Company ID constants
- API endpoint patterns  
- Data validation rules
- Business logic

The mobile app can implement similar patterns using Dart/Flutter while maintaining the same data contracts.

## Troubleshooting

### Common Issues

1. **Import errors**: Make sure you're importing from `@/lib/sabo-billiards`
2. **Type errors**: Check that your TypeScript types match the interfaces in `types.ts`
3. **API errors**: Verify your Supabase environment variables are set correctly
4. **Hook not updating**: Make sure you're calling the refetch function after mutations

### Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Example Implementation

See `src/components/sabo-billiards/SaboBilliardsDashboard.tsx` for a complete example of using this system in a React component.