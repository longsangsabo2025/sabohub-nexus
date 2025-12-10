import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Hero } from "@/components/landing/Hero";
import { StatsBar } from "@/components/landing/StatsBar";
import { Features } from "@/components/landing/Features";
import { TargetUsers } from "@/components/landing/TargetUsers";
import { Benefits } from "@/components/landing/Benefits";
import { TechStack } from "@/components/landing/TechStack";
import { CallToAction } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { 
  HeroSkeleton, 
  StatsBarSkeleton, 
  FeaturesSkeleton, 
  TargetUsersSkeleton 
} from "@/components/ui/skeleton-variants";

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial page load
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background dark">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <HeroSkeleton />
          <StatsBarSkeleton />
          <FeaturesSkeleton />
          <TargetUsersSkeleton />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen bg-background dark"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Hero />
      <StatsBar />
      <Features />
      <TargetUsers />
      <Benefits />
      <TechStack />
      <CallToAction />
      <Footer />
    </motion.div>
  );
};

export default Index;