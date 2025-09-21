import { Badge } from "@/components/ui/badge";
import { TrendingUpIcon, TagIcon, AlertTriangleIcon } from "lucide-react";

export function DashboardPreview() {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            See Your Business{" "}
            <span className="text-blue-600">
              Analytics in Action
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get a complete view of your customer sentiment, review trends, and
            performance metrics in one powerful dashboard
          </p>
        </div>

        <div className="relative max-w-7xl mx-auto">
          {/* Main Dashboard Mockup */}
          <div className="relative bg-white rounded-2xl shadow-2xl border overflow-hidden">
            {/* Browser Header */}
            <div className="bg-gray-100 px-6 py-4 border-b flex items-center space-x-3">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>
              <div className="flex-1 bg-white rounded-md px-4 py-1 text-sm text-gray-500">
                reviewlip.com/dashboard
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="p-8 space-y-8">
              {/* Top Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                  <div className="text-sm text-blue-600 font-medium mb-2">
                    Total Reviews
                  </div>
                  <div className="text-3xl font-bold text-blue-900">1,248</div>
                  <div className="text-sm text-green-600 mt-2">
                    ↗ +12% this month
                  </div>
                </div>
                <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                  <div className="text-sm text-green-600 font-medium mb-2">
                    Average Rating
                  </div>
                  <div className="text-3xl font-bold text-green-900">4.7</div>
                  <div className="text-sm text-green-600 mt-2">
                    ↗ +0.3 this month
                  </div>
                </div>
                <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
                  <div className="text-sm text-purple-600 font-medium mb-2">
                    Response Rate
                  </div>
                  <div className="text-3xl font-bold text-purple-900">85%</div>
                  <div className="text-sm text-green-600 mt-2">
                    ↗ +5% this month
                  </div>
                </div>
                <div className="bg-orange-50 p-6 rounded-xl border border-orange-200">
                  <div className="text-sm text-orange-600 font-medium mb-2">
                    Sentiment Score
                  </div>
                  <div className="text-3xl font-bold text-orange-900">8.2</div>
                  <div className="text-sm text-green-600 mt-2">
                    ↗ +1.1 this month
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sentiment Trends Chart */}
                <div className="bg-white border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Sentiment Trends Over Time
                  </h3>
                  <div className="h-48 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg flex items-end justify-between p-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-gradient-to-t from-blue-500 to-green-500 rounded-t"
                        style={{
                          height: `${Math.random() * 80 + 20}%`,
                          width: "6%",
                        }}
                      ></div>
                    ))}
                  </div>
                </div>

                {/* Top Keywords */}
                <div className="bg-white border rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Top Positive Keywords
                  </h3>
                  <div className="space-y-3">
                    {[
                      { word: "excellent", count: 89, size: "text-2xl" },
                      { word: "amazing", count: 67, size: "text-xl" },
                      { word: "friendly", count: 54, size: "text-lg" },
                      { word: "delicious", count: 43, size: "text-base" },
                      { word: "professional", count: 32, size: "text-sm" },
                    ].map((keyword, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <span
                          className={`font-medium text-green-700 ${keyword.size}`}
                        >
                          {keyword.word}
                        </span>
                        <Badge className="bg-green-100 text-green-700">
                          {keyword.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Reviews */}
              <div className="bg-white border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Reviews with AI Analysis
                </h3>
                <div className="space-y-4">
                  {[
                    {
                      text: "Amazing food and exceptional service! Will definitely come back.",
                      sentiment: "Positive",
                      urgency: "Low",
                    },
                    {
                      text: "Good experience overall, but the wait time was a bit long.",
                      sentiment: "Neutral",
                      urgency: "Medium",
                    },
                    {
                      text: "Very disappointed with the quality. Expected much better.",
                      sentiment: "Negative",
                      urgency: "High",
                    },
                  ].map((review, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-gray-700 mb-2">"{review.text}"</p>
                        <div className="flex items-center space-x-2">
                          <Badge
                            className={
                              review.sentiment === "Positive"
                                ? "bg-green-100 text-green-700"
                                : review.sentiment === "Neutral"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }
                          >
                            {review.sentiment}
                          </Badge>
                          <Badge
                            className={
                              review.urgency === "Low"
                                ? "bg-gray-100 text-gray-700"
                                : review.urgency === "Medium"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }
                          >
                            {review.urgency} Priority
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Floating Tooltips */}
          <div className="absolute top-32 -left-4 bg-white rounded-lg shadow-xl border p-4 max-w-xs hidden lg:block animate-pulse">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUpIcon className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-900">
                Sentiment Trends Over Time
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Track how customer sentiment changes over time with AI analysis
            </p>
          </div>

          <div className="absolute top-64 -right-4 bg-white rounded-lg shadow-xl border p-4 max-w-xs hidden lg:block animate-pulse animation-delay-1000">
            <div className="flex items-center space-x-2 mb-2">
              <TagIcon className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-900">
                Top Positive Keywords
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Discover what customers love most about your business
            </p>
          </div>

          <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl border p-4 max-w-xs hidden lg:block animate-pulse animation-delay-2000">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangleIcon className="w-5 h-5 text-red-600" />
              <span className="font-medium text-gray-900">Urgency Alerts</span>
            </div>
            <p className="text-sm text-gray-600">
              Get notified about reviews that need immediate attention
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
