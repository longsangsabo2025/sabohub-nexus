/**
 * SABO Billiards - Main Export File
 * Centralized exports for all SABO Billiards functionality
 */

import { SABO_BILLIARDS } from './constants';

// Constants and Configuration
export * from './constants';

// TypeScript Types
export * from './types';

// API Functions
export * from './api';

// React Hooks
export * from './hooks';

// Re-export the main API client as default
export { default as saboApi } from './api';

// Utility functions
export const saboUtils = {
  /**
   * Format Vietnamese phone number
   */
  formatPhone: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('84')) {
      return `+${cleaned}`;
    }
    if (cleaned.startsWith('0')) {
      return `+84${cleaned.substring(1)}`;
    }
    return `+84${cleaned}`;
  },

  /**
   * Calculate distance between two coordinates
   */
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  },

  /**
   * Check if coordinates are within check-in radius
   */
  isWithinCheckinRadius: (userLat: number, userLon: number): boolean => {
    const { COORDINATES, CHECK_IN_RADIUS } = SABO_BILLIARDS;
    const distance = saboUtils.calculateDistance(
      userLat, userLon, 
      COORDINATES.LATITUDE, COORDINATES.LONGITUDE
    );
    return distance <= CHECK_IN_RADIUS;
  },

  /**
   * Format currency (VND)
   */
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  },

  /**
   * Format date for Vietnamese locale
   */
  formatDate: (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  },

  /**
   * Format time for Vietnamese locale
   */
  formatTime: (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Generate Google Maps URL
   */
  getGoogleMapsUrl: (lat?: number, lon?: number): string => {
    const { COORDINATES } = SABO_BILLIARDS;
    const latitude = lat || COORDINATES.LATITUDE;
    const longitude = lon || COORDINATES.LONGITUDE;
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }
};