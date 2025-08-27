import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Scale, AlertTriangle, Shield, Users, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

const Terms = () => {
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
          <Scale className="w-16 h-16 mx-auto mb-4 text-primary animate-scale-in" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Terms and Conditions
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Please read these terms carefully before using our services
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid gap-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {/* Acceptance of Terms */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span>Acceptance of Terms</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  By accessing and using ReviewLip's services, you accept and agree to be bound by the terms 
                  and provision of this agreement. If you do not agree to abide by the above, please do not 
                  use this service. These terms apply to all users of the site, including without limitation 
                  users who are browsers, vendors, customers, merchants, and contributors of content.
                </p>
              </CardContent>
            </Card>

            {/* Use License */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-accent/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-accent" />
                  <span>Use License</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  Permission is granted to temporarily download one copy of the materials (information or software) 
                  on ReviewLip's website for personal, non-commercial transitory viewing only. This is the grant 
                  of a license, not a transfer of title, and under this license you may not modify or copy the 
                  materials, use the materials for any commercial purpose or for any public display, or transfer 
                  the materials to another person.
                </p>
              </CardContent>
            </Card>

            {/* Service Description */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span>Service Description</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  ReviewLip provides AI-powered review management and sentiment analysis services for businesses. 
                  Our services include automated review monitoring, sentiment analysis, response generation, and 
                  analytics reporting. We integrate with Google Business Profile to access and analyze your 
                  business reviews and provide actionable insights.
                </p>
              </CardContent>
            </Card>

            {/* User Responsibilities */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-accent/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-accent" />
                  <span>User Responsibilities</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  You are responsible for maintaining the confidentiality of your account and password. 
                  You agree to accept responsibility for all activities that occur under your account or password. 
                  You must not use our services for any illegal or unauthorized purpose, and you must not violate 
                  any laws in your jurisdiction when using our services.
                </p>
              </CardContent>
            </Card>

            {/* Payment Terms */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Scale className="w-5 h-5 text-primary" />
                  <span>Payment Terms</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  Subscription fees are billed in advance on a monthly or annual basis. All fees are non-refundable 
                  except as expressly stated in these terms. We reserve the right to change our pricing with 30 days 
                  notice. You may cancel your subscription at any time, and you will continue to have access to the 
                  service until the end of your current billing period.
                </p>
              </CardContent>
            </Card>

            {/* Limitation of Liability */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-accent/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-accent" />
                  <span>Limitation of Liability</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  In no event shall ReviewLip, nor its directors, employees, partners, agents, suppliers, or affiliates, 
                  be liable for any indirect, incidental, special, consequential, or punitive damages, including without 
                  limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use 
                  of the service.
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
                  If you have any questions about these terms and conditions, 
                  please contact us at:
                </p>
                <div className="not-prose mt-4 space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="w-4 h-4 text-primary" />
                    <span className="font-medium">legal@reviewlip.com</span>
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

export default Terms;
