import {
  LinkIcon,
  DownloadIcon,
  BrainIcon,
  ArrowRightIcon,
} from "lucide-react";
import { useAuth } from "@/components/ui/auth-provider";

export function HowItWorks() {
  const { signInWithGoogle } = useAuth();

  const steps = [
    {
      number: "01",
      icon: LinkIcon,
      title: "Connect Google Business Account",
      description:
        "Securely link your Google Business Profile with OAuth authentication. No passwords needed.",
      details: "One-click integration with enterprise-grade security",
    },
    {
      number: "02",
      icon: DownloadIcon,
      title: "Fetch Reviews Instantly",
      description:
        "Our system automatically pulls all your reviews and keeps them synchronized in real-time.",
      details: "Automatic sync across all your business locations",
    },
    {
      number: "03",
      icon: BrainIcon,
      title: "Get AI Insights & Metrics",
      description:
        "View your comprehensive dashboard with sentiment analysis, trends, and actionable recommendations.",
      details: "Powered by advanced machine learning algorithms",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#2b394c] mb-4">
            How It Works -{" "}
            <span className="text-[#2b394c]">
              Simple & Powerful
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get started in minutes with our streamlined 3-step process. No
            technical expertise required.
          </p>
        </div>

        <div className="relative">
          {/* Desktop Flow */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="flex items-center">
                    {/* Step Card */}
                    <div className="relative group">
                      <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 w-80 hover:border-[#ecc00c] hover:shadow-xl transition-all duration-300">
                        {/* Step Number */}
                        <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-[#2b394c] to-[#ecc00c] rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {step.number}
                        </div>

                        {/* Icon */}
                        <div className="bg-[#2b394c]/10 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#ecc00c]/20 transition-colors">
                          <Icon className="w-8 h-8 text-[#2b394c]" />
                        </div>

                        {/* Content */}
                        <h3 className="text-xl font-bold text-gray-900 mb-3">
                          {step.title}
                        </h3>
                        <p className="text-gray-600 mb-4 leading-relaxed">
                          {step.description}
                        </p>
                        <p className="text-sm text-[#2b394c] font-medium">
                          {step.details}
                        </p>
                      </div>
                    </div>

                    {/* Arrow */}
                    {index < steps.length - 1 && (
                      <div className="mx-8 flex items-center">
                        <ArrowRightIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Flow */}
          <div className="lg:hidden space-y-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative">
                  <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-[#ecc00c] hover:shadow-lg transition-all duration-300">
                    {/* Step Number */}
                    <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-[#2b394c] to-[#ecc00c] rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {step.number}
                    </div>

                    <div className="flex items-start space-x-4 ml-4">
                      {/* Icon */}
                      <div className="bg-[#2b394c]/10 w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon className="w-7 h-7 text-[#2b394c]" />
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {step.title}
                        </h3>
                        <p className="text-gray-600 mb-3 leading-relaxed">
                          {step.description}
                        </p>
                        <p className="text-sm text-[#2b394c] font-medium">
                          {step.details}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="flex justify-center py-4">
                      <div className="w-0.5 h-8 bg-gray-300"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-[#2b394c]/10 to-[#ecc00c]/10 rounded-2xl p-8 border border-[#2b394c]/20">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to get started?
            </h3>
            <p className="text-gray-600 mb-6">
              Join thousands of businesses already using Dibiex to
              improve their customer experience
            </p>
            <button 
              onClick={signInWithGoogle}
              className="bg-[#2b394c] hover:bg-[#2b394c]/90 text-white px-8 py-3 rounded-lg font-medium transition-all duration-300 hover:shadow-lg"
            >
              Get Started Now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
