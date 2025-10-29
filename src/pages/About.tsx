import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EnhancedFooter } from "@/components/EnhancedFooter";
import { 
  Target, 
  Users, 
  Lightbulb, 
  Award,
  TrendingUp,
  Shield,
  Globe,
  Heart,
  CheckCircle,
  Star
} from "lucide-react";
import SEOHead from "@/components/SEOHead";

export default function About() {
  const values = [
    {
      icon: Target,
      title: "Customer-Centric",
      description: "We put our customers at the heart of everything we do, ensuring their success is our success."
    },
    {
      icon: Lightbulb,
      title: "Innovation",
      description: "We continuously push the boundaries of AI technology to deliver cutting-edge solutions."
    },
    {
      icon: Shield,
      title: "Trust & Security",
      description: "Your data security and privacy are our top priorities. We maintain the highest standards."
    },
    {
      icon: Globe,
      title: "Global Impact",
      description: "We're building tools that help businesses worldwide improve their customer experience."
    }
  ];


  const stats = [
    { number: "10,000+", label: "Businesses Served" },
    { number: "50M+", label: "Reviews Analyzed" },
    { number: "99.9%", label: "Uptime" },
    { number: "4.9/5", label: "Customer Rating" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-[#2b394c]/5">
      <SEOHead routePath="/about" />
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button variant="ghost" size="sm" asChild className="hover:bg-[#ecc00c]/10 hover:text-[#ecc00c] transition-colors text-[#2b394c]">
              <Link to="/">
                ← Back to Home
              </Link>
            </Button>
            <div className="flex items-center">
              <img 
                src="/logo.png" 
                alt="Dibiex Logo" 
                className="h-10 w-auto object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2b394c]/5 via-transparent to-[#ecc00c]/10"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <Users className="w-16 h-16 mx-auto mb-6 text-[#2b394c] animate-scale-in" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-[#2b394c] via-[#ecc00c] to-[#2b394c] bg-clip-text text-transparent">
              About Dibiex
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              We're on a mission to transform how businesses understand and respond to customer feedback. 
              Our AI-powered platform helps companies turn reviews into actionable insights.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-[#2b394c] mb-2">
                {stat.number}
              </div>
              <div className="text-gray-600 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Our Story */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-[#2b394c] mb-6">
              Our Story
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Dibiex was born from a simple observation: businesses were drowning in customer feedback 
                but struggling to extract meaningful insights. Traditional review management was time-consuming, 
                reactive, and often missed critical patterns.
              </p>
              <p>
                Our founders, having experienced this challenge firsthand, set out to create a solution that 
                would leverage the power of artificial intelligence to transform raw customer feedback into 
                actionable business intelligence.
              </p>
              <p>
                Today, we're proud to serve thousands of businesses worldwide, helping them understand their 
                customers better, respond faster, and grow stronger through data-driven insights.
              </p>
            </div>
          </div>
          <div className="relative">
            <div className="bg-gradient-to-br from-[#2b394c]/10 to-[#ecc00c]/10 rounded-2xl p-8 border border-[#2b394c]/20">
              <TrendingUp className="w-16 h-16 text-[#2b394c] mb-4" />
              <h3 className="text-xl font-bold text-[#2b394c] mb-3">
                Our Mission
              </h3>
              <p className="text-gray-600">
                To democratize customer insights by making advanced AI-powered analytics accessible 
                to businesses of all sizes, helping them build stronger relationships with their customers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Our Values */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#2b394c] mb-4">
            Our Values
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            These core values guide everything we do and shape how we build products and serve our customers.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((value, index) => {
            const Icon = value.icon;
            return (
              <Card key={index} className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-[#2b394c]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-[#2b394c]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#2b394c] mb-3">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>


      {/* Why Choose Us */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#2b394c] mb-4">
            Why Choose Dibiex?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're not just another analytics platform. Here's what makes us different.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#2b394c]/10">
            <Award className="w-12 h-12 text-[#2b394c] mb-4" />
            <h3 className="text-xl font-bold text-[#2b394c] mb-3">
              Industry-Leading AI
            </h3>
            <p className="text-gray-600">
              Our advanced machine learning models provide insights that go beyond simple sentiment analysis.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#2b394c]/10">
            <Heart className="w-12 h-12 text-[#2b394c] mb-4" />
            <h3 className="text-xl font-bold text-[#2b394c] mb-3">
              Customer Success Focus
            </h3>
            <p className="text-gray-600">
              We're committed to your success with dedicated support and continuous platform improvements.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#2b394c]/10">
            <CheckCircle className="w-12 h-12 text-[#2b394c] mb-4" />
            <h3 className="text-xl font-bold text-[#2b394c] mb-3">
              Proven Results
            </h3>
            <p className="text-gray-600">
              Join thousands of businesses that have improved their customer satisfaction and online reputation.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-[#2b394c] to-[#ecc00c] rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of businesses already using Dibiex to improve their customer experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-[#2b394c] hover:bg-gray-100 px-8 py-3 text-lg font-medium"
              asChild
            >
              <Link to="/contact">
                Get Started Today
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-white text-[#2b394c] hover:bg-white hover:text-[#2b394c] px-8 py-3 text-lg font-medium"
              asChild
            >
              <Link to="/">
                Learn More
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <EnhancedFooter />
    </div>
  );
}
