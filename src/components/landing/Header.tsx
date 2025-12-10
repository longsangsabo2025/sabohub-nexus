import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, UserPlus, LayoutDashboard, Menu, X, Users } from 'lucide-react';
import { useState } from 'react';

export const Header = () => {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              SABOHUB
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/#features" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
              Tính năng
            </Link>
            <Link to="/#benefits" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
              Lợi ích
            </Link>
            <Link to="/#pricing" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
              Bảng giá
            </Link>
            <Link to="/#contact" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
              Liên hệ
            </Link>
          </nav>

          {/* Auth Buttons - Desktop */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Button asChild className="bg-gradient-to-r from-primary to-secondary text-white">
                <Link to="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  <Link to="/staff-login">
                    <Users className="mr-2 h-4 w-4" />
                    Nhân viên
                  </Link>
                </Button>
                <Button variant="outline" asChild className="border-primary text-primary hover:bg-primary hover:text-white">
                  <Link to="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Đăng nhập
                  </Link>
                </Button>
                <Button asChild className="bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90">
                  <Link to="/signup">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Đăng ký miễn phí
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div
            className="md:hidden py-4 border-t border-border/50"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <nav className="flex flex-col gap-4 mb-4">
              <Link 
                to="/#features" 
                className="text-foreground/80 hover:text-foreground transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Tính năng
              </Link>
              <Link 
                to="/#benefits" 
                className="text-foreground/80 hover:text-foreground transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Lợi ích
              </Link>
              <Link 
                to="/#pricing" 
                className="text-foreground/80 hover:text-foreground transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Bảng giá
              </Link>
              <Link 
                to="/#contact" 
                className="text-foreground/80 hover:text-foreground transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Liên hệ
              </Link>
            </nav>
            
            <div className="flex flex-col gap-2">
              {user ? (
                <Button asChild className="w-full bg-gradient-to-r from-primary to-secondary text-white">
                  <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Button variant="ghost" asChild className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 justify-center">
                    <Link to="/staff-login" onClick={() => setIsMobileMenuOpen(false)}>
                      <Users className="mr-2 h-4 w-4" />
                      Đăng nhập Nhân viên
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full border-primary text-primary hover:bg-primary hover:text-white">
                    <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <LogIn className="mr-2 h-4 w-4" />
                      Đăng nhập
                    </Link>
                  </Button>
                  <Button asChild className="w-full bg-gradient-to-r from-primary to-secondary text-white">
                    <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Đăng ký miễn phí
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
};
