import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, User, CreditCard, AlertCircle, Shield, Ban, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const DashboardTerms = () => {
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
              <FileText className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Terms & Conditions
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Please read these terms carefully before using Dibiex
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
                      By accessing or using Dibiex, you agree to be bound by these Terms and Conditions.
                    </p>
                  </CardContent>
                </Card>

                {/* Acceptance */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="w-5 h-5 text-primary" />
                      <span>1. Acceptance of Terms</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <p>
                      By creating an account and using our services, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions, as well as our Privacy Policy.
                    </p>
                  </CardContent>
                </Card>

                {/* Service Description */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <span>2. Service Description</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <p>Dibiex provides:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Review management and analysis tools</li>
                      <li>AI-powered insights and sentiment analysis</li>
                      <li>Competitor tracking and benchmarking</li>
                      <li>Automated response generation</li>
                      <li>Business intelligence dashboards</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* User Accounts */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="w-5 h-5 text-primary" />
                      <span>3. User Accounts</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <ul className="list-disc pl-6 space-y-2">
                      <li>You must provide accurate and complete information</li>
                      <li>You are responsible for maintaining account security</li>
                      <li>You must not share your login credentials</li>
                      <li>You must notify us immediately of any unauthorized access</li>
                      <li>One account per user/business</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Subscriptions */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <span>4. Subscriptions and Payments</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <ul className="list-disc pl-6 space-y-2">
                      <li>All subscriptions are billed monthly or annually as selected</li>
                      <li>Payments are processed securely through our payment provider</li>
                      <li>You authorize us to charge your payment method automatically</li>
                      <li>Prices may change with 30 days notice</li>
                      <li>No refunds except as stated in our Refund Policy</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Prohibited Uses */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Ban className="w-5 h-5 text-primary" />
                      <span>5. Prohibited Uses</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <p>You may not:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Use the service for any illegal purpose</li>
                      <li>Attempt to gain unauthorized access</li>
                      <li>Interfere with or disrupt the service</li>
                      <li>Scrape or harvest data without permission</li>
                      <li>Impersonate others or misrepresent your affiliation</li>
                      <li>Upload malicious code or viruses</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Intellectual Property */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-primary" />
                      <span>6. Intellectual Property</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <p>
                      All content, features, and functionality of Dibiex are owned by us and protected by international copyright, trademark, and other intellectual property laws.
                    </p>
                    <p className="mt-4">
                      You retain ownership of your data, but grant us a license to use it to provide our services.
                    </p>
                  </CardContent>
                </Card>

                {/* Limitation of Liability */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 text-primary" />
                      <span>7. Limitation of Liability</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <p>
                      Dibiex is provided "as is" without warranties of any kind. We are not liable for:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Service interruptions or errors</li>
                      <li>Loss of data or business opportunities</li>
                      <li>Third-party actions or content</li>
                      <li>Decisions made based on our analytics</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Termination */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Ban className="w-5 h-5 text-primary" />
                      <span>8. Termination</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <p>We reserve the right to suspend or terminate your account if:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>You violate these Terms</li>
                      <li>Your payment fails</li>
                      <li>We suspect fraudulent activity</li>
                      <li>Required by law</li>
                    </ul>
                    <p className="mt-4">
                      You may cancel your subscription at any time through your account settings.
                    </p>
                  </CardContent>
                </Card>

                {/* Changes to Terms */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <span>9. Changes to Terms</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <p>
                      We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting. Your continued use of the service constitutes acceptance of the modified Terms.
                    </p>
                  </CardContent>
                </Card>

                {/* Contact */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-primary/5 to-accent/5">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Mail className="w-5 h-5 text-primary" />
                      <span>10. Contact Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground mb-4">
                      For questions about these Terms:
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

export default DashboardTerms;

