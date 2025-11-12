import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Bot, 
  MessageSquare, 
  TrendingUp, 
  Sparkles, 
  CheckCircle2,
  ArrowRight,
  Star,
  Zap,
  BarChart3,
  Target,
  Loader2
} from "lucide-react";

const PreLaunch = () => {
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
          source: 'website',
          utm_source: new URLSearchParams(window.location.search).get('utm_source'),
          utm_medium: new URLSearchParams(window.location.search).get('utm_medium'),
          utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign')
        });

      if (error) {
        if (error.code === '23505') { // Duplicate email
          toast({
            title: "Already Registered!",
            description: "This email is already on our waitlist. We'll notify you soon!",
          });
        } else {
          throw error;
        }
      } else {
        setSubmitted(true);
        toast({
          title: "Success! 🎉",
          description: "You're on the list! We'll notify you when we launch.",
        });
      }
    } catch (error: any) {
      console.error('Error submitting:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none px-4 py-1.5">
            🚀 Launching Soon
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Manage Your Google Reviews with AI
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Transform how you handle customer reviews. AI-powered sentiment analysis, instant replies, and actionable insights — all in one beautiful dashboard.
          </p>
        </div>

        {/* Email Signup Form */}
        {!submitted ? (
          <Card className="max-w-2xl mx-auto shadow-2xl border-2 border-primary/20">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">Be the First to Know</h2>
                <p className="text-muted-foreground">
                  Join our waitlist and get exclusive early access when we launch
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Enter your email *"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 text-lg"
                />
                <Input
                  type="text"
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12"
                />
                <Input
                  type="text"
                  placeholder="Company name (optional)"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-12"
                />
                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      Join the Waitlist
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-4">
                🎁 Early access members get <strong>50% off</strong> for the first 3 months!
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="max-w-2xl mx-auto shadow-2xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-3xl font-bold mb-2 text-green-800 dark:text-green-200">You're On The List! 🎉</h2>
              <p className="text-lg text-green-700 dark:text-green-300 mb-4">
                We'll send you an email as soon as we launch.
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Check your inbox for a confirmation email (and don't forget to check spam!)
              </p>
            </CardContent>
          </Card>
        )}

        {/* Features Grid */}
        <div className="mt-20 grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="border-2 border-blue-200 dark:border-blue-800 hover:shadow-xl transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI-Powered Analysis</h3>
              <p className="text-muted-foreground">
                Automatically analyze sentiment, extract key topics, and identify issues from thousands of reviews in seconds.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 dark:border-purple-800 hover:shadow-xl transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Instant AI Replies</h3>
              <p className="text-muted-foreground">
                Generate professional, personalized responses with one click. Reply to all your reviews 10x faster.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-pink-200 dark:border-pink-800 hover:shadow-xl transition-shadow">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Actionable Insights</h3>
              <p className="text-muted-foreground">
                Beautiful charts showing what customers love and what needs improvement. Make data-driven decisions.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Benefits */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Why Choose Dibiex?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Zap, title: "Lightning Fast", desc: "Fetch and analyze 1000+ reviews in seconds" },
              { icon: Target, title: "Laser Focused", desc: "Filter by sentiment, rating, or custom tags instantly" },
              { icon: BarChart3, title: "Deep Insights", desc: "Track sentiment trends and rating changes over time" },
              { icon: Star, title: "Boost Your Rating", desc: "Identify issues and improve your Google Business rating" },
              { icon: Bot, title: "AI That Works", desc: "Powered by advanced AI that understands context and nuance" },
              { icon: Sparkles, title: "Beautiful Design", desc: "Gorgeous UI that makes review management actually enjoyable" }
            ].map((feature, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-20 text-center">
          <p className="text-sm text-muted-foreground mb-6">PERFECT FOR</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Restaurants', 'Hotels', 'Salons', 'Medical Practices', 'Auto Services', 'Retail Stores'].map((type) => (
              <Badge key={type} variant="outline" className="px-4 py-2 text-sm">
                {type}
              </Badge>
            ))}
          </div>
        </div>

        {/* CTA */}
        {!submitted && (
          <div className="mt-20 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Reviews?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join hundreds of businesses waiting for Dibiex
            </p>
            <Button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              size="lg"
              className="h-14 px-8 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Join the Waitlist Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-32 text-center text-sm text-muted-foreground">
          <p>© 2025 Dibiex. All rights reserved.</p>
          <p className="mt-2">Making review management simple, powerful, and intelligent.</p>
        </div>
      </div>
    </div>
  );
};

export default PreLaunch;

