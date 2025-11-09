import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { 
  MapPin, 
  MessageSquare, 
  Bot, 
  TrendingUp, 
  RefreshCw, 
  CheckCircle2,
  PlayCircle,
  ChevronRight,
  BookOpen,
  Lightbulb,
  Zap,
  BarChart3,
  Mail
} from "lucide-react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";

const Tutorial = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  if (!user && !authLoading) {
    return <Navigate to="/" replace />;
  }

  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: PlayCircle,
      description: 'Learn the basics and connect your first location',
      color: 'blue',
      steps: [
        {
          title: 'Welcome to Dibiex!',
          content: 'Dibiex helps you manage and analyze your Google Business reviews with AI-powered insights. Let\'s get you started!',
          icon: '👋'
        },
        {
          title: 'Connect Your Google Business Account',
          content: 'Sign in with your Google account that has access to your Google Business Profile. This allows us to fetch your reviews and analytics.',
          icon: '🔗',
          tips: ['Make sure you have admin access to your Google Business Profile', 'You may need to grant permissions when prompted']
        },
        {
          title: 'Add Your Location',
          content: 'Go to the Locations page and click "Add Location". Search for your business and select it from the list. Your location will be connected automatically.',
          icon: '📍',
          tips: ['You can add multiple locations if you manage several businesses', 'Make sure to select the correct location from the search results']
        },
        {
          title: 'You\'re All Set!',
          content: 'Now you can start fetching reviews, analyzing sentiment, and managing your online reputation!',
          icon: '✨'
        }
      ]
    },
    {
      id: 'fetching-reviews',
      title: 'Fetching & Managing Reviews',
      icon: MessageSquare,
      description: 'How to fetch and view your Google Business reviews',
      color: 'purple',
      steps: [
        {
          title: 'Navigate to Reviews Page',
          content: 'Click on "Reviews" in the sidebar to access your review management dashboard.',
          icon: '💬'
        },
        {
          title: 'Select Your Location',
          content: 'Use the location dropdown at the top to select which business location you want to view reviews for.',
          icon: '🎯'
        },
        {
          title: 'Fetch Reviews',
          content: 'Click the "Refresh" button to fetch the latest reviews from Google. The first time you do this, all your historical reviews will be imported.',
          icon: '🔄',
          tips: [
            'The system will fetch ALL your reviews, even if you have thousands',
            'Reviews are saved to our database for instant loading next time',
            'You can use "Sync New Reviews" to only fetch new reviews incrementally'
          ]
        },
        {
          title: 'Filter & Search',
          content: 'Use the filter section to search reviews by name, sentiment, rating, or tags. This helps you quickly find specific reviews.',
          icon: '🔍',
          tips: ['Search works on both review text and author names', 'Combine multiple filters for precise results']
        },
        {
          title: 'Bulk Operations',
          content: 'Select multiple reviews using checkboxes to perform bulk operations like AI analysis or generating replies.',
          icon: '☑️'
        }
      ]
    },
    {
      id: 'ai-analysis',
      title: 'AI Sentiment Analysis',
      icon: Bot,
      description: 'Understand customer sentiment with AI',
      color: 'green',
      steps: [
        {
          title: 'Run AI Analysis',
          content: 'Click the "AI Analysis" button in the Reviews page to analyze your reviews with AI. This will detect sentiment, extract key topics, and identify issues.',
          icon: '🤖'
        },
        {
          title: 'What AI Detects',
          content: 'Our AI analyzes each review to identify:\n• Sentiment (Positive, Negative, Neutral)\n• Key topics and tags (food, service, atmosphere, etc.)\n• Specific issues mentioned\n• Improvement suggestions',
          icon: '🧠',
          tips: ['AI analysis runs on ALL your reviews, regardless of how many you have', 'You can see progress in real-time']
        },
        {
          title: 'View Sentiment Data',
          content: 'Go to the "Sentiment" page to see beautiful charts and insights about your customer sentiment over time.',
          icon: '📊'
        },
        {
          title: 'Filter by Sentiment',
          content: 'Back on the Reviews page, use the sentiment filter to view only Positive, Negative, or Neutral reviews.',
          icon: '🎯',
          tips: ['Focus on negative reviews to address issues quickly', 'Celebrate positive feedback to understand what customers love']
        }
      ]
    },
    {
      id: 'replying-reviews',
      title: 'Replying to Reviews',
      icon: Mail,
      description: 'Respond to customers directly from Dibiex',
      color: 'orange',
      steps: [
        {
          title: 'Reply to Individual Reviews',
          content: 'Click the "Reply" button on any review to write a response. Your reply will be posted directly to Google Business.',
          icon: '💬'
        },
        {
          title: 'AI-Powered Reply Generation',
          content: 'Use the "Generate AI Reply" feature to automatically create professional, personalized responses based on the review content.',
          icon: '✨',
          tips: [
            'AI considers the review sentiment and content',
            'You can edit the generated reply before sending',
            'Maintains your brand voice and tone'
          ]
        },
        {
          title: 'Bulk Reply Generation',
          content: 'Select multiple reviews and use "Bulk Reply" to generate responses for all of them at once. Great for catching up on unanswered reviews!',
          icon: '⚡'
        },
        {
          title: 'Reply Best Practices',
          content: '• Respond within 24-48 hours\n• Be professional and empathetic\n• Address specific concerns mentioned\n• Thank customers for positive feedback\n• Offer solutions for negative feedback',
          icon: '💡'
        }
      ]
    },
    {
      id: 'sentiment-insights',
      title: 'Understanding Sentiment Analytics',
      icon: TrendingUp,
      description: 'Make data-driven decisions with sentiment insights',
      color: 'indigo',
      steps: [
        {
          title: 'Navigate to Sentiment Page',
          content: 'Click "Sentiment" in the sidebar to access your sentiment analytics dashboard.',
          icon: '📈'
        },
        {
          title: 'Overview Cards',
          content: 'At the top, you\'ll see summary cards showing:\n• Total positive, negative, and neutral reviews\n• Percentage breakdown\n• Average rating\n• Sentiment score',
          icon: '📊'
        },
        {
          title: 'Rating Trend Chart',
          content: 'The beautiful area chart shows how your average rating has changed over time. Use this to spot trends and measure improvement.',
          icon: '📉',
          tips: ['Look for upward trends after implementing changes', 'Identify time periods with rating drops to investigate causes']
        },
        {
          title: 'What Customers Love',
          content: 'See the most mentioned positive aspects. These are your strengths - double down on them in your marketing!',
          icon: '💚'
        },
        {
          title: 'Areas to Improve',
          content: 'Identify common complaints and issues. Prioritize fixing these to improve your rating and customer satisfaction.',
          icon: '🔴',
          tips: ['Address the top issues first', 'Track if issues decrease after making changes']
        },
        {
          title: 'Date Range Filters',
          content: 'Use the date range selector to analyze specific time periods. Compare before/after changes or seasonal trends.',
          icon: '📅'
        }
      ]
    },
    {
      id: 'analytics',
      title: 'Google Business Analytics',
      icon: BarChart3,
      description: 'Track your Google Business performance',
      color: 'red',
      steps: [
        {
          title: 'Access Analytics',
          content: 'Go to the "Analytics" page to view metrics from your Google Business Profile.',
          icon: '📊'
        },
        {
          title: 'Key Metrics',
          content: 'Track important metrics like:\n• Business impressions (Maps & Search)\n• Website clicks\n• Direction requests\n• Phone calls\n• Bookings and orders',
          icon: '📈',
          tips: ['Compare desktop vs mobile traffic', 'Monitor trends over different time periods']
        },
        {
          title: 'Date Range Selection',
          content: 'Select different time ranges (7 days, 30 days, 90 days, etc.) to analyze your performance trends.',
          icon: '📅'
        },
        {
          title: 'Export Data',
          content: 'Use the "Export CSV" button to download your analytics data for further analysis or reporting.',
          icon: '📥'
        }
      ]
    },
    {
      id: 'tips-tricks',
      title: 'Tips & Best Practices',
      icon: Lightbulb,
      description: 'Pro tips to get the most out of Dibiex',
      color: 'yellow',
      steps: [
        {
          title: '🎯 Respond Quickly',
          content: 'Responding to reviews within 24-48 hours shows customers you care and can improve your ratings.',
          icon: '⏰'
        },
        {
          title: '🤖 Use AI Wisely',
          content: 'Run AI analysis regularly to stay on top of customer sentiment trends. Schedule it weekly or after major changes.',
          icon: '🧠'
        },
        {
          title: '🔍 Monitor Negative Reviews',
          content: 'Set up a routine to check negative reviews daily. Address issues promptly to prevent further damage.',
          icon: '🚨'
        },
        {
          title: '💚 Celebrate Wins',
          content: 'Share positive reviews with your team. Use the "What Customers Love" insights to boost morale and reinforce good practices.',
          icon: '🎉'
        },
        {
          title: '📊 Track Progress',
          content: 'Use the sentiment charts to measure the impact of changes you make. Look for upward rating trends after improvements.',
          icon: '📈'
        },
        {
          title: '🏷️ Use Tags',
          content: 'AI-generated tags help you quickly categorize and filter reviews. Use them to identify common themes.',
          icon: '🏷️'
        },
        {
          title: '🔄 Sync Regularly',
          content: 'Use "Sync New Reviews" button instead of full refresh to quickly fetch only new reviews without re-importing everything.',
          icon: '🔄'
        },
        {
          title: '💡 Act on Insights',
          content: 'Don\'t just collect data - use the "Areas to Improve" insights to make actual changes in your business.',
          icon: '🎯'
        }
      ]
    }
  ];

  const getSectionColor = (color: string) => {
    const colors: any = {
      blue: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
      purple: 'bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800',
      green: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
      orange: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800',
      indigo: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800',
      red: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
      yellow: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
    };
    return colors[color] || colors.blue;
  };

  const getIconColor = (color: string) => {
    const colors: any = {
      blue: 'text-blue-600',
      purple: 'text-purple-600',
      green: 'text-green-600',
      orange: 'text-orange-600',
      indigo: 'text-indigo-600',
      red: 'text-red-600',
      yellow: 'text-yellow-600'
    };
    return colors[color] || colors.blue;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">Tutorials & Help</h1>
            </div>
          </header>

          <div className="flex-1 p-8">
            {/* Header */}
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-bold mb-2">Welcome to Dibiex! 🎉</h1>
              <p className="text-lg text-muted-foreground">
                Your complete guide to managing reviews and understanding customer sentiment
              </p>
            </div>

            {/* Quick Links */}
            <Card className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-semibold">Quick Start</h2>
                </div>
                <div className="grid md:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => setActiveSection('getting-started')}
                  >
                    <PlayCircle className="h-6 w-6" />
                    <span className="text-sm font-medium">Getting Started</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => setActiveSection('fetching-reviews')}
                  >
                    <MessageSquare className="h-6 w-6" />
                    <span className="text-sm font-medium">Fetch Reviews</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => setActiveSection('ai-analysis')}
                  >
                    <Bot className="h-6 w-6" />
                    <span className="text-sm font-medium">AI Analysis</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => setActiveSection('sentiment-insights')}
                  >
                    <TrendingUp className="h-6 w-6" />
                    <span className="text-sm font-medium">Insights</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tutorial Sections */}
            <div className="space-y-6">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <Card key={section.id} className={isActive ? getSectionColor(section.color) : ''}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 ${getIconColor(section.color)}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">{section.title}</CardTitle>
                            <CardDescription>{section.description}</CardDescription>
                          </div>
                        </div>
                        <Button
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => setActiveSection(isActive ? null : section.id)}
                        >
                          {isActive ? 'Hide' : 'View Guide'}
                          <ChevronRight className={`ml-2 h-4 w-4 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                        </Button>
                      </div>
                    </CardHeader>

                    {isActive && (
                      <CardContent>
                        <div className="space-y-6">
                          {section.steps.map((step, index) => (
                            <div key={index} className="flex gap-4">
                              <div className="flex-shrink-0">
                                <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 border-2 border-primary flex items-center justify-center text-2xl">
                                  {step.icon}
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline">Step {index + 1}</Badge>
                                  <h3 className="font-semibold text-lg">{step.title}</h3>
                                </div>
                                <p className="text-muted-foreground whitespace-pre-line mb-3">
                                  {step.content}
                                </p>
                                {step.tips && step.tips.length > 0 && (
                                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Lightbulb className="h-4 w-4 text-amber-600" />
                                      <span className="text-sm font-semibold text-amber-600">Pro Tips:</span>
                                    </div>
                                    <ul className="space-y-1 text-sm text-muted-foreground">
                                      {step.tips.map((tip, tipIndex) => (
                                        <li key={tipIndex} className="flex items-start gap-2">
                                          <span className="text-amber-600 mt-0.5">•</span>
                                          <span>{tip}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* FAQ Section */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Frequently Asked Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      How many reviews can I import?
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      There's no limit! Dibiex can handle locations with thousands of reviews. We automatically fetch all your reviews in batches.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      How does AI analysis work?
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      Our AI reads each review and identifies sentiment (positive/negative/neutral), extracts key topics (food, service, etc.), and highlights specific issues or praise. It processes all reviews, regardless of quantity.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Can I reply to reviews from Dibiex?
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      Yes! Your replies are posted directly to Google Business. You can write custom replies or use AI to generate professional responses.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      What's the difference between Refresh and Sync?
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      "Refresh" re-fetches all reviews from Google (use when first setting up). "Sync New Reviews" only fetches reviews posted since your last sync (faster for regular updates).
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      How do I switch between multiple locations?
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      Use the location dropdown at the top of any page. All data (reviews, sentiment, analytics) will update to show the selected location.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Are my reviews stored securely?
                    </h4>
                    <p className="text-muted-foreground ml-6">
                      Yes! All data is stored in Supabase (a secure PostgreSQL database) with proper authentication and access controls. Only you can see your reviews.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Tutorial;

