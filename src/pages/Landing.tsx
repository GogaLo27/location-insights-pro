import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  BarChart3, 
  MessageSquare, 
  Brain, 
  Star, 
  CheckCircle, 
  Users, 
  Zap, 
  FileText, 
  Calendar, 
  Download, 
  Filter, 
  Settings, 
  Shield, 
  Clock, 
  TrendingUp, 
  Award, 
  Globe, 
  Target,
  ArrowRight,
  Play,
  Quote,
  ChevronRight,
  CheckCircle2,
  X
} from "lucide-react";
import { useAuth } from "@/components/ui/auth-provider";
import Footer from "@/components/Footer";

const Landing = () => {
  const { signInWithGoogle, signInAsDemo, user } = useAuth();

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Sentiment Analysis",
      description: "Advanced machine learning algorithms analyze every review to understand customer emotions, satisfaction levels, and key themes. Get instant insights into what customers love and what needs improvement.",
      benefits: ["Real-time sentiment scoring", "Emotion detection", "Topic extraction", "Trend analysis"]
    },
    {
      icon: MessageSquare,
      title: "Smart Reply Generation",
      description: "Generate personalized, professional responses to customer reviews that maintain your brand voice and improve engagement. Save hours of manual work while maintaining quality.",
      benefits: ["Brand-consistent responses", "Tone customization", "Multi-language support", "Template library"]
    },
    {
      icon: BarChart3,
      title: "Comprehensive Analytics Dashboard",
      description: "Deep dive into customer sentiment trends, rating patterns, and actionable business insights. Track performance over time and identify growth opportunities.",
      benefits: ["Custom date ranges", "Performance comparisons", "Export capabilities", "Real-time updates"]
    },
    {
      icon: Zap,
      title: "Bulk Operations",
      description: "Process hundreds of reviews simultaneously with bulk analysis and reply generation. Scale your review management without scaling your workload.",
      benefits: ["Batch processing", "Progress tracking", "Error handling", "Time savings"]
    },
    {
      icon: FileText,
      title: "Review Templates",
      description: "Create and manage response templates for different scenarios. Ensure consistent, professional communication across all customer interactions.",
      benefits: ["Custom templates", "Category-based responses", "Variable substitution", "Template analytics"]
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level security with encrypted data storage, secure API access, and compliance with industry standards. Your data is always protected.",
      benefits: ["Data encryption", "API security", "Compliance ready", "Audit trails"]
    }
  ];

  const plans = [
    {
      name: "Starter",
      price: "$49",
      description: "Perfect for small businesses getting started",
      features: [
        "Up to 1 location",
        "30 days of analytics",
        "CSV export",
        "Email support"
      ],
      popular: false,
      cta: "Get Started"
    },
    {
      name: "Professional",
      price: "$99",
      description: "Advanced features for growing businesses",
      features: [
        "Up to 5 locations",
        "AI sentiment analysis",
        "AI reply generation",
        "Bulk operations",
        "Extended analytics data",
        "Custom date ranges",
        "Comparison mode",
        "PDF export",
        "Priority support"
      ],
      popular: true,
      cta: "Most Popular"
    },
    {
      name: "Enterprise",
      price: "$199",
      description: "Complete solution for large businesses",
      features: [
        "Unlimited locations",
        "All Professional features",
        "Review templates",
        "White-label reports",
        "Brand management",
        "24/7 dedicated support"
      ],
      popular: false,
      cta: "Contact Sales"
    }
  ];

  const stats = [
    { number: "10,000+", label: "Reviews Analyzed Daily" },
    { number: "500+", label: "Businesses Trust Us" },
    { number: "99.9%", label: "Uptime Guarantee" },
    { number: "24/7", label: "Customer Support" }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Marketing Director",
      company: "TechStart Inc.",
      content: "ReviewLip transformed how we handle customer feedback. The AI insights helped us identify key improvement areas and increased our customer satisfaction by 40%.",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Operations Manager",
      company: "RetailPlus",
      content: "The bulk operations feature saved us hours every week. We can now respond to all reviews professionally while maintaining our brand voice.",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      role: "CEO",
      company: "ServicePro",
      content: "The analytics dashboard gives us insights we never had before. We can now make data-driven decisions about our customer experience strategy.",
      rating: 5
    }
  ];

  const faqs = [
    {
      question: "How does the AI sentiment analysis work?",
      answer: "Our AI uses advanced natural language processing to analyze the emotional tone, sentiment, and key themes in customer reviews. It provides real-time scoring and insights to help you understand customer satisfaction levels."
    },
    {
      question: "Can I customize the AI-generated responses?",
      answer: "Yes! You can customize the tone, style, and content of AI-generated responses. You can also create custom templates and set specific guidelines for your brand voice."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use enterprise-grade encryption, secure API connections, and comply with industry security standards. Your data is never shared with third parties without your explicit consent."
    },
    {
      question: "Can I integrate with other tools?",
      answer: "Yes, our Enterprise plan includes API access for seamless integration with your existing CRM, marketing tools, and business systems."
    },
    {
      question: "What happens if I exceed my plan limits?",
      answer: "We'll notify you when you're approaching your limits and offer upgrade options. We never cut off your service - we work with you to find the right solution."
    },
    {
      question: "Do you offer a free trial?",
      answer: "Yes! You can try our demo with sample data to explore all features, or start with our Starter plan and upgrade anytime as your business grows."
    }
  ];

  if (user) {
    window.location.href = '/plan-selection';
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50 shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2 animate-fade-in">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-lg animate-float">
              <span className="text-primary-foreground font-bold text-sm">RL</span>
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ReviewLip
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={signInWithGoogle}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 animate-fade-in border-0"
              style={{ animationDelay: '0.2s' }}
            >
              Sign in with Google
            </Button>
            <Button
              variant="outline"
              onClick={signInAsDemo}
              className="animate-fade-in border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-800 bg-white"
              style={{ animationDelay: '0.25s' }}
            >
              Continue with Demo
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-purple-50"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>

        <div className="container mx-auto text-center relative z-10">
          <Badge variant="secondary" className="mb-4 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 text-blue-800 animate-fade-in hover:scale-105 transition-transform duration-200">
            <Brain className="w-4 h-4 mr-2" />
            AI-Powered Business Intelligence
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Transform Your Google Business Insights
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
            Get AI-powered sentiment analysis, automated review responses, and deep insights
            from your Google Business Profile. Turn customer feedback into actionable business intelligence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <Button
              onClick={signInWithGoogle}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-lg px-8 py-6 border-0"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Start Free Analysis
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-800 transition-all duration-300 hover:scale-105 group bg-white"
              asChild
            >
              <a href="#features">
                <MessageSquare className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Learn More
              </a>
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="text-lg px-8 py-6 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-800 border-0"
              onClick={signInAsDemo}
            >
              Explore Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">{stat.number}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <Badge variant="secondary" className="mb-4 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 text-blue-800">
              <Award className="w-4 h-4 mr-2" />
              Enterprise-Grade Features
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Everything You Need to Master Customer Feedback
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From AI-powered insights to automated responses, we provide the complete toolkit for modern review management
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className="border-2 border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-lg hover:-translate-y-2 group animate-fade-in bg-white"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg group-hover:scale-110 transition-transform duration-300 shadow-sm">
                      <feature.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="group-hover:text-blue-600 transition-colors text-gray-900">{feature.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600 group-hover:text-gray-800 transition-colors">{feature.description}</p>
                  <div className="space-y-2">
                    {feature.benefits.map((benefit, benefitIndex) => (
                      <div key={benefitIndex} className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              How ReviewLip Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in minutes and transform your review management process
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Connect Your Google Business</h3>
              <p className="text-gray-600">Securely connect your Google Business Profile to start analyzing your reviews instantly.</p>
            </div>
            <div className="text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">AI Analyzes Your Reviews</h3>
              <p className="text-gray-600">Our AI processes every review to extract sentiment, themes, and actionable insights.</p>
            </div>
            <div className="text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Take Action & Grow</h3>
              <p className="text-gray-600">Respond to reviews, track trends, and make data-driven decisions to improve your business.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <Badge variant="secondary" className="mb-4 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 text-blue-800">
              <Target className="w-4 h-4 mr-2" />
              Choose Your Plan
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Start with any plan and upgrade as you grow. No hidden fees, no long-term contracts.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card
                key={plan.name}
                className={`relative border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 group animate-fade-in ${
                  plan.popular
                    ? "border-blue-500 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 scale-105"
                    : "hover:border-blue-300 bg-white"
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg animate-pulse">
                      {plan.cta}
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl group-hover:text-blue-600 transition-colors text-gray-900">{plan.name}</CardTitle>
                  <CardDescription className="text-lg text-gray-600">{plan.description}</CardDescription>
                  <div className="text-4xl font-bold text-blue-600 group-hover:scale-110 transition-transform">
                    {plan.price}
                    <span className="text-lg text-gray-500">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform flex-shrink-0" />
                        <span className="text-sm group-hover:text-blue-600 transition-colors text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={signInWithGoogle}
                    className={`w-full transition-all duration-300 hover:scale-105 border-0 ${
                      plan.popular
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {plan.cta}
                  </Button>
                  <Button variant="outline" className="w-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-800 bg-white" onClick={signInAsDemo}>
                    Try Demo
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8 animate-fade-in">
            <p className="text-gray-600">
              All plans include 14-day free trial • No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <Badge variant="secondary" className="mb-4 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 text-blue-800">
              <Quote className="w-4 h-4 mr-2" />
              Customer Stories
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Loved by Businesses Worldwide
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See how ReviewLip is helping businesses transform their customer experience
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-2 border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-lg hover:-translate-y-2 group animate-fade-in bg-white" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-4 italic">"{testimonial.content}"</p>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600">
                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-600">{testimonial.role}, {testimonial.company}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to know about ReviewLip
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index} className="border-2 border-gray-200 hover:border-blue-300 transition-all duration-300 animate-fade-in bg-white" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-3 text-blue-600">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50">
        <div className="container mx-auto text-center">
          <div className="animate-fade-in">
            <Badge variant="secondary" className="mb-4 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 text-blue-800">
              <TrendingUp className="w-4 h-4 mr-2" />
              Ready to Get Started?
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Transform Your Review Management Today
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of businesses using AI to understand their customers better and drive growth
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={signInWithGoogle}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 text-lg px-12 py-6 border-0"
              >
                <Star className="w-5 h-5 mr-2" />
                Start Your Free Trial
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-6 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-800 transition-all duration-300 hover:scale-105 bg-white"
                onClick={signInAsDemo}
              >
                <Play className="w-5 h-5 mr-2" />
                Try Demo First
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;