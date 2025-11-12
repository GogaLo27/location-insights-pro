import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Bot, 
  MessageSquare, 
  TrendingUp, 
  CheckCircle2,
  ArrowRight,
  Star,
  Zap,
  BarChart3,
  Sparkles,
  Loader2,
  Mail,
  Building,
  MapPin
} from "lucide-react";

const LandingWaitlist = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('waitlist')
        .insert({
          email,
          full_name: name || null,
          company_name: company || null,
          source: 'landing_page',
          utm_source: new URLSearchParams(window.location.search).get('utm_source'),
          utm_medium: new URLSearchParams(window.location.search).get('utm_medium'),
          utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign')
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Already on the list!",
            description: "You're already registered. We'll email you when we launch!",
          });
          setSubmitted(true);
        } else {
          throw error;
        }
      } else {
        setSubmitted(true);
        toast({
          title: "Welcome aboard! 🎉",
          description: "Check your email for confirmation.",
        });
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Navigation */}
      <nav className="border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition">
            <img 
              src="/logo.png" 
              alt="Dibiex Logo" 
              className="h-8 w-auto"
            />
          </a>
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium px-4 py-2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full">
              🚀 Launching Soon
            </div>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="hidden md:flex"
            >
              View Main Site
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-block mb-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950 dark:to-purple-950 rounded-full border border-blue-200 dark:border-blue-800">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Join the Waitlist for Early Access
              </span>
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Manage <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">1000s of Google Reviews</span> with AI
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto">
            Stop drowning in reviews. Let AI analyze sentiment, generate replies, and surface insights—so you can focus on running your business.
          </p>

          {/* Signup Form */}
          {!submitted ? (
            <div className="max-w-xl mx-auto">
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col md:flex-row gap-3">
                  <Input
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 text-base flex-1"
                  />
                  <Button 
                    type="submit" 
                    className="h-14 px-8 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Get Early Access
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex gap-3">
                  <Input
                    type="text"
                    placeholder="Name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12"
                  />
                  <Input
                    type="text"
                    placeholder="Company (optional)"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="h-12"
                  />
                </div>
              </form>
              <p className="text-sm text-gray-500 mt-4">
                🎁 <strong>Early birds get 50% off</strong> for the first 3 months
              </p>
            </div>
          ) : (
            <div className="max-w-xl mx-auto bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 border-2 border-green-200 dark:border-green-800 rounded-2xl p-8">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">You're In! 🎉</h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
                We'll email you the moment we launch
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Keep an eye on your inbox (and spam folder, just in case)
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 dark:bg-gray-900 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to Master Reviews
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Built for businesses with hundreds (or thousands) of reviews
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="p-8 text-center border-2 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-2xl transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">AI Sentiment Analysis</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Analyze <strong>unlimited reviews</strong> in seconds. Our AI detects positive, negative, and neutral sentiment, extracts topics, and identifies issues automatically.
              </p>
            </Card>

            <Card className="p-8 text-center border-2 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-2xl transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Instant AI Replies</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Generate professional, personalized responses with one click. Reply to reviews <strong>10x faster</strong> while maintaining your brand voice.
              </p>
            </Card>

            <Card className="p-8 text-center border-2 hover:border-pink-300 dark:hover:border-pink-700 hover:shadow-2xl transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Beautiful Insights</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                See what customers love and what needs fixing. Track trends, spot issues early, and <strong>boost your rating</strong> with data-driven decisions.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Dibiex */}
      <section className="py-20 container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            Why Businesses Love Dibiex
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { 
                icon: Zap, 
                title: "No Limits", 
                desc: "Handle 1,000 or 10,000 reviews—our system scales with you. No hidden fees or review caps.",
                gradient: "from-yellow-500 to-orange-500"
              },
              { 
                icon: BarChart3, 
                title: "Real-Time Insights", 
                desc: "See sentiment trends, rating changes, and customer feedback patterns as they happen.",
                gradient: "from-blue-500 to-cyan-500"
              },
              { 
                icon: MessageSquare, 
                title: "Reply from Dashboard", 
                desc: "No more switching between platforms. Manage all your reviews in one beautiful interface.",
                gradient: "from-purple-500 to-pink-500"
              },
              { 
                icon: Bot, 
                title: "Smart AI That Learns", 
                desc: "The more you use it, the better it gets at understanding your business and customers.",
                gradient: "from-green-500 to-emerald-500"
              },
              { 
                icon: Star, 
                title: "Improve Your Rating", 
                desc: "Identify and fix issues before they hurt your reputation. Watch your rating climb.",
                gradient: "from-amber-500 to-yellow-500"
              },
              { 
                icon: MapPin, 
                title: "Multi-Location Support", 
                desc: "Manage reviews across all your locations from a single dashboard. Perfect for chains.",
                gradient: "from-red-500 to-rose-500"
              }
            ].map((feature, idx) => (
              <div key={idx} className="flex gap-4 p-6 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition">
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perfect For Section */}
      <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 py-20 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Perfect For
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
            {[
              { icon: '🍽️', title: 'Restaurants & Cafes', desc: '500+ reviews?' },
              { icon: '🏨', title: 'Hotels & Resorts', desc: 'Multiple locations?' },
              { icon: '💇', title: 'Salons & Spas', desc: 'Growing fast?' },
              { icon: '🏥', title: 'Medical & Dental', desc: 'Need reputation management?' },
              { icon: '🚗', title: 'Auto Services', desc: 'High review volume?' },
              { icon: '🏬', title: 'Retail Stores', desc: 'Want better insights?' }
            ].map((item, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20">
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                <p className="text-sm text-white/80">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Be Among the First
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-12">
            Join our exclusive waitlist and get <strong>50% off</strong> when we launch + priority onboarding support
          </p>

          {!submitted ? (
            <div className="max-w-lg mx-auto">
              <Card className="p-8 shadow-2xl border-2 border-primary/20">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <Mail className="h-8 w-8 text-primary" />
                    <div className="text-left">
                      <h3 className="font-bold text-lg">Join the Waitlist</h3>
                      <p className="text-sm text-muted-foreground">Get notified when we launch</p>
                    </div>
                  </div>

                  <Input
                    type="email"
                    placeholder="your.email@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 text-lg"
                    icon={<Mail className="h-5 w-5" />}
                  />
                  <Input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12"
                  />
                  <Input
                    type="text"
                    placeholder="Company name"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="h-12"
                  />
                  <Button 
                    type="submit" 
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      <>
                        Reserve My Spot
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-4">
                  We respect your privacy. Unsubscribe anytime.
                </p>
              </Card>
            </div>
          ) : (
            <div className="max-w-lg mx-auto">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 border-2 border-green-300 dark:border-green-700 rounded-2xl p-12">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-12 w-12 text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-3 text-green-900 dark:text-green-100">
                  Welcome to Dibiex! 🎉
                </h2>
                <p className="text-lg text-green-800 dark:text-green-200 mb-2">
                  You're on the exclusive waitlist
                </p>
                <p className="text-green-700 dark:text-green-300">
                  We'll send you an email as soon as we launch
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col items-center md:items-start">
              <div className="flex items-center gap-3 mb-3">
                <img 
                  src="/logo.png" 
                  alt="Dibiex Logo" 
                  className="h-8 w-auto"
                />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                AI-Powered Google Review Management
              </p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2">
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-2"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                Back to Main Site
              </Button>
              <p className="text-sm text-gray-500">
                © 2025 Dibiex. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingWaitlist;

