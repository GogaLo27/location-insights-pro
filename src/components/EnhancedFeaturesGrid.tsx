import { 
  Brain, 
  MessageSquare, 
  BarChart3, 
  Zap, 
  FileText, 
  Shield,
  CheckCircle2
} from "lucide-react";

export function EnhancedFeaturesGrid() {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Sentiment Analysis",
      description: "Advanced machine learning algorithms analyze every review to understand customer emotions, satisfaction levels, and key themes. Get instant insights into what customers love and what needs improvement.",
      benefits: ["Real-time sentiment scoring", "Emotion detection", "Topic extraction", "Trend analysis"],
      color: "blue"
    },
    {
      icon: MessageSquare,
      title: "Smart Reply Generation",
      description: "Generate personalized, professional responses to customer reviews that maintain your brand voice and improve engagement. Save hours of manual work while maintaining quality.",
      benefits: ["Brand-consistent responses", "Tone customization", "Multi-language support", "Template library"],
      color: "green"
    },
    {
      icon: BarChart3,
      title: "Comprehensive Analytics Dashboard",
      description: "Deep dive into customer sentiment trends, rating patterns, and actionable business insights. Track performance over time and identify growth opportunities.",
      benefits: ["Custom date ranges", "Performance comparisons", "Export capabilities", "Real-time updates"],
      color: "purple"
    },
    {
      icon: Zap,
      title: "Bulk Operations",
      description: "Process hundreds of reviews simultaneously with bulk analysis and reply generation. Scale your review management without scaling your workload.",
      benefits: ["Batch processing", "Progress tracking", "Error handling", "Time savings"],
      color: "orange"
    },
    {
      icon: FileText,
      title: "Review Templates",
      description: "Create and manage response templates for different scenarios. Ensure consistent, professional communication across all customer interactions.",
      benefits: ["Custom templates", "Category-based responses", "Variable substitution", "Template analytics"],
      color: "indigo"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level security with encrypted data storage, secure API access, and compliance with industry standards. Your data is always protected.",
      benefits: ["Data encryption", "API security", "Compliance ready", "Audit trails"],
      color: "red"
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: {
        bg: "bg-blue-50",
        icon: "text-blue-600",
        border: "border-blue-200",
        hover: "hover:border-blue-300"
      },
      green: {
        bg: "bg-green-50",
        icon: "text-green-600",
        border: "border-green-200",
        hover: "hover:border-green-300"
      },
      purple: {
        bg: "bg-purple-50",
        icon: "text-purple-600",
        border: "border-purple-200",
        hover: "hover:border-purple-300"
      },
      orange: {
        bg: "bg-orange-50",
        icon: "text-orange-600",
        border: "border-orange-200",
        hover: "hover:border-orange-300"
      },
      indigo: {
        bg: "bg-indigo-50",
        icon: "text-indigo-600",
        border: "border-indigo-200",
        hover: "hover:border-indigo-300"
      },
      red: {
        bg: "bg-red-50",
        icon: "text-red-600",
        border: "border-red-200",
        hover: "hover:border-red-300"
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <section id="features" className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to{" "}
            <span className="text-blue-600">
              Master Customer Feedback
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From AI-powered insights to automated responses, we provide the complete toolkit for modern review management
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const colors = getColorClasses(feature.color);
            const Icon = feature.icon;

            return (
              <div
                key={index}
                className="group relative bg-white rounded-2xl border-2 border-gray-200 p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
              >
                {/* Icon */}
                <div
                  className={`inline-flex items-center justify-center w-16 h-16 ${colors.bg} ${colors.border} border-2 rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className={`w-8 h-8 ${colors.icon}`} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  {feature.description}
                </p>

                {/* Benefits */}
                <div className="space-y-2">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <div key={benefitIndex} className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{benefit}</span>
                    </div>
                  ))}
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-gray-600 mb-6">
            Ready to experience these features?
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-all duration-300 hover:shadow-lg hover:scale-105">
            Start Your Free Trial
          </button>
        </div>
      </div>
    </section>
  );
}
