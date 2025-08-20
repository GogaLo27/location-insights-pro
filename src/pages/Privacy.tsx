import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Lock, Eye, Users, FileText, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

const Privacy = () => {
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
          <Shield className="w-16 h-16 mx-auto mb-4 text-primary animate-scale-in" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your privacy and data security are our top priorities
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid gap-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {/* Information We Collect */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="w-5 h-5 text-primary" />
                  <span>Information We Collect</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  We collect information you provide directly to us, such as when you create an account, 
                  use our services, or contact us for support. This may include your name, email address, 
                  business information, and Google Business Profile data that you authorize us to access.
                </p>
              </CardContent>
            </Card>

            {/* How We Use Information */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-accent/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-accent" />
                  <span>How We Use Your Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  We use the information we collect to provide, maintain, and improve our services, 
                  process transactions, send communications, and comply with legal obligations. 
                  We analyze your business reviews to provide sentiment analysis and actionable insights 
                  to help improve your customer experience.
                </p>
              </CardContent>
            </Card>

            {/* Data Security */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="w-5 h-5 text-primary" />
                  <span>Data Security</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  We implement appropriate security measures to protect your personal information against 
                  unauthorized access, alteration, disclosure, or destruction. We use industry-standard 
                  encryption, secure hosting, and regular security audits. However, no method of 
                  transmission over the internet is 100% secure.
                </p>
              </CardContent>
            </Card>

            {/* Your Rights */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-accent/10">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-accent" />
                  <span>Your Rights</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  You have the right to access, update, or delete your personal information. You may also 
                  opt out of certain communications from us. You can export your data or request account 
                  deletion at any time. To exercise these rights, please contact us using the information 
                  provided below.
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
                  If you have any questions about this privacy policy or our data practices, 
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

export default Privacy;