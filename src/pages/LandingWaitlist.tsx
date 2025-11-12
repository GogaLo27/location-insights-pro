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
            Stop drowning in reviews. Let AI analyze sentiment, generate replies, and provide powerful analytics & insights—so you can focus on running your business.
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

      {/* How It Works - Step by Step Flow */}
      <section className="bg-gray-50 dark:bg-gray-900 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How Dibiex Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Simple 4-step process from chaos to clarity
            </p>
          </div>

          <div className="max-w-5xl mx-auto space-y-12">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="md:w-1/2">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    1
                  </div>
                  <h3 className="text-2xl font-bold">Connect Your Google Business</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed mb-4">
                  Sign in with your Google account and select your business location. We securely connect to your Google Business Profile to access your reviews.
                </p>
                <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>🔒 100% Secure:</strong> We use Google's official OAuth. We never see your password and you can revoke access anytime.
                  </p>
                </div>
              </div>
              <div className="md:w-1/2 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-950 dark:to-blue-900 rounded-2xl p-8 border-2 border-blue-300 dark:border-blue-700">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <MapPin className="h-6 w-6 text-blue-600" />
                    <span className="font-semibold">Select Your Location</span>
                  </div>
                  <div className="space-y-2">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded border border-blue-200 dark:border-blue-800">
                      <div className="font-medium">Restaurant Tiflis</div>
                      <div className="text-sm text-muted-foreground">2,843 reviews • 4.1★</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row-reverse gap-8 items-center">
              <div className="md:w-1/2">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    2
                  </div>
                  <h3 className="text-2xl font-bold">Import All Your Reviews</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed mb-4">
                  Click "Fetch Reviews" and we'll import <strong>ALL</strong> your Google reviews—whether you have 100 or 10,000. Takes about 30 seconds.
                </p>
                <div className="bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <p className="text-sm text-purple-800 dark:text-purple-200">
                    <strong>⚡ No Limits:</strong> Unlike other tools that cap at 500-1000 reviews, we fetch EVERYTHING. Even locations with 5,000+ reviews.
                  </p>
                </div>
              </div>
              <div className="md:w-1/2 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-950 dark:to-purple-900 rounded-2xl p-8 border-2 border-purple-300 dark:border-purple-700">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold">Fetching Reviews...</span>
                    <span className="text-sm text-muted-foreground">2,843 imported</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div className="bg-purple-600 h-3 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">✅ All reviews imported successfully!</p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="md:w-1/2">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    3
                  </div>
                  <h3 className="text-2xl font-bold">AI Analysis & Advanced Analytics</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed mb-4">
                  Click "AI Analysis" and watch the magic happen. Our AI reads every single review and provides comprehensive insights:
                </p>
                <ul className="space-y-2 mb-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300"><strong>Sentiment Analysis:</strong> Positive, negative, neutral breakdown with confidence scores</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300"><strong>Trend Analytics:</strong> Track sentiment changes over time with visual charts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300"><strong>Auto-tagged Topics:</strong> Food, service, cleanliness, atmosphere, price—automatically categorized</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300"><strong>Issue Detection:</strong> Common problems extracted and ranked by frequency</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300"><strong>Rating Distribution:</strong> See how your 1-5 star ratings are distributed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300"><strong>Peak Periods:</strong> Know when most reviews come in (time of day, day of week)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300"><strong>Actionable Insights:</strong> AI-powered improvement suggestions based on all feedback</span>
                  </li>
                </ul>
                <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>📊 Full Analytics Dashboard:</strong> All insights displayed in beautiful, interactive charts and graphs that update in real-time.
                  </p>
                </div>
              </div>
              <div className="md:w-1/2 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-950 dark:to-green-900 rounded-2xl p-8 border-2 border-green-300 dark:border-green-700">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl space-y-4">
                  <div className="text-xs font-semibold text-green-600 mb-3">SENTIMENT ANALYSIS</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-semibold text-sm">2,132 Positive</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">75%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="font-semibold text-sm">507 Negative</span>
                    </div>
                    <span className="text-2xl font-bold text-red-600">18%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <span className="font-semibold text-sm">204 Neutral</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-600">7%</span>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">COMMON TOPICS</div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 text-xs rounded-full">food quality (827)</span>
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 text-xs rounded-full">service (612)</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">TOP ISSUES</div>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 text-xs rounded-full">slow service (143)</span>
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 text-xs rounded-full">cold food (87)</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="text-xs text-muted-foreground">📈 Sentiment trending ↑ 8% this month</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col md:flex-row-reverse gap-8 items-center">
              <div className="md:w-1/2">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    4
                  </div>
                  <h3 className="text-2xl font-bold">Reply & Take Action</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed mb-4">
                  Use AI to generate professional replies or write your own. Post directly to Google Business from Dibiex.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-pink-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">AI generates personalized responses</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-pink-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">Edit before sending (full control)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-pink-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">Bulk operations (reply to 10+ at once)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-pink-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">Track response time & reply rate</span>
                  </li>
                </ul>
              </div>
              <div className="md:w-1/2 bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-950 dark:to-pink-900 rounded-2xl p-8 border-2 border-pink-300 dark:border-pink-700">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
                  <div className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Bot className="h-4 w-4 text-pink-600" />
                    AI-Generated Reply:
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4 text-sm leading-relaxed">
                    "Thank you for your feedback! We apologize for the service delay you experienced. We've already addressed this with our team to ensure faster service. We'd love to welcome you back for a better experience!"
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-sm">
                      Post to Google
                    </Button>
                    <Button variant="outline" className="text-sm">Edit</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get Section */}
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything Included
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            All plans come with these powerful features
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="p-6 hover:shadow-xl transition-all">
            <Bot className="h-8 w-8 text-blue-600 mb-3" />
            <h3 className="font-bold text-lg mb-2">Unlimited AI Analysis</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Analyze 1,000 or 100,000 reviews. No caps, no extra fees.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-xl transition-all">
            <MessageSquare className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-bold text-lg mb-2">AI Reply Generation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Generate professional responses in your brand voice instantly.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-xl transition-all border-2 border-blue-200 dark:border-blue-800">
            <TrendingUp className="h-8 w-8 text-pink-600 mb-3" />
            <h3 className="font-bold text-lg mb-2">Advanced Analytics Dashboard</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Beautiful charts & graphs showing sentiment trends, patterns, issues, and opportunities over time.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-xl transition-all border-2 border-blue-200 dark:border-blue-800">
            <BarChart3 className="h-8 w-8 text-green-600 mb-3" />
            <h3 className="font-bold text-lg mb-2">Rating Analytics & Reports</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track rating changes, distributions, peak periods, response times, and compare locations.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-xl transition-all">
            <Zap className="h-8 w-8 text-orange-600 mb-3" />
            <h3 className="font-bold text-lg mb-2">Bulk Operations</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select 100 reviews, analyze or reply to all at once.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-xl transition-all">
            <MapPin className="h-8 w-8 text-red-600 mb-3" />
            <h3 className="font-bold text-lg mb-2">Multi-Location</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage all your locations from one central dashboard.
            </p>
          </Card>
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

      {/* Real-World Example */}
      <section className="py-20 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Real Example: Restaurant Owner</h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                See how Dibiex saves you 10+ hours per week
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Before */}
              <Card className="p-6 border-2 border-red-200 dark:border-red-800">
                <h3 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">
                  😰 Without Dibiex
                </h3>
                <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">❌</span>
                    <span><strong>3 hours daily</strong> reading 50+ new reviews manually</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">❌</span>
                    <span><strong>No idea</strong> what patterns exist in 2,000+ reviews</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">❌</span>
                    <span><strong>2 hours</strong> writing individual replies</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">❌</span>
                    <span><strong>Missed insights</strong> buried in old reviews</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">❌</span>
                    <span><strong>Can't scale</strong> as you grow to more locations</span>
                  </li>
                </ul>
                <div className="mt-6 pt-6 border-t border-red-200 dark:border-red-800">
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">
                    = 25+ hours wasted per week
                  </p>
                </div>
              </Card>

              {/* After */}
              <Card className="p-6 border-2 border-green-200 dark:border-green-800 shadow-xl">
                <h3 className="text-2xl font-bold mb-4 text-green-600 dark:text-green-400">
                  😊 With Dibiex
                </h3>
                <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✅</span>
                    <span><strong>5 minutes</strong> - AI analyzes ALL reviews automatically</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✅</span>
                    <span><strong>See everything</strong> in beautiful charts, graphs & analytics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✅</span>
                    <span><strong>Track trends</strong> - Sentiment over time, rating changes, peak periods</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✅</span>
                    <span><strong>15 minutes</strong> - AI generates all replies, you just approve</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✅</span>
                    <span><strong>Instant alerts</strong> on issues mentioned repeatedly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">✅</span>
                    <span><strong>Compare analytics</strong> across 100 locations as easily as 1</span>
                  </li>
                </ul>
                <div className="mt-6 pt-6 border-t border-green-200 dark:border-green-800">
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    = Only 20 minutes per week
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                    Save 24+ hours every week!
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Perfect For Section */}
      <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 py-20 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Perfect For These Businesses
          </h2>
          <p className="text-xl mb-12 text-white/90">
            Especially powerful if you have 500+ reviews or multiple locations
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: '🍽️', title: 'Restaurants & Cafes', desc: 'Handle lunch rush + review rush', reviews: '500-5,000 reviews' },
              { icon: '🏨', title: 'Hotels & Resorts', desc: 'Manage guest feedback at scale', reviews: '1,000-10,000 reviews' },
              { icon: '💇', title: 'Salons & Spas', desc: 'Track service quality trends', reviews: '200-2,000 reviews' },
              { icon: '🏥', title: 'Medical & Dental', desc: 'Professional reputation management', reviews: '300-3,000 reviews' },
              { icon: '🚗', title: 'Auto Services', desc: 'Identify recurring service issues', reviews: '400-4,000 reviews' },
              { icon: '🏬', title: 'Retail Stores', desc: 'Understand customer experience', reviews: '200-2,000 reviews' }
            ].map((item, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-sm p-6 rounded-xl border border-white/20 hover:bg-white/20 transition">
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                <p className="text-sm text-white/90 mb-2">{item.desc}</p>
                <p className="text-xs text-white/70 font-semibold">{item.reviews}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="text-blue-600">Q:</span> What exactly does Dibiex do?
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                <strong>A:</strong> Dibiex connects to your Google Business Profile and imports all your reviews. It then uses AI to analyze sentiment (positive/negative/neutral), extract common topics (like "food quality" or "service speed"), identify issues, and generate professional reply suggestions. Everything displays in a beautiful dashboard with <strong>powerful analytics</strong>: sentiment trends over time, rating distributions, common themes, peak review periods, response time tracking, and much more. You get visual charts, graphs, and actionable insights to make data-driven decisions.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="text-blue-600">Q:</span> How is this different from reading reviews myself?
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                <strong>A:</strong> Reading reviews manually:
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300 ml-6">
                <li>• You can only process 10-20 reviews per hour</li>
                <li>• Hard to spot patterns across hundreds of reviews</li>
                <li>• Older reviews get forgotten</li>
                <li>• No way to track sentiment trends over time</li>
                <li>• Writing replies from scratch is slow</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">
                <strong>With Dibiex:</strong> AI processes 1,000 reviews in 2 minutes, automatically spots patterns, creates visual analytics with charts & graphs, tracks trends over time, and writes reply drafts for you.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="text-blue-600">Q:</span> Can I really import ALL my reviews? Even 3,000+?
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                <strong>A:</strong> YES! That's our superpower. While other tools cap at 500-1,000 reviews, Dibiex handles unlimited reviews. We've tested with locations that have 10,000+ reviews. It just works.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="text-blue-600">Q:</span> Do I need to know AI or tech stuff?
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                <strong>A:</strong> Nope! It's as simple as: 1) Connect Google, 2) Click "Fetch Reviews", 3) Click "AI Analysis", 4) See your insights. If you can use Google Maps, you can use Dibiex.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="text-blue-600">Q:</span> Will my replies sound robotic?
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                <strong>A:</strong> Not at all! The AI generates personalized responses based on each review's content. Plus, you can edit any reply before posting. Many users say our AI replies are better than what they'd write themselves!
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="text-blue-600">Q:</span> What analytics do I get?
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                <strong>A:</strong> Comprehensive analytics including:
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300 ml-6">
                <li>• <strong>Sentiment Trends:</strong> Track positive/negative/neutral sentiment over time</li>
                <li>• <strong>Rating Distribution:</strong> Visualize 1-5 star breakdown</li>
                <li>• <strong>Common Keywords:</strong> See what customers talk about most</li>
                <li>• <strong>Issue Detection:</strong> Identify recurring problems automatically</li>
                <li>• <strong>Response Time:</strong> Track how fast you reply to reviews</li>
                <li>• <strong>Peak Periods:</strong> Know when most reviews come in</li>
                <li>• <strong>Location Comparison:</strong> Compare multiple locations side-by-side</li>
              </ul>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="text-blue-600">Q:</span> How much does it cost?
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                <strong>A:</strong> Plans start at $49/month for unlimited reviews, AI analysis, and full analytics. Enterprise plan for multi-location businesses is $199/month. <strong className="text-blue-600">Waitlist members get 50% off</strong> for the first 3 months when we launch!
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className="text-blue-600">Q:</span> When will Dibiex launch?
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                <strong>A:</strong> We're launching in <strong>February 2025</strong>! Waitlist members get priority access and special pricing. Join now to be among the first.
              </p>
            </Card>
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

