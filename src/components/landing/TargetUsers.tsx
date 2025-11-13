import { motion } from "framer-motion";
import { Crown, Users, User } from "lucide-react";

const users = [
  {
    icon: Crown,
    title: "CEO/Chủ Doanh Nghiệp",
    features: ["Theo dõi real-time", "Quản lý nhân viên", "Giám sát doanh thu"],
    gradient: "from-primary to-purple",
  },
  {
    icon: Users,
    title: "Manager/Quản Lý",
    features: ["Quản lý đội ngũ", "Phân công công việc", "Xử lý đơn hàng"],
    gradient: "from-purple to-secondary",
  },
  {
    icon: User,
    title: "Staff/Nhân Viên",
    features: ["Chấm công GPS", "Nhận nhiệm vụ", "Theo dõi lịch"],
    gradient: "from-secondary to-cyan",
  },
];

export const TargetUsers = () => {
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
            Dành Cho <span className="gradient-text">Mọi Vai Trò</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Giải pháp phù hợp cho từng vị trí trong tổ chức
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {users.map((user, index) => (
            <motion.div
              key={user.title}
              className="glass-card p-8 rounded-2xl hover:scale-105 transition-transform cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${user.gradient} flex items-center justify-center mb-6 mx-auto`}>
                <user.icon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-6 text-center text-foreground">{user.title}</h3>
              <ul className="space-y-3">
                {user.features.map((feature) => (
                  <li key={feature} className="flex items-center text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-primary mr-3" />
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
