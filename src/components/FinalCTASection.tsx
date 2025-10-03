import { Button } from "@/components/ui/button";
import { ArrowRightIcon, CheckIcon } from "lucide-react";
import { useAuth } from "@/components/ui/auth-provider";

export function FinalCTASection() {
  const { signInWithGoogle, signInAsDemo } = useAuth();

  const benefits = [
    "No credit card required",
    "Instant access",
    "Cancel anytime",
    "Setup in under 5 minutes",
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-[#2b394c] via-[#2b394c]/90 to-[#ecc00c]/20 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main Headline */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Ready to Unlock the Power of Your Reviews?
          </h2>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-gray-200 mb-8 leading-relaxed">
            Join thousands of businesses already using AI-powered insights to
            improve their customer experience and grow their revenue.
          </p>

          {/* Benefits List */}
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 text-gray-200"
              >
                <CheckIcon className="w-5 h-5 text-[#ecc00c]" />
                <span className="text-sm sm:text-base">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={signInWithGoogle}
              className="bg-[#2b394c] hover:bg-[#2b394c]/90 text-white px-12 py-4 text-xl font-semibold rounded-xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105"
            >
              Get Started Now
              <ArrowRightIcon className="w-6 h-6 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={signInAsDemo}
              className="border-2 border-white/30 bg-white text-[#2b394c] hover:bg-gray-100 hover:text-[#2b394c] px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300"
            >
              Try Demo First
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="text-center">
            <p className="text-gray-300 text-sm mb-4">
              Trusted by 10,000+ businesses worldwide
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  98%
                </div>
                <div className="text-gray-300 text-sm">
                  Customer Satisfaction
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  2.5M+
                </div>
                <div className="text-gray-300 text-sm">Reviews Analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  32%
                </div>
                <div className="text-gray-300 text-sm">
                  Avg. Satisfaction Increase
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  24/7
                </div>
                <div className="text-gray-300 text-sm">Support Available</div>
              </div>
            </div>
          </div>

          {/* Security Badge */}
          <div className="mt-12 flex justify-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3 border border-white/20">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-[#ecc00c] rounded-full flex items-center justify-center">
                  <CheckIcon className="w-5 h-5 text-[#2b394c]" />
                </div>
                <div className="text-left">
                  <div className="text-white font-medium text-sm">
                    Enterprise Security
                  </div>
                  <div className="text-gray-300 text-xs">
                    SOC 2 Compliant • GDPR Ready
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#2b394c] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#ecc00c] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#2b394c] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Decorative Grid */}
      <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:60px_60px]"></div>
    </section>
  );
}
