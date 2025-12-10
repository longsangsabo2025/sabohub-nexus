import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

const Skeleton = ({ className }: SkeletonProps) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
    />
  );
};

// Hero Section Skeleton
export const HeroSkeleton = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-6 space-y-4">
            <Skeleton className="h-16 w-3/4 mx-auto" />
            <Skeleton className="h-16 w-2/3 mx-auto" />
          </div>
          <Skeleton className="h-8 w-4/5 mx-auto mb-12" />
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Skeleton className="h-14 w-48" />
            <Skeleton className="h-14 w-48" />
          </div>
          <Skeleton className="h-96 w-full max-w-4xl mx-auto rounded-2xl" />
        </div>
      </div>
    </section>
  );
};

// Features Section Skeleton
export const FeaturesSkeleton = () => {
  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Skeleton className="h-12 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={`feature-skeleton-${index}`} className="glass-card p-8 rounded-2xl">
              <Skeleton className="w-16 h-16 rounded-xl mb-6" />
              <Skeleton className="h-6 w-3/4 mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Stats Bar Skeleton
export const StatsBarSkeleton = () => {
  return (
    <section className="py-16 relative">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={`stats-skeleton-${index}`} className="text-center">
              <Skeleton className="h-12 w-20 mx-auto mb-2" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Target Users Skeleton
export const TargetUsersSkeleton = () => {
  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Skeleton className="h-12 w-80 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={`target-users-skeleton-${index}`} className="glass-card p-8 rounded-2xl">
              <Skeleton className="w-20 h-20 rounded-2xl mx-auto mb-6" />
              <Skeleton className="h-8 w-3/4 mx-auto mb-6" />
              <div className="space-y-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={`target-users-feature-${index}-${i}`} className="flex items-center">
                    <Skeleton className="w-2 h-2 rounded-full mr-3" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Generic Card Skeleton
export const CardSkeleton = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="grid md:grid-cols-3 gap-8">
      {Array.from({ length: count }, (_, index) => (
        <div key={`card-skeleton-${index}`} className="glass-card p-8 rounded-2xl">
          <Skeleton className="w-16 h-16 rounded-xl mb-6" />
          <Skeleton className="h-6 w-3/4 mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
};

export { Skeleton };