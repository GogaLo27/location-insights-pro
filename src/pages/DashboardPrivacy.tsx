import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Database, Eye, Lock, Trash, Mail, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const DashboardPrivacy = () => {
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
              <Shield className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Privacy Policy
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Your privacy and data security are Dibiex's top priorities
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
                      This Privacy Policy explains how Dibiex ("we," "our," or "us") collects, uses, and protects your personal information.
                    </p>
                  </CardContent>
                </Card>

                {/* Data Controller */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-primary" />
                      <span>1. Data Controller</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <p>Dibiex is the data controller responsible for your personal information.</p>
                    <div className="mt-4">
                      <p><strong>Contact:</strong></p>
                      <p>Email: Dibiex.ai@gmail.com</p>
                      <p>Address: Nutsubidze 77k, 0186, Tbilisi, Georgia</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Information We Collect */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="w-5 h-5 text-primary" />
                      <span>2. Information We Collect</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <h4 className="font-semibold text-foreground">Account Information:</h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Email address</li>
                      <li>Name and company name</li>
                      <li>Phone number (optional)</li>
                    </ul>
                    <h4 className="font-semibold text-foreground mt-4">Business Information:</h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Google Business Profile data</li>
                      <li>Review data (publicly available)</li>
                      <li>Location information</li>
                    </ul>
                    <h4 className="font-semibold text-foreground mt-4">Usage Data:</h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Log data and analytics</li>
                      <li>Device information</li>
                      <li>Cookies and similar technologies</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* How We Use Your Information */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Eye className="w-5 h-5 text-primary" />
                      <span>3. How We Use Your Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Provide and improve our services</li>
                      <li>Process your transactions</li>
                      <li>Send service-related communications</li>
                      <li>Analyze and improve our platform</li>
                      <li>Ensure security and prevent fraud</li>
                      <li>Comply with legal obligations</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Data Security */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Lock className="w-5 h-5 text-primary" />
                      <span>4. Data Security</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <p>We implement industry-standard security measures:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Encryption of data in transit and at rest</li>
                      <li>Secure authentication systems</li>
                      <li>Regular security audits</li>
                      <li>Access controls and monitoring</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Your Rights */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Globe className="w-5 h-5 text-primary" />
                      <span>5. Your Rights</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <p>You have the right to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Access your personal data</li>
                      <li>Correct inaccurate data</li>
                      <li>Request deletion of your data</li>
                      <li>Object to data processing</li>
                      <li>Data portability</li>
                      <li>Withdraw consent</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Data Deletion */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Trash className="w-5 h-5 text-primary" />
                      <span>6. Data Deletion</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <p>You can delete your account and data at any time through your account settings. Upon deletion:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Your personal data will be permanently deleted within 30 days</li>
                      <li>Some data may be retained for legal compliance</li>
                      <li>Anonymized data may be retained for analytics</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Contact */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-primary/5 to-accent/5">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Mail className="w-5 h-5 text-primary" />
                      <span>7. Contact Us</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground mb-4">
                      For privacy-related questions or to exercise your rights:
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

export default DashboardPrivacy;

