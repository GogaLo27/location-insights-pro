import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Cookie, Settings, Shield, Eye, Clock, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { EnhancedFooter } from "@/components/EnhancedFooter";

const CookiePolicy = () => {
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
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        
        <div className="container mx-auto text-center relative z-10 animate-fade-in">
          <Cookie className="w-16 h-16 mx-auto mb-4 text-[#2b394c] animate-scale-in" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#2b394c] via-[#ecc00c] to-[#2b394c] bg-clip-text text-transparent">
            Cookie Policy
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Learn how Dibiex uses cookies to enhance your experience
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
                  This Cookie Policy explains how Dibiex ("Company," "we," "our," or "us") uses cookies and similar technologies when you visit our website or use our SaaS platform ("Service").
                </p>
              </CardContent>
            </Card>

            {/* What Are Cookies */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cookie className="w-5 h-5 text-[#2b394c]" />
                  <span>1. What Are Cookies?</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>
                  Cookies are small text files stored on your device by your browser when you visit a website. 
                  They are widely used to make websites work, improve efficiency, and provide analytics and personalization.
                </p>
                <p>
                  We also use related technologies such as pixels, local storage, and SDKs, which operate similarly.
                </p>
              </CardContent>
            </Card>

            {/* Types of Cookies */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-[#2b394c]" />
                  <span>2. Types of Cookies We Use</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">a. Strictly Necessary Cookies</h4>
                    <p className="text-sm mb-2">
                      Essential for secure login, authentication (e.g., Google Auth), and core functionality.
                    </p>
                    <p className="text-sm mb-2">
                      Without these cookies, the Service cannot function properly.
                    </p>
                    <p className="text-sm">
                      <strong>Example:</strong> Session tokens, user authentication state.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">b. Performance & Analytics Cookies</h4>
                    <p className="text-sm mb-2">
                      Help us understand how users interact with the Service.
                    </p>
                    <p className="text-sm mb-2">
                      Collect anonymized or aggregated data (e.g., page views, feature usage).
                    </p>
                    <p className="text-sm">
                      <strong>Example:</strong> Internal analytics, Google Analytics (if implemented).
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">c. Functional Cookies</h4>
                    <p className="text-sm mb-2">
                      Enhance user experience by remembering preferences.
                    </p>
                    <p className="text-sm">
                      <strong>Example:</strong> Language settings, dashboard layout choices.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">d. Third-Party Cookies</h4>
                    <p className="text-sm mb-2">
                      Some cookies may come from third-party services (e.g., Google APIs, cloud providers, support chat tools).
                    </p>
                    <p className="text-sm">
                      <strong>Example:</strong> Google authentication tokens, security validation.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legal Basis */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-[#ecc00c]" />
                  <span>3. Legal Basis for Use</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>We rely on:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Consent (GDPR Art. 6(1)(a))</strong> for non-essential cookies (e.g., analytics, personalization).</li>
                  <li><strong>Legitimate Interest / Contract (GDPR Art. 6(1)(b), (f))</strong> for strictly necessary cookies that enable login, account security, and Service provision.</li>
                </ul>
              </CardContent>
            </Card>

            {/* How We Use Cookies */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-[#ecc00c]" />
                  <span>4. How We Use Cookies</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>We use cookies to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Authenticate users securely via Google OAuth.</li>
                  <li>Maintain session continuity.</li>
                  <li>Improve Service performance and reliability.</li>
                  <li>Generate aggregated usage reports to improve features.</li>
                  <li>Prevent fraud, enhance security, and detect technical issues.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Managing Cookies */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-[#ecc00c]" />
                  <span>5. Managing Cookies</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>You can control cookies through your browser settings:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Block or delete cookies.</li>
                  <li>Set preferences for which cookies are allowed.</li>
                </ul>
                <p className="mb-4">
                  However, blocking essential cookies may impact your ability to log in or use the Service.
                </p>
                <p className="mb-2">For more details on managing cookies:</p>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Chrome: <a href="https://support.google.com/chrome/answer/95647" className="text-[#2b394c] hover:underline" target="_blank" rel="noopener noreferrer">https://support.google.com/chrome/answer/95647</a></li>
                  <li>Firefox: <a href="https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences" className="text-[#2b394c] hover:underline" target="_blank" rel="noopener noreferrer">https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences</a></li>
                  <li>Safari: <a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" className="text-[#2b394c] hover:underline" target="_blank" rel="noopener noreferrer">https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac</a></li>
                  <li>Edge: <a href="https://support.microsoft.com/help/4027947/microsoft-edge-delete-cookies" className="text-[#2b394c] hover:underline" target="_blank" rel="noopener noreferrer">https://support.microsoft.com/help/4027947/microsoft-edge-delete-cookies</a></li>
                </ul>
              </CardContent>
            </Card>

            {/* Third-Party Services */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="w-5 h-5 text-[#2b394c]" />
                  <span>6. Third-Party Services</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>Our Service integrates with third-party providers that may place cookies:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Google Authentication (OAuth):</strong> Session and security cookies.</li>
                  <li><strong>Google APIs (Business Profile):</strong> Tokens to fetch reviews.</li>
                  <li><strong>Hosting / Cloud Providers (e.g., AWS):</strong> Load balancing and security cookies.</li>
                  <li><strong>Analytics tools (optional):</strong> Usage tracking and performance monitoring.</li>
                </ul>
                <p className="mt-4">
                  We have no control over third-party cookie practices but require them to comply with privacy laws.
                </p>
              </CardContent>
            </Card>

            {/* Your Rights */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-[#2b394c]" />
                  <span>7. Your Rights</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>Depending on your jurisdiction (GDPR, CCPA/CPRA, LGPD):</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You may have the right to opt-in or opt-out of non-essential cookies.</li>
                  <li>You may request details on the categories of cookies we use.</li>
                  <li>You may withdraw consent at any time through our cookie banner or browser settings.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Updates */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-[#ecc00c]" />
                  <span>8. Updates to This Policy</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600">
                <p>
                  We may update this Cookie Policy to reflect changes in technology, laws, or our practices. 
                  The latest version will always be posted here with the "Last Updated" date.
                </p>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-white bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5 text-[#2b394c]" />
                  <span>9. Contact Us</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-gray-600 mb-4">
                  If you have questions about our Cookie Policy, please contact us:
                </p>
                <div className="not-prose space-y-2">
                  <div className="text-sm">
                    <strong>Dibiex</strong>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="w-4 h-4 text-[#2b394c]" />
                    <span className="font-medium">privacy@dibiex.com</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Address: [Insert Company Address]
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

export default CookiePolicy;
