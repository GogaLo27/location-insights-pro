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
      icon: MapPin,
      title: "Location Management",
      description: "Sync and manage all your Google Business locations in one place"
    },
    {
      icon: MessageSquare,
      title: "Review Analytics",
      description: "AI-powered review analysis with sentiment scoring and tag generation"
    },
    {
      icon: BarChart3,
      title: "Performance Insights",
      description: "Track clicks, impressions, and customer engagement metrics"
    },
    {
      icon: Brain,
      title: "AI Sentiment Analysis",
      description: "Get detailed sentiment trends and insights over time"
    }
  ];

  const plans = [
    {
      name: "Free",
      price: "$0",
      description: "Perfect for small businesses",
      features: ["Up to 2 locations", "Up to 100 reviews", "Basic analytics", "Email support"],
      locations: "0-2 locations",
      reviews: "0-100 reviews"
    },
    {
      name: "Pro",
      price: "$29",
      description: "For growing businesses",
      features: ["Up to 10 locations", "Up to 500 reviews", "Advanced analytics", "Priority support", "AI insights"],
      locations: "0-10 locations",
      reviews: "0-500 reviews",
      popular: true
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-lg">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Location Insights Pro
            </span>
          </div>
          <Button 
            onClick={signInWithGoogle} 
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-xl transition-all duration-200"
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
          <Badge variant="secondary" className="mb-4 bg-gradient-to-r from-primary/10 to-accent/10 border border-accent/20">
            <Brain className="w-4 h-4 mr-2" />
            AI-Powered Business Intelligence
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Transform Your Google Business Insights
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Get AI-powered analytics, intelligent review management, and advanced sentiment analysis for all your Google Business locations in one powerful dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={signInWithGoogle}
              className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-200 group"
            >
              <Star className="w-5 h-5 mr-2 group-hover:animate-pulse" />
              Get Started Free
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-6 border-accent/30 hover:bg-accent/5 hover:border-accent transition-all duration-200"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-muted/30 to-background relative">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Everything you need to dominate your market
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful AI-driven tools to help you understand, manage, and improve your Google Business performance with precision.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-accent/20 shadow-md hover:shadow-lg transition-all duration-300 group hover:border-accent/30 bg-gradient-to-b from-card to-card/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-8 h-8 text-accent group-hover:text-primary transition-colors duration-300" />
                  </div>
                  <CardTitle className="text-lg group-hover:text-accent transition-colors duration-300">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-muted/20 to-transparent"></div>
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Choose the perfect plan for your business
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free and scale as you grow. All plans include advanced AI features and core analytics.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative overflow-hidden transition-all duration-300 ${
                plan.popular 
                  ? 'border-accent shadow-lg scale-105 bg-gradient-to-b from-card via-card to-accent/5' 
                  : 'border-accent/20 shadow-md hover:shadow-lg hover:border-accent/30'
              }`}>
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent"></div>
                )}
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary to-accent shadow-lg">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {plan.price}
                    <span className="text-base font-normal text-muted-foreground">/month</span>
                  </div>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-accent" />
                      </div>
                      <span className="font-medium">{plan.locations}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                        <Star className="w-4 h-4 text-accent" />
                      </div>
                      <span className="font-medium">{plan.reviews}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    className={`w-full mt-6 ${
                      plan.popular 
                        ? "bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg" 
                        : "bg-gradient-to-r from-primary/90 to-accent/90 hover:from-primary hover:to-accent"
                    }`}
                    onClick={signInWithGoogle}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;