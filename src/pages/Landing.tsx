import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, BarChart3, MessageSquare, Brain, Star, CheckCircle } from "lucide-react";
import { useAuth } from "@/components/ui/auth-provider";
import Footer from "@/components/Footer";

const Landing = () => {
  const { signInWithGoogle, user } = useAuth();

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description: "Advanced sentiment analysis and automated insights from your Google Business reviews using cutting-edge AI technology."
    },
    {
      icon: MessageSquare,
      title: "Smart Reply Generation",
      description: "Generate personalized, professional responses to customer reviews that maintain your brand voice and improve engagement."
    },
    {
      icon: BarChart3,
      title: "Comprehensive Analytics",
      description: "Deep dive into customer sentiment trends, rating patterns, and actionable business insights to drive growth."
    }
  ];

  const plans = [
    {
      name: "Starter",
      price: "$29",
      description: "Perfect for small businesses",
      features: ["1 location", "100 reviews/month", "Basic analytics", "Email support"],
      locations: "1",
      reviews: "100"
    },
    {
      name: "Professional", 
      price: "$79",
      description: "For growing businesses",
      features: ["5 locations", "500 reviews/month", "Advanced analytics", "AI insights", "Priority support"],
      locations: "5",
      reviews: "500"
    },
    {
      name: "Unlimited",
      price: "$99",
      description: "For enterprises",
      features: ["Unlimited locations", "Unlimited reviews", "Full analytics suite", "24/7 support", "Custom integrations"],
      locations: "Unlimited",
      reviews: "Unlimited"
    }
  ];

  if (user) {
    window.location.href = '/plan-selection';
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2 animate-fade-in">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-lg animate-float">
              <span className="text-primary-foreground font-bold text-sm">RL</span>
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              ReviewLip
            </span>
          </div>
          <Button 
            onClick={signInWithGoogle} 
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            Sign in with Google
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-accent/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        
        <div className="container mx-auto text-center relative z-10">
          <Badge variant="secondary" className="mb-4 bg-gradient-to-r from-primary/10 to-accent/10 border border-accent/20 animate-fade-in hover:scale-105 transition-transform duration-200">
            <Brain className="w-4 h-4 mr-2" />
            AI-Powered Business Intelligence
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Transform Your Google Business Insights
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
            Get AI-powered sentiment analysis, automated review responses, and deep insights 
            from your Google Business Profile. Turn customer feedback into actionable business intelligence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <Button 
              onClick={signInWithGoogle} 
              size="lg"
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-lg px-8 py-6"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Start Free Analysis
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="text-lg px-8 py-6 border-2 hover:bg-muted/50 transition-all duration-300 hover:scale-105 group"
              asChild
            >
              <a href="#features">
                <MessageSquare className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Learn More
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Powerful Features for Modern Businesses
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need to understand, respond to, and leverage your customer feedback
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="border-2 hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:-translate-y-2 group animate-fade-in bg-gradient-card"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg group-hover:scale-110 transition-transform duration-300 shadow-soft">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="group-hover:text-primary transition-colors">{feature.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground group-hover:text-foreground transition-colors">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your business size and needs
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={plan.name} 
                className={`relative border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 group animate-fade-in ${
                  plan.name === "Professional" 
                    ? "border-primary shadow-elegant bg-gradient-to-br from-primary/5 to-accent/5 scale-105" 
                    : "hover:border-primary/20 bg-gradient-card"
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {plan.name === "Professional" && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-primary to-accent text-white shadow-lg animate-pulse">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl group-hover:text-primary transition-colors">{plan.name}</CardTitle>
                  <CardDescription className="text-lg">{plan.description}</CardDescription>
                  <div className="text-4xl font-bold text-primary group-hover:scale-110 transition-transform">
                    {plan.price}
                    <span className="text-lg text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-primary group-hover:scale-110 transition-transform flex-shrink-0" />
                        <span className="text-sm group-hover:text-primary transition-colors">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    onClick={signInWithGoogle} 
                    className={`w-full transition-all duration-300 hover:scale-105 ${
                      plan.name === "Professional" 
                        ? "bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-glow" 
                        : "hover:bg-primary/90"
                    }`}
                    variant={plan.name === "Professional" ? "default" : "outline"}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
        <div className="container mx-auto text-center">
          <div className="animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Ready to Transform Your Business?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of businesses using AI to understand their customers better
            </p>
            <Button 
              onClick={signInWithGoogle}
              size="lg"
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-glow transition-all duration-300 hover:scale-110 text-lg px-12 py-6"
            >
              <Star className="w-5 h-5 mr-2" />
              Start Your Free Trial
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;