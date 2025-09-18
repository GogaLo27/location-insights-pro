import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Lock, Eye, Users, FileText, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

const Privacy = () => {
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
          <Shield className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-scale-in" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your privacy and data security are our top priorities
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid gap-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {/* Information We Collect */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-gray-900">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <span>Information We Collect</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>
                  We collect information you provide directly to us, such as when you create an account, 
                  use our services, or contact us for support. This may include your name, email address, 
                  business information, and Google Business Profile data that you authorize us to access.
                </p>
              </CardContent>
            </Card>

            {/* How We Use Information */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-gray-900">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span>How We Use Your Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>
                  We use the information we collect to provide, maintain, and improve our services, 
                  process transactions, send communications, and comply with legal obligations. 
                  We analyze your business reviews to provide sentiment analysis and actionable insights 
                  to help improve your customer experience.
                </p>
              </CardContent>
            </Card>

            {/* Data Security */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-gray-900">
                  <Lock className="w-5 h-5 text-blue-600" />
                  <span>Data Security</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>
                  We implement appropriate security measures to protect your personal information against 
                  unauthorized access, alteration, disclosure, or destruction. We use industry-standard 
                  encryption, secure hosting, and regular security audits. However, no method of 
                  transmission over the internet is 100% secure.
                </p>
              </CardContent>
            </Card>

            {/* Your Rights */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-gray-900">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <span>Your Rights</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>
                  You have the right to access, update, or delete your personal information. You may also 
                  opt out of certain communications from us. You can export your data or request account 
                  deletion at any time. To exercise these rights, please contact us using the information 
                  provided below.
                </p>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-gray-900">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <span>Contact Us</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-gray-600">
                  If you have any questions about this privacy policy or our data practices, 
                  please contact us at:
                </p>
                <div className="not-prose mt-4 space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-gray-900">privacy@reviewlip.com</span>
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

export default Privacy;