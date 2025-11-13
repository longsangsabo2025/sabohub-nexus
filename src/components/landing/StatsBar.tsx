import { motion } from "framer-motion";
import { Grid3x3, Zap, Smartphone, Shield } from "lucide-react";

const stats = [
  { icon: Grid3x3, label: "8 Hệ Thống Tích Hợp", value: "8+" },
  { icon: Zap, label: "Đồng Bộ Thời Gian Thực", value: "100%" },
  { icon: Smartphone, label: "Đa Nền Tảng", value: "3+" },
  { icon: Shield, label: "Bảo Mật", value: "100%" },
];

export const StatsBar = () => {
  return (
    <section className="py-16 relative">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              className="glass-card p-6 rounded-xl text-center hover:scale-105 transition-transform cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <stat.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
              <div className="text-3xl font-bold gradient-text mb-2 font-mono">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
