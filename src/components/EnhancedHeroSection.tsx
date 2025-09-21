import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PlayIcon,
  StarIcon,
  TrendingUpIcon,
  MessageSquareIcon,
  BarChart3,
  Brain,
} from "lucide-react";
import { useAuth } from "@/components/ui/auth-provider";

export function EnhancedHeroSection() {
  const { signInWithGoogle, signInAsDemo } = useAuth();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Text Content */}
          <div className="text-center lg:text-left">
            <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 text-blue-800 hover:bg-blue-200">
              <Brain className="w-4 h-4 mr-2" />
              AI-Powered Business Intelligence
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Transform Your Google Business{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Insights
              </span>
            </h1>

            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Get AI-powered sentiment analysis, automated review responses, and deep insights
              from your Google Business Profile. Turn customer feedback into actionable business intelligence.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                onClick={signInWithGoogle}
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                Start Free Analysis
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-gray-300 hover:border-gray-400 px-8 py-3 text-lg bg-white text-gray-700 hover:text-gray-900"
                onClick={signInAsDemo}
              >
                <PlayIcon className="w-5 h-5 mr-2" />
                Try Demo
              </Button>
            </div>

            <div className="flex items-center justify-center lg:justify-start space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <span className="font-medium">✓</span>
                <span className="ml-1">No credit card required</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium">✓</span>
                <span className="ml-1">14-day free trial</span>
              </div>
            </div>
          </div>

          {/* Right Side - Dashboard Mockup */}
          <div className="relative">
            <div className="relative bg-white rounded-2xl shadow-2xl border overflow-hidden">
              {/* Mockup Header */}
              <div className="bg-gray-50 px-6 py-4 border-b flex items-center space-x-3">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                </div>
                <div className="text-sm text-gray-500">
                  ReviewLip Dashboard
                </div>
              </div>

              {/* Mockup Content */}
              <div className="p-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <StarIcon className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Avg Rating
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">4.7</div>
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      +0.3
                    </Badge>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUpIcon className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-900">
                        Reviews
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-green-900">
                      1,248
                    </div>
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      +12%
                    </Badge>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <MessageSquareIcon className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">
                        Response
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">
                      85%
                    </div>
                    <Badge className="bg-purple-100 text-purple-700 text-xs">
                      +5%
                    </Badge>
                  </div>
                </div>

                {/* Sentiment Tags */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">
                    Recent Sentiment Analysis
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm text-gray-700">
                        "Amazing food and service!"
                      </span>
                      <Badge className="bg-green-100 text-green-700">
                        Positive
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <span className="text-sm text-gray-700">
                        "Good but could be faster"
                      </span>
                      <Badge className="bg-yellow-100 text-yellow-700">
                        Neutral
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-sm text-gray-700">
                        "Disappointing experience"
                      </span>
                      <Badge className="bg-red-100 text-red-700">
                        Negative
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 bg-white rounded-lg shadow-lg p-3 border">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-600">Live Updates</span>
              </div>
            </div>

            <div className="absolute -bottom-4 -left-4 bg-white rounded-lg shadow-lg p-3 border">
              <div className="text-xs text-gray-600">AI Insights</div>
              <div className="text-sm font-medium text-gray-900">
                +32% satisfaction
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse animation-delay-2000"></div>
      </div>
    </section>
  );
}
