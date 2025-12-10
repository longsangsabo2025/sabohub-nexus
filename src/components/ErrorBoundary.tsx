import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Here you could send error to logging service
    // logErrorToService(error, errorInfo);
  }

  private readonly handleRefresh = () => {
    globalThis.location.reload();
  };

  private readonly handleGoHome = () => {
    globalThis.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-8">
              <AlertTriangle className="w-20 h-20 text-destructive mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Có lỗi xảy ra
              </h1>
              <p className="text-muted-foreground mb-6">
                Xin lỗi, đã có lỗi không mong muốn xảy ra. Vui lòng thử lại hoặc liên hệ hỗ trợ.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left mb-6 p-4 bg-muted rounded-lg">
                  <summary className="cursor-pointer font-medium mb-2">
                    Chi tiết lỗi (chế độ phát triển)
                  </summary>
                  <pre className="text-xs text-muted-foreground overflow-x-auto">
                    {this.state.error.message}
                    {'\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>

            <div className="space-y-3">
              <Button 
                onClick={this.handleRefresh} 
                className="w-full"
                size="lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tải lại trang
              </Button>
              
              <Button 
                onClick={this.handleGoHome} 
                variant="outline" 
                className="w-full"
                size="lg"
              >
                <Home className="w-4 h-4 mr-2" />
                Về trang chủ
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;