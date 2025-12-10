// Mobile-first responsive utility classes
export const mobileOptimizedClasses = {
  // Container classes
  container: "container mx-auto px-4 sm:px-6 lg:px-8",
  
  // Text sizes (mobile-first)
  heading: {
    hero: "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold",
    section: "text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold",
    card: "text-lg sm:text-xl md:text-2xl font-bold",
    small: "text-base sm:text-lg font-semibold",
  },
  
  // Grid layouts
  grid: {
    features: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8",
    stats: "grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 lg:gap-8",
    users: "grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8",
  },
  
  // Spacing
  section: "py-12 sm:py-16 md:py-20 lg:py-24",
  card: "p-4 sm:p-6 md:p-8",
  
  // Buttons
  button: {
    primary: "px-6 sm:px-8 md:px-12 py-3 sm:py-4 md:py-6 text-base sm:text-lg md:text-xl",
    secondary: "px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg",
  },
  
  // Touch targets (minimum 44px for accessibility)
  touchTarget: "min-h-[44px] min-w-[44px]",
  
  // Safe areas for mobile devices
  safeArea: "pt-safe-top pb-safe-bottom pl-safe-left pr-safe-right",
};

// Mobile optimization utilities
export const mobileUtils = {
  // Prevent zoom on iOS
  preventZoom: "user-select-none touch-action-manipulation",
  
  // Better scrolling on mobile
  smoothScroll: "scroll-smooth overscroll-contain",
  
  // Hide scrollbars
  hideScrollbar: "scrollbar-hide",
  
  // Mobile-friendly animations
  reducedMotion: "motion-reduce:transform-none motion-reduce:transition-none",
};