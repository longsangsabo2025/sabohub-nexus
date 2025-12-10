import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingSpinner = ({ size = "md", className }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  return (
    <Loader2 
      className={cn("animate-spin text-primary", sizeClasses[size], className)} 
    />
  );
};

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  loadingText?: string;
}

export const LoadingOverlay = ({ 
  isLoading, 
  children, 
  className,
  loadingText = "Đang tải..." 
}: LoadingOverlayProps) => {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
          <div className="flex flex-col items-center space-y-2">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-muted-foreground">{loadingText}</p>
          </div>
        </div>
      )}
    </div>
  );
};

interface FullPageLoadingProps {
  loadingText?: string;
}

export const FullPageLoading = ({ loadingText = "Đang tải..." }: FullPageLoadingProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size="lg" />
        <h2 className="text-xl font-semibold text-foreground">SABOHUB</h2>
        <p className="text-muted-foreground">{loadingText}</p>
      </div>
    </div>
  );
};