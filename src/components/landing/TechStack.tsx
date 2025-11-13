import { motion } from "framer-motion";
import { Smartphone, Database, Zap, Layers, Palette } from "lucide-react";

const technologies = [
  { icon: Smartphone, name: "Flutter/Dart", description: "Cross-platform" },
  { icon: Database, name: "PostgreSQL", description: "Supabase Backend" },
  { icon: Zap, name: "Real-time Sync", description: "Instant Updates" },
  { icon: Layers, name: "Clean Architecture", description: "Scalable Code" },
  { icon: Palette, name: "Material Design", description: "Modern UI" },
];

export const TechStack = () => {
  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Công Nghệ Tiên Tiến</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Xây dựng trên nền tảng công nghệ hiện đại nhất
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-6xl mx-auto">
          {technologies.map((tech, index) => (
            <motion.div
              key={tech.name}
              className="glass-card p-6 rounded-xl text-center hover:glow-purple transition-shadow cursor-pointer group"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <tech.icon className="w-12 h-12 mx-auto mb-4 text-primary group-hover:scale-110 transition-transform" />
              <h3 className="font-bold mb-2 text-foreground">{tech.name}</h3>
              <p className="text-sm text-muted-foreground">{tech.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
