import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Smartphone, Globe } from "lucide-react";

export const CTA = () => {
  return (
    <section className="py-32 relative">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Sẵn Sàng Cho <span className="gradient-text">Doanh Nghiệp Của Bạn</span>
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12">
            SABOHUB - Đối tác đáng tin cậy cho sự phát triển
          </p>

          <Button 
            size="lg"
            className="bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 transition-opacity text-xl px-12 py-8 h-auto group mb-8"
          >
            Bắt Đầu Dùng Thử Miễn Phí
            <ArrowRight className="ml-2 group-hover:translate-x-2 transition-transform" />
          </Button>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-muted-foreground">
            <a href="#" className="flex items-center gap-2 hover:text-foreground transition-colors group">
              <Smartphone className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>📱 App Store</span>
            </a>
            <span className="hidden sm:block">|</span>
            <a href="#" className="flex items-center gap-2 hover:text-foreground transition-colors group">
              <Smartphone className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>🤖 Google Play</span>
            </a>
            <span className="hidden sm:block">|</span>
            <a href="#" className="flex items-center gap-2 hover:text-foreground transition-colors group">
              <Globe className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>🌐 Web App</span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
