import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Cookie, Settings, Shield, Eye, Clock, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild className="hover:bg-muted/50 transition-colors">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-lg animate-pulse">
                <span className="text-primary-foreground font-bold text-sm">RL</span>
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                ReviewLip
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"></div>
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-accent/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        
        <div className="container mx-auto text-center relative z-10 animate-fade-in">
          <Cookie className="w-16 h-16 mx-auto mb-4 text-primary animate-scale-in" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Cookie Policy
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Learn how we use cookies to enhance your experience
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid gap-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {/* What Are Cookies */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cookie className="w-5 h-5 text-primary" />
                  <span>What Are Cookies?</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  Cookies are small text files that are placed on your device when you visit our website. 
                  They help us provide you with a better experience by remembering your preferences, 
                  analyzing how you use our site, and personalizing content. Cookies cannot access 
                  personal information stored on your device or any files on your computer.
                </p>
              </CardContent>
            </Card>

            {/* How We Use Cookies */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-accent/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-accent" />
                  <span>How We Use Cookies</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  We use cookies to enhance your browsing experience, analyze site traffic, and 
                  personalize content. This includes remembering your login status, preferences, 
                  and providing analytics about how our services are used. We also use cookies 
                  to improve our services and develop new features based on user behavior.
                </p>
              </CardContent>
            </Card>

            {/* Types of Cookies */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <span>Types of Cookies We Use</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
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
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-accent/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-accent" />
                  <span>Cookie Duration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
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
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="w-5 h-5 text-primary" />
                  <span>Third-Party Cookies</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  We may use third-party services that place cookies on your device. These services 
                  help us with analytics, payment processing, and customer support. These third parties 
                  have their own privacy policies and cookie practices, which we encourage you to review.
                </p>
              </CardContent>
            </Card>

            {/* Managing Cookies */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-accent/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-accent" />
                  <span>Managing Your Cookie Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  You can control and manage cookies through your browser settings. Most browsers allow 
                  you to view, delete, and block cookies. However, disabling certain cookies may affect 
                  the functionality of our website. You can also use our cookie consent banner to manage 
                  your preferences.
                </p>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-primary/10 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5 text-primary" />
                  <span>Contact Us</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-muted-foreground">
                  If you have any questions about our cookie policy, 
                  please contact us at:
                </p>
                <div className="not-prose mt-4 space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="w-4 h-4 text-primary" />
                    <span className="font-medium">privacy@reviewlip.com</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    We typically respond within 24-48 hours.
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Effective Date */}
            <div className="text-center py-6 border-t border-muted">
              <p className="text-sm text-muted-foreground">
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
