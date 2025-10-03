import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckIcon, XIcon } from "lucide-react";
import { useAuth } from "@/components/ui/auth-provider";

export function PricingSection() {
  const { signInWithGoogle } = useAuth();

  const plans = [
    {
      name: "Starter",
      price: "$49",
      period: "/month",
      description: "Perfect for small businesses getting started",
      popular: false,
      features: [
        { name: "Up to 1 location", included: true },
        { name: "30 days of analytics", included: true },
        { name: "CSV export", included: true },
        { name: "Email support", included: true },
        { name: "Basic sentiment analysis", included: false },
        { name: "AI reply generation", included: false },
        { name: "Bulk operations", included: false },
        { name: "Competitor benchmarking", included: false },
        { name: "API access", included: false },
      ],
      cta: "Get Started",
      highlight: false,
    },
    {
      name: "Professional",
      price: "$99",
      period: "/month",
      description: "Advanced features for growing businesses",
      popular: true,
      features: [
        { name: "Up to 5 locations", included: true },
        { name: "AI sentiment analysis", included: true },
        { name: "AI reply generation", included: true },
        { name: "Bulk operations", included: true },
        { name: "Extended analytics data", included: true },
        { name: "Custom date ranges", included: true },
        { name: "Comparison mode", included: true },
        { name: "PDF export", included: true },
        { name: "Priority support", included: true },
        { name: "API access", included: true },
        { name: "Competitor benchmarking", included: false },
        { name: "Custom integrations", included: false },
      ],
      cta: "Most Popular",
      highlight: true,
    },
    {
      name: "Enterprise",
      price: "$199",
      period: "/month",
      description: "Complete solution for large businesses",
      popular: false,
      features: [
        { name: "Unlimited locations", included: true },
        { name: "All Professional features", included: true },
        { name: "Review templates", included: true },
        { name: "White-label reports", included: true },
        { name: "Brand management", included: true },
        { name: "24/7 dedicated support", included: true },
        { name: "Custom integrations", included: true },
        { name: "Advanced competitor benchmarking", included: true },
        { name: "Dedicated account manager", included: true },
      ],
      cta: "Contact Sales",
      highlight: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#2b394c] mb-4">
            Simple, Transparent{" "}
            <span className="text-[#2b394c]">
              Pricing
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the perfect plan for your business. Start with any plan and upgrade anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl border-2 p-8 ${
                plan.highlight
                  ? "border-[#2b394c] bg-gradient-to-br from-[#2b394c]/10 to-[#ecc00c]/10 shadow-xl scale-105"
                  : "border-gray-200 bg-white hover:border-gray-300"
              } transition-all duration-300 hover:shadow-lg`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-[#2b394c] to-[#ecc00c] text-white px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-xl text-gray-600 ml-1">
                    {plan.period}
                  </span>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <div
                    key={featureIndex}
                    className="flex items-center space-x-3"
                  >
                    {feature.included ? (
                      <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <XIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        feature.included ? "text-gray-700" : "text-gray-400"
                      }`}
                    >
                      {feature.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <Button
                onClick={signInWithGoogle}
                className={`w-full py-3 text-lg font-medium ${
                  plan.highlight
                    ? "bg-[#2b394c] hover:bg-[#2b394c]/90 text-white"
                    : "bg-[#2b394c] hover:bg-[#2b394c]/90 text-white"
                }`}
              >
                {plan.cta}
              </Button>


              {/* Additional Info */}
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  {plan.name === "Enterprise"
                    ? "Custom pricing available"
                    : "No setup fees"}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-[#2b394c]/10 to-[#ecc00c]/10 rounded-2xl p-8 border border-[#2b394c]/20">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Need a custom solution?
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              We offer custom enterprise solutions for businesses with unique
              requirements. Contact our sales team to discuss your specific
              needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={signInWithGoogle}
                className="bg-[#2b394c] hover:bg-[#2b394c]/90 text-white"
              >
                Contact Sales
              </Button>
            </div>
          </div>
        </div>

        {/* FAQ Link */}
        <div className="mt-12 text-center">
          <p className="text-gray-600">
            Have questions about our pricing?{" "}
            <a
              href="#faq"
              className="text-[#2b394c] hover:text-[#ecc00c] font-medium"
            >
              Check our FAQ
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
