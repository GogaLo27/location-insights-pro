import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, CheckCircle, XCircle, AlertTriangle, Mail, FileText, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { EnhancedFooter } from "@/components/EnhancedFooter";

const RefundPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <img src="/logo.png" alt="Dibiex" className="h-10 w-auto" />
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#2b394c] via-[#1e2735] to-[#2b394c] py-20">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-block p-4 bg-white/10 backdrop-blur-sm rounded-2xl mb-6 animate-float">
              <CreditCard className="w-16 h-16 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
              Refund Policy
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Please read this carefully before subscribing to Dibiex
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-8">
            {/* Header Info */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardContent className="prose prose-sm max-w-none text-gray-600 dark:text-gray-400 pt-6">
                <p><strong>Effective Date:</strong> January 23, 2025</p>
                <p className="mt-4">
                  Thank you for using Dibiex.com. Please read this Refund Policy carefully before subscribing. By purchasing a subscription, you agree to the terms below.
                </p>
              </CardContent>
            </Card>

            {/* Payments and Refunds */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-[#2b394c]" />
                  <span>💳 Payments and Refunds</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600 dark:text-gray-400">
                <ul className="list-disc pl-6 space-y-2">
                  <li>All payments for subscriptions are processed securely through our payment provider</li>
                  <li>We do not offer free trials</li>
                  <li>Users are encouraged to review all platform features and pricing details before subscribing</li>
                  <li>Once payment is completed, the subscription will be activated immediately</li>
                </ul>
              </CardContent>
            </Card>

            {/* Refund Eligibility */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-green-500/20 bg-green-50 dark:bg-green-950/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-700 dark:text-green-400">Refund Eligibility</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-gray-600 dark:text-gray-400">
                  You may request a refund <strong className="text-green-700 dark:text-green-400">only within 48 hours</strong> of your initial payment if:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-400">
                  <li>There was a technical issue preventing access to the platform or core features</li>
                  <li>You were charged twice due to a billing error</li>
                  <li>The service did not activate after successful payment</li>
                </ul>
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Refund requests made after 48 hours of payment will not be eligible, regardless of usage level or reason.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Non-Refundable */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-red-500/20 bg-red-50 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-red-700 dark:text-red-400">Non-Refundable Circumstances</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-gray-600 dark:text-gray-400">We do not issue refunds in the following cases:</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-400">
                  <li>You changed your mind after subscribing</li>
                  <li>You did not use the service</li>
                  <li>You forgot to cancel your recurring plan</li>
                  <li>API or Google account restrictions prevented access</li>
                  <li>You expected features not included in your selected plan</li>
                </ul>
              </CardContent>
            </Card>

            {/* Cancellations */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-[#2b394c]" />
                  <span>Cancellations</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600 dark:text-gray-400">
                <ul className="list-disc pl-6 space-y-2">
                  <li>You may cancel your subscription anytime through your account dashboard</li>
                  <li>Once cancelled, your access will remain active until the end of the paid period</li>
                  <li><strong>Cancelling does not automatically trigger a refund</strong></li>
                </ul>
              </CardContent>
            </Card>

            {/* How to Request */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-[#2b394c]" />
                  <span>How to Request a Refund</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600 dark:text-gray-400">
                <p>
                  If you meet the refund eligibility criteria above, please contact us at <strong>dibiex.ai@gmail.com</strong> within 48 hours of your payment.
                </p>
                <p className="mt-4">Include:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your registered email</li>
                  <li>Payment transaction ID</li>
                  <li>Description of the issue</li>
                </ul>
                <p className="mt-4">
                  Refund requests will be reviewed and processed <strong>within 5–7 business days</strong> if approved.
                </p>
              </CardContent>
            </Card>

            {/* Policy Updates */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-[#2b394c]" />
                  <span>Policy Updates</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-gray-600 dark:text-gray-400">
                <p>
                  We reserve the right to update or modify this Refund Policy at any time without prior notice. Any changes will be reflected on this page with an updated effective date.
                </p>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5 text-[#2b394c]" />
                  <span>Contact Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  For refund requests or questions:
                </p>
                <div className="not-prose space-y-2">
                  <div className="text-sm">
                    <strong>Dibiex</strong>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="w-4 h-4 text-[#2b394c]" />
                    <span className="font-medium">dibiex.ai@gmail.com</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Address: Nutsubidze 77k, 0186<br />
                    Tbilisi, Georgia<br />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <EnhancedFooter />
    </div>
  );
};

export default RefundPolicy;

