import { lazy, Suspense } from "react";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { StatsBar } from "@/components/landing/StatsBar";
import { CardSkeleton } from "@/components/ui/skeleton-variants";

// Lazy load non-critical components
const Features = lazy(() => import("@/components/landing/Features").then(module => ({ default: module.Features })));
const TargetUsers = lazy(() => import("@/components/landing/TargetUsers").then(module => ({ default: module.TargetUsers })));
const Benefits = lazy(() => import("@/components/landing/Benefits").then(module => ({ default: module.Benefits })));
const TechStack = lazy(() => import("@/components/landing/TechStack").then(module => ({ default: module.TechStack })));
const CallToAction = lazy(() => import("@/components/landing/CTA").then(module => ({ default: module.CallToAction })));
const Footer = lazy(() => import("@/components/landing/Footer").then(module => ({ default: module.Footer })));

const Index = () => {
  return (
    <div className="min-h-screen bg-background dark">
      {/* Header with Login/Signup */}
      <Header />
      
      {/* Critical above-the-fold content */}
      <Hero />
      <StatsBar />
      
      {/* Lazy loaded sections with fallbacks */}
      <Suspense fallback={<div className="py-20"><CardSkeleton count={6} /></div>}>
        <Features />
      </Suspense>
      
      <Suspense fallback={<div className="py-20"><CardSkeleton count={3} /></div>}>
        <TargetUsers />
      </Suspense>
      
      <Suspense fallback={<div className="py-20"><CardSkeleton count={4} /></div>}>
        <Benefits />
      </Suspense>
      
      <Suspense fallback={<div className="py-20"><CardSkeleton count={5} /></div>}>
        <TechStack />
      </Suspense>
      
      <Suspense fallback={<div className="py-20"><CardSkeleton count={1} /></div>}>
        <CallToAction />
      </Suspense>
      
      <Suspense fallback={<div className="py-20"><CardSkeleton count={1} /></div>}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
