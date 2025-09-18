import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Cookie, Settings, Shield, Eye, Clock, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50 shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild className="hover:bg-gray-100 hover:text-gray-800 transition-colors text-gray-700">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg animate-pulse">
                <span className="text-white font-bold text-sm">RL</span>
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ReviewLip
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-purple-50"></div>
        <div className="absolute top-10 left-10 w-32 h-32 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        
        <div className="container mx-auto text-center relative z-10 animate-fade-in">
          <Cookie className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-scale-in" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            Cookie Policy
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Learn how we use cookies to enhance your experience
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid gap-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {/* What Are Cookies */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cookie className="w-5 h-5 text-blue-600" />
                  <span>What Are Cookies?</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>
                  Cookies are small text files that are placed on your device when you visit our website. 
                  They help us provide you with a better experience by remembering your preferences, 
                  analyzing how you use our site, and personalizing content. Cookies cannot access 
                  personal information stored on your device or any files on your computer.
                </p>
              </CardContent>
            </Card>

            {/* How We Use Cookies */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-purple-600" />
                  <span>How We Use Cookies</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>
                  We use cookies to enhance your browsing experience, analyze site traffic, and 
                  personalize content. This includes remembering your login status, preferences, 
                  and providing analytics about how our services are used. We also use cookies 
                  to improve our services and develop new features based on user behavior.
                </p>
              </CardContent>
            </Card>

            {/* Types of Cookies */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span>Types of Cookies We Use</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Essential Cookies</h4>
                    <p className="text-sm">
                      These cookies are necessary for the website to function properly. They enable basic 
                      functions like page navigation, access to secure areas, and user authentication.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Analytics Cookies</h4>
                    <p className="text-sm">
                      These cookies help us understand how visitors interact with our website by collecting 
                      and reporting information anonymously. This helps us improve our services.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Preference Cookies</h4>
                    <p className="text-sm">
                      These cookies allow our website to remember information that changes the way it 
                      behaves or looks, such as your preferred language or region.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cookie Duration */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <span>Cookie Duration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Session Cookies</h4>
                    <p className="text-sm">
                      These cookies are temporary and are deleted when you close your browser. They are 
                      used to maintain your session while you browse our website.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Persistent Cookies</h4>
                    <p className="text-sm">
                      These cookies remain on your device for a set period or until you delete them. 
                      They help us remember your preferences and provide a personalized experience.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Third-Party Cookies */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <span>Third-Party Cookies</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>
                  We may use third-party services that place cookies on your device. These services 
                  help us with analytics, payment processing, and customer support. These third parties 
                  have their own privacy policies and cookie practices, which we encourage you to review.
                </p>
              </CardContent>
            </Card>

            {/* Managing Cookies */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-purple-600" />
                  <span>Managing Your Cookie Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>
                  You can control and manage cookies through your browser settings. Most browsers allow 
                  you to view, delete, and block cookies. However, disabling certain cookies may affect 
                  the functionality of our website. You can also use our cookie consent banner to manage 
                  your preferences.
                </p>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <span>Contact Us</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-gray-600">
                  If you have any questions about our cookie policy, 
                  please contact us at:
                </p>
                <div className="not-prose mt-4 space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">privacy@reviewlip.com</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    We typically respond within 24-48 hours.
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Effective Date */}
            <div className="text-center py-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                <strong>Effective Date:</strong> January 20, 2025 | 
                <strong className="ml-2">Last Updated:</strong> January 20, 2025
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CookiePolicy;
