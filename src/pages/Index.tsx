import { Hero } from "@/components/landing/Hero";
import { StatsBar } from "@/components/landing/StatsBar";
import { Features } from "@/components/landing/Features";
import { TargetUsers } from "@/components/landing/TargetUsers";
import { Benefits } from "@/components/landing/Benefits";
import { TechStack } from "@/components/landing/TechStack";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background dark">
      <Hero />
      <StatsBar />
      <Features />
      <TargetUsers />
      <Benefits />
      <TechStack />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
