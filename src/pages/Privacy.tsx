import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Lock, Eye, Users, FileText, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { EnhancedFooter } from "@/components/EnhancedFooter";

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
              <span className="font-bold text-xl text-gray-900">
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
            Your privacy and data security are Dibiex's top priorities
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
                  This Privacy Policy describes how Dibiex ("Company," "we," "our," or "us") collects, uses, shares, and safeguards your information when you use our SaaS platform (the "Service").
                </p>
                <p className="mt-4">
                  Our Service integrates with Google Authentication (OAuth) and the Google Business Profile API to fetch business reviews and analyze them with AI.
                </p>
                <p className="mt-4">
                  We are committed to protecting your privacy and complying with applicable data protection laws, including:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>The General Data Protection Regulation (GDPR – EU/EEA)</li>
                  <li>The California Consumer Privacy Act (CCPA/CPRA – California, USA)</li>
                  <li>The Lei Geral de Proteção de Dados (LGPD – Brazil)</li>
                  <li>Other applicable national privacy laws.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Data Controller */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span>1. Data Controller</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>For GDPR and related frameworks, Dibiex acts as the Data Controller for personal data processed through our Service.</p>
                <p className="mt-4">Contact details:</p>
                <ul className="list-disc pl-6 space-y-1 mt-2">
                  <li>Dibiex</li>
                  <li>Address: [Insert Company Address]</li>
                  <li>Email: privacy@dibiex.com</li>
                  <li>Phone: [Insert Company Phone]</li>
                </ul>
              </CardContent>
            </Card>

            {/* Information We Collect */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="w-5 h-5 text-purple-600" />
                  <span>2. Information We Collect</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">a. Personal Data from Google Authentication</h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Name, email address, and profile picture (provided via Google OAuth).</li>
                      <li>Google account ID (used only for authentication and linking your account).</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">b. Business Data from Google Business API</h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Business profile details (name, location, categories).</li>
                      <li>Reviews, ratings, and review metadata (author name, date, star rating, text content).</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">c. Technical and Usage Data</h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Log files (IP address, device type, browser type, operating system).</li>
                      <li>Usage data (pages visited, interactions with the Service, time spent).</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">d. AI-Generated Analytics</h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Sentiment scores, emotional tone, urgency classifications, and other insights generated by our AI models based on review content.</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Purpose and Legal Basis */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>3. Purpose and Legal Basis for Processing</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>We process personal data under the following legal bases:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li><strong>Performance of Contract (GDPR Art. 6(1)(b)):</strong> To provide you access to the Service, authenticate your account, and fetch Google reviews.</li>
                  <li><strong>Legitimate Interests (GDPR Art. 6(1)(f)):</strong> To improve the Service, ensure security, and conduct analytics.</li>
                  <li><strong>Consent (GDPR Art. 6(1)(a)):</strong> When you explicitly authorize integration with Google Business Profile.</li>
                  <li><strong>Legal Obligation (GDPR Art. 6(1)(c)):</strong> To comply with legal or regulatory requirements.</li>
                </ul>
              </CardContent>
            </Card>

            {/* How We Use Your Data */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span>4. How We Use Your Data</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>We use your information to:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Authenticate your account securely.</li>
                  <li>Fetch reviews and business data from Google Business Profile API.</li>
                  <li>Process reviews with AI to generate insights, sentiment analysis, and performance metrics.</li>
                  <li>Provide dashboards, reports, and analytics to you.</li>
                  <li>Improve the functionality and reliability of the Service.</li>
                  <li>Communicate with you about your account, support requests, or service updates.</li>
                  <li>Detect, prevent, and address security issues or fraud.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Sharing of Information */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span>5. Sharing of Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>We do not sell your personal data. We may share information only as follows:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li><strong>Service Providers:</strong> With third-party vendors (e.g., hosting providers such as AWS, analytics providers, support tools) under strict confidentiality and data-processing agreements.</li>
                  <li><strong>Google API Compliance:</strong> Data obtained via Google APIs is used only for providing the Service and is not shared for advertising or resold. We comply with Google API Services User Data Policy, including the Limited Use requirements.</li>
                  <li><strong>Legal Compliance:</strong> When required to comply with applicable laws, legal proceedings, or government requests.</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, subject to confidentiality protections.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Data Retention */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="w-5 h-5 text-purple-600" />
                  <span>6. Data Retention</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <ul className="list-disc pl-6 space-y-2">
                  <li>Personal and business data is retained only as long as necessary to fulfill the purposes described in this Privacy Policy.</li>
                  <li>Account data and business data are deleted upon account closure or user request, unless retention is required by law.</li>
                  <li>AI-generated analytics are anonymized or aggregated after deletion of your underlying data.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Data Security */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="w-5 h-5 text-blue-600" />
                  <span>7. Data Security</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <ul className="list-disc pl-6 space-y-2">
                  <li>We implement appropriate technical and organizational measures to protect your data, including encryption in transit and at rest, restricted access, and monitoring.</li>
                  <li>While we take security seriously, no system is 100% secure. Users are encouraged to take precautions such as safeguarding login credentials.</li>
                </ul>
              </CardContent>
            </Card>

            {/* International Data Transfers */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <span>8. International Data Transfers</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>If you access the Service from outside the country where our servers are located, your information may be transferred across borders. Where required, we rely on legal transfer mechanisms such as:</p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Standard Contractual Clauses (SCCs) under GDPR.</li>
                  <li>Adequacy decisions by the European Commission.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Your Privacy Rights */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>9. Your Privacy Rights</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>Depending on your jurisdiction, you may have the following rights:</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Under GDPR/LGPD:</h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Right to access, rectify, or erase personal data.</li>
                      <li>Right to restrict or object to processing.</li>
                      <li>Right to data portability.</li>
                      <li>Right to withdraw consent at any time.</li>
                      <li>Right to lodge a complaint with a supervisory authority.</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Under CCPA/CPRA:</h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Right to know what personal data we collect and how it's used.</li>
                      <li>Right to request deletion of personal data.</li>
                      <li>Right to opt-out of the sale or sharing of personal data.</li>
                      <li>Right to non-discrimination for exercising your privacy rights.</li>
                    </ul>
                  </div>
                </div>
                <p className="mt-4">To exercise these rights, please contact us at privacy@dibiex.com.</p>
              </CardContent>
            </Card>

            {/* Children's Privacy */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span>10. Children's Privacy</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>
                  Our Service is not intended for children under 16. We do not knowingly collect personal data from children. 
                  If we discover that we have inadvertently collected such data, we will delete it promptly.
                </p>
              </CardContent>
            </Card>

            {/* Changes to This Policy */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>11. Changes to This Policy</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>
                  We may update this Privacy Policy from time to time. The updated version will be posted on this page with a revised "Last Updated" date. 
                  Significant changes will be communicated via email or platform notification.
                </p>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <span>12. Contact Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-gray-600 mb-4">
                  For questions or concerns regarding this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="not-prose space-y-2">
                  <div className="text-sm">
                    <strong>Dibiex</strong>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">privacy@dibiex.com</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Address: [Insert Company Address]
                  </div>
                  <div className="text-sm text-gray-600">
                    Phone: [Insert Company Phone]
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

export default Privacy;