import { Facebook, Twitter, Linkedin, Mail, Phone, MapPin } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-border py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Company Info */}
          <div>
            <h3 className="text-2xl font-bold gradient-text mb-4">SABOHUB</h3>
            <p className="text-muted-foreground mb-4">
              Nền tảng quản lý thông minh cho doanh nghiệp dịch vụ
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-lg glass-card flex items-center justify-center hover:glow-purple transition-shadow">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg glass-card flex items-center justify-center hover:glow-purple transition-shadow">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg glass-card flex items-center justify-center hover:glow-cyan transition-shadow">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-foreground">Sản Phẩm</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Tính năng</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Bảng giá</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Demo</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Tải xuống</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-foreground">Hỗ Trợ</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Trung tâm trợ giúp</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Hướng dẫn</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">API Docs</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Liên hệ</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-foreground">Liên Hệ</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-muted-foreground">
                <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>contact@sabohub.com</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <Phone className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>+84 123 456 789</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Hà Nội, Việt Nam</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border text-center text-muted-foreground">
          <p>&copy; 2025 SABOHUB. All rights reserved. Made with ❤️ in Vietnam</p>
        </div>
      </div>
    </footer>
  );
};
