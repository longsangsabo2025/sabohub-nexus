import { motion } from "framer-motion";
import performanceChart from "@/assets/performance-chart.png";
import costSavings from "@/assets/cost-savings.png";
import customerSatisfaction from "@/assets/customer-satisfaction.png";
import scalabilityMap from "@/assets/scalability-map.png";

const benefits = [
  {
    title: "Tăng 70% Hiệu Quả Vận Hành",
    description: "Tự động hóa quy trình, giảm thời gian quản lý, tăng năng suất làm việc",
    image: performanceChart,
    reverse: false,
  },
  {
    title: "Tiết Kiệm Chi Phí Đáng Kể",
    description: "Giảm chi phí vận hành, tối ưu nguồn lực, ROI cao trong 6 tháng đầu",
    image: costSavings,
    reverse: true,
  },
  {
    title: "Trải Nghiệm Khách Hàng Vượt Trội",
    description: "Phục vụ nhanh chóng, theo dõi đơn hàng real-time, tăng sự hài lòng",
    image: customerSatisfaction,
    reverse: false,
  },
  {
    title: "Sẵn Sàng Mở Rộng",
    description: "Dễ dàng mở thêm chi nhánh, quản lý đa địa điểm, mở rộng quy mô không giới hạn",
    image: scalabilityMap,
    reverse: true,
  },
];

export const Benefits = () => {
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
            <span className="gradient-text">Lợi Ích Vượt Trội</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Kết quả thực tế từ khách hàng sử dụng SABOHUB
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto space-y-24">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              className={`flex flex-col ${benefit.reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 items-center`}
              initial={{ opacity: 0, x: benefit.reverse ? 50 : -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex-1">
                <h3 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
                  {benefit.title}
                </h3>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
              <div className="flex-1">
                <div className="glass-card p-6 rounded-2xl glow-cyan">
                  <img 
                    src={benefit.image} 
                    alt={benefit.title}
                    className="w-full rounded-lg"
                    loading="lazy"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
