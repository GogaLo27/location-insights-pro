import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Scale, AlertTriangle, Shield, Users, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { EnhancedFooter } from "@/components/EnhancedFooter";

const Terms = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50 shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild className="hover:bg-[#ecc00c]/10 hover:text-[#ecc00c] transition-colors text-[#2b394c]">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <div className="flex items-center">
              <img 
                src="/logo.png" 
                alt="Dibiex Logo" 
                className="h-10 w-auto object-contain"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2b394c]/5 via-transparent to-[#ecc00c]/10"></div>
        <div className="absolute top-10 left-10 w-32 h-32 bg-[#2b394c]/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-[#ecc00c]/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        
        <div className="container mx-auto text-center relative z-10 animate-fade-in">
          <Scale className="w-16 h-16 mx-auto mb-4 text-[#2b394c] animate-scale-in" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#2b394c] via-[#ecc00c] to-[#2b394c] bg-clip-text text-transparent">
            Terms and Conditions
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Please read these terms carefully before using Dibiex services
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid gap-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {/* Header Info */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardContent className="prose prose-sm max-w-none text-gray-600 pt-6">
                <p><strong>Effective Date:</strong> January 23, 2025</p>
                <p><strong>Last Updated:</strong> January 23, 2025</p>
                <p className="mt-4">
                  These Terms and Conditions ("Terms") govern your use of the SaaS platform provided by Dibiex ("Company," "we," "our," or "us"). By accessing or using our platform ("Service"), you agree to be bound by these Terms. If you do not agree, you must not use the Service.
                </p>
              </CardContent>
            </Card>

            {/* Eligibility */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-[#2b394c]" />
                  <span>1. Eligibility</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <ul className="list-disc pl-6 space-y-2">
                  <li>You must be at least 18 years old and have the legal authority to enter into these Terms.</li>
                  <li>By using the Service on behalf of a business or organization, you represent that you have the authority to bind that entity.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Account Registration and Security */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <span>2. Account Registration and Security</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <ul className="list-disc pl-6 space-y-2">
                  <li>You must sign in using Google Authentication (OAuth).</li>
                  <li>You agree to provide accurate and complete information during registration.</li>
                  <li>You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account.</li>
                  <li>We are not liable for any loss or damage arising from unauthorized access to your account.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Use of the Service */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-[#2b394c]" />
                  <span>3. Use of the Service</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p className="mb-4">
                  The Service integrates with the Google Business Profile API to fetch business data and reviews, and applies AI analysis to generate insights.
                </p>
                <p className="mb-4">
                  You grant us permission to access and process data from your connected Google Business accounts, strictly as necessary to provide the Service.
                </p>
                <p className="mb-2">You agree not to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Misuse the Service for unlawful purposes.</li>
                  <li>Copy, distribute, or reverse-engineer any part of the Service.</li>
                  <li>Interfere with or disrupt the operation of the Service.</li>
                  <li>Use the Service to infringe on others' rights, including intellectual property.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Subscription, Fees, and Payment */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Scale className="w-5 h-5 text-purple-600" />
                  <span>4. Subscription, Fees, and Payment</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access to the Service may require a subscription or one-time payment.</li>
                  <li>Fees, billing cycles, and payment methods will be disclosed at the time of purchase.</li>
                  <li>We reserve the right to change subscription fees with prior notice.</li>
                  <li>All payments are non-refundable except as required by law.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Intellectual Property */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-[#2b394c]" />
                  <span>5. Intellectual Property</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <ul className="list-disc pl-6 space-y-2">
                  <li>The Service, including its software, design, trademarks, logos, and AI models, are owned by Dibiex and are protected by intellectual property laws.</li>
                  <li>You are granted a limited, non-exclusive, non-transferable license to use the Service in accordance with these Terms.</li>
                  <li>You retain ownership of your business data and reviews. We claim no ownership rights over content retrieved from Google APIs on your behalf.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Data Protection and Privacy */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <span>6. Data Protection and Privacy</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your use of the Service is also governed by our Privacy Policy and Data Processing Agreement (DPA).</li>
                  <li>We comply with the Google API Services User Data Policy, including the Limited Use requirements.</li>
                  <li>We do not sell or use your Google data for advertising purposes.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Third-Party Services */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-[#2b394c]" />
                  <span>7. Third-Party Services</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <ul className="list-disc pl-6 space-y-2">
                  <li>The Service relies on third-party providers such as Google APIs and cloud hosting (e.g., AWS).</li>
                  <li>We are not responsible for the availability or performance of third-party services.</li>
                  <li>Your use of Google APIs is subject to Google's Terms of Service and Privacy Policy.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Service Availability and Updates */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <span>8. Service Availability and Updates</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <ul className="list-disc pl-6 space-y-2">
                  <li>We strive to provide reliable access but do not guarantee uninterrupted availability.</li>
                  <li>We may modify, suspend, or discontinue the Service at any time, with or without notice.</li>
                  <li>We may release updates or new features which are subject to these Terms.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Disclaimer of Warranties */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-[#2b394c]" />
                  <span>9. Disclaimer of Warranties</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <ul className="list-disc pl-6 space-y-2">
                  <li>The Service is provided "as is" and "as available" without warranties of any kind, express or implied.</li>
                  <li>We do not guarantee that the AI analysis will be 100% accurate or free of errors.</li>
                  <li>To the maximum extent permitted by law, we disclaim all warranties, including merchantability, fitness for a particular purpose, and non-infringement.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Limitation of Liability */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-purple-600" />
                  <span>10. Limitation of Liability</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <ul className="list-disc pl-6 space-y-2">
                  <li>To the fullest extent permitted by law, we are not liable for any indirect, incidental, consequential, or punitive damages.</li>
                  <li>Our total liability under these Terms shall not exceed the amount you paid for the Service in the past 12 months.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Indemnification */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-[#2b394c]" />
                  <span>11. Indemnification</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>You agree to indemnify and hold harmless Dibiex, its affiliates, and employees from any claims, damages, or expenses arising out of:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Your use of the Service.</li>
                  <li>Your violation of these Terms.</li>
                  <li>Your violation of any applicable law or third-party rights.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Termination */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-purple-600" />
                  <span>12. Termination</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <ul className="list-disc pl-6 space-y-2">
                  <li>We may suspend or terminate your account if you violate these Terms.</li>
                  <li>You may stop using the Service at any time.</li>
                  <li>Upon termination, your access will cease, but certain provisions (e.g., liability, indemnity, intellectual property) will survive.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Governing Law and Dispute Resolution */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Scale className="w-5 h-5 text-[#2b394c]" />
                  <span>13. Governing Law and Dispute Resolution</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <ul className="list-disc pl-6 space-y-2">
                  <li>These Terms shall be governed by the laws of [Insert Jurisdiction, e.g., Delaware, USA or Ireland for GDPR compliance].</li>
                  <li>Any disputes shall be resolved exclusively in the courts of [Insert Location].</li>
                </ul>
              </CardContent>
            </Card>

            {/* Changes to These Terms */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <span>14. Changes to These Terms</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <ul className="list-disc pl-6 space-y-2">
                  <li>We may update these Terms from time to time.</li>
                  <li>Continued use of the Service after updates constitutes your acceptance of the revised Terms.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5 text-[#2b394c]" />
                  <span>15. Contact Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-gray-600 mb-4">
                  For questions about these Terms, please contact us at:
                </p>
                <div className="not-prose space-y-2">
                  <div className="text-sm">
                    <strong>Dibiex</strong>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="w-4 h-4 text-[#2b394c]" />
                    <span className="font-medium">Dibiex.ai@gmail.com</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Address: Nutsubidze 77k, 0186<br />
                    Tbilisi, Georgia<br />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <EnhancedFooter />
    </div>
  );
};

export default Terms;
