import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLoading } from "@/hooks/use-loading";
import { LoadingSpinner } from "@/components/ui/loading";

const NotFound = () => {
  const navigate = useNavigate();
  const { isLoading, startLoading } = useLoading();

  const handleGoHome = () => {
    startLoading();
    setTimeout(() => {
      navigate('/');
    }, 500);
  };

  const handleGoBack = () => {
    startLoading();
    setTimeout(() => {
      globalThis.history.back();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* 404 Animation */}
          <motion.div 
            className="text-8xl font-bold gradient-text mb-4"
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 1, -1, 0]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            404
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Trang Không Tồn Tại
            </h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
              Hãy kiểm tra lại URL hoặc quay về trang chủ.
            </p>
          </motion.div>

          {/* Search Suggestion */}
          <motion.div 
            className="mb-8 p-4 bg-muted/50 rounded-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Search className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Gợi ý: Hãy thử tìm kiếm nội dung bạn cần tại trang chủ
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Button 
              onClick={handleGoHome} 
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Home className="w-4 h-4 mr-2" />
              )}
              Về Trang Chủ
            </Button>
            
            <Button 
              onClick={handleGoBack} 
              variant="outline" 
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <ArrowLeft className="w-4 h-4 mr-2" />
              )}
              Quay Lại
            </Button>
          </motion.div>

          {/* Fun Easter Egg */}
          <motion.div 
            className="mt-8 text-xs text-muted-foreground/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <p>🎯 SABOHUB - Luôn sẵn sàng phục vụ bạn</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
