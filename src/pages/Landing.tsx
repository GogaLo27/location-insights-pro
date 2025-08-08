import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, BarChart3, MessageSquare, Brain, Star, CheckCircle } from "lucide-react";
import { useAuth } from "@/components/ui/auth-provider";

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Location Insights Pro</span>
          </div>
          <Button onClick={signInWithGoogle} className="bg-primary hover:bg-primary/90">
            Sign in with Google
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge variant="secondary" className="mb-4">
            AI-Powered Business Intelligence
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Transform Your Google Business Insights
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Get AI-powered analytics, review management, and sentiment analysis for all your Google Business locations in one powerful dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={signInWithGoogle}
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-6"
            >
              Get Started Free
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to manage your online presence
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful tools to help you understand, manage, and improve your Google Business performance.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardHeader>
                  <feature.icon className="w-12 h-12 text-primary mb-4" />
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Choose the perfect plan for your business
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free and scale as you grow. All plans include core features.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold">
                    {plan.price}
                    <span className="text-base font-normal text-muted-foreground">/month</span>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-medium">{plan.locations}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Star className="w-4 h-4 text-primary" />
                      <span className="font-medium">{plan.reviews}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
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

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2024 Location Insights Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;