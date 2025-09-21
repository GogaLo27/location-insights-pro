import { useAuth } from "@/components/ui/auth-provider";
import { EnhancedHeader } from "@/components/EnhancedHeader";
import { EnhancedFooter } from "@/components/EnhancedFooter";
import { EnhancedHeroSection } from "@/components/EnhancedHeroSection";
import { EnhancedFeaturesGrid } from "@/components/EnhancedFeaturesGrid";
import { DashboardPreview } from "@/components/DashboardPreview";
import { HowItWorks } from "@/components/HowItWorks";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { PricingSection } from "@/components/PricingSection";
import { FAQSection } from "@/components/FAQSection";
import { FinalCTASection } from "@/components/FinalCTASection";

const Landing = () => {
  const { user } = useAuth();

  if (user) {
    window.location.href = '/plan-selection';
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <EnhancedHeader />

      {/* Hero Section */}
      <EnhancedHeroSection />

      {/* Key Features */}
      <EnhancedFeaturesGrid />

      {/* Dashboard Preview */}
      <DashboardPreview />

      {/* How It Works */}
      <HowItWorks />

      {/* Customer Testimonials */}
      <TestimonialsSection />

      {/* Pricing */}
      <PricingSection />

      {/* FAQ */}
      <FAQSection />

      {/* Final CTA */}
      <FinalCTASection />

      {/* Footer */}
      <EnhancedFooter />
    </div>
  );
};

export default Landing;