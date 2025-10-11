import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Cookie, Eye, Target, BarChart, Shield, Settings, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const DashboardCookie = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center space-x-4 ml-4">
              <Link
                to="/dashboard"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </header>

          <div className="flex-1 space-y-4 p-8 pt-6">
            {/* Hero Section */}
            <div className="text-center mb-8">
              <Cookie className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Cookie Policy
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                How Dibiex uses cookies and similar technologies
              </p>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto">
              <div className="grid gap-8">
                {/* Header Info */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground pt-6">
                    <p><strong>Effective Date:</strong> January 23, 2025</p>
                    <p><strong>Last Updated:</strong> January 23, 2025</p>
                    <p className="mt-4">
                      This Cookie Policy explains how Dibiex uses cookies and similar tracking technologies.
                    </p>
                  </CardContent>
                </Card>

                {/* What Are Cookies */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Cookie className="w-5 h-5 text-primary" />
                      <span>1. What Are Cookies?</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <p>
                      Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences and improve your experience.
                    </p>
                  </CardContent>
                </Card>

                {/* Types of Cookies */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Eye className="w-5 h-5 text-primary" />
                      <span>2. Types of Cookies We Use</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <h4 className="font-semibold text-foreground">Essential Cookies (Required)</h4>
                    <p>Necessary for the website to function properly:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Authentication and login sessions</li>
                      <li>Security and fraud prevention</li>
                      <li>Load balancing</li>
                    </ul>

                    <h4 className="font-semibold text-foreground mt-4">Functional Cookies</h4>
                    <p>Remember your preferences:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Language preferences</li>
                      <li>Theme settings (dark/light mode)</li>
                      <li>Location selections</li>
                    </ul>

                    <h4 className="font-semibold text-foreground mt-4">Analytics Cookies</h4>
                    <p>Help us understand how you use our service:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Page views and navigation patterns</li>
                      <li>Feature usage statistics</li>
                      <li>Performance monitoring</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Third-Party Cookies */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="w-5 h-5 text-primary" />
                      <span>3. Third-Party Cookies</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <p>We may use cookies from trusted third-party services:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Google Analytics:</strong> Website analytics and usage statistics</li>
                      <li><strong>Supabase:</strong> Authentication and database services</li>
                      <li><strong>PayPal:</strong> Payment processing</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* How We Use Cookies */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart className="w-5 h-5 text-primary" />
                      <span>4. How We Use Cookies</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Keep you logged in to your account</li>
                      <li>Remember your preferences and settings</li>
                      <li>Analyze site traffic and usage patterns</li>
                      <li>Improve our services and user experience</li>
                      <li>Prevent fraud and ensure security</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Your Cookie Choices */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Settings className="w-5 h-5 text-primary" />
                      <span>5. Your Cookie Choices</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <p>You can control cookies through:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Browser Settings:</strong> Most browsers allow you to refuse cookies or delete existing ones</li>
                      <li><strong>Cookie Consent Banner:</strong> Manage your preferences when you first visit our site</li>
                      <li><strong>Opt-Out Links:</strong> Disable analytics cookies through third-party opt-out pages</li>
                    </ul>
                    <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">
                        ⚠️ Note: Disabling essential cookies may prevent you from using certain features of Dibiex.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Cookie Duration */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-primary" />
                      <span>6. Cookie Duration</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Session Cookies:</strong> Deleted when you close your browser</li>
                      <li><strong>Persistent Cookies:</strong> Remain for a set period (typically 30-365 days)</li>
                      <li>You can clear all cookies at any time through your browser settings</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Updates to Policy */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Cookie className="w-5 h-5 text-primary" />
                      <span>7. Updates to This Policy</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <p>
                      We may update this Cookie Policy from time to time. Any changes will be posted on this page with an updated effective date.
                    </p>
                  </CardContent>
                </Card>

                {/* Contact */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-primary/5 to-accent/5">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Mail className="w-5 h-5 text-primary" />
                      <span>8. Contact Us</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground mb-4">
                      For questions about our use of cookies:
                    </p>
                    <div className="not-prose space-y-2">
                      <div className="text-sm">
                        <strong>Dibiex</strong>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Mail className="w-4 h-4 text-primary" />
                        <span className="font-medium">Dibiex.ai@gmail.com</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Address: Nutsubidze 77k, 0186<br />
                        Tbilisi, Georgia<br />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardCookie;

