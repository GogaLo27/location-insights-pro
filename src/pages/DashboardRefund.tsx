import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, CheckCircle, XCircle, AlertTriangle, Mail, FileText, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const DashboardRefund = () => {
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
              <CreditCard className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Refund Policy
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Please read this carefully before subscribing to Dibiex
              </p>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto">
              <div className="grid gap-8">
                {/* Header Info */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground pt-6">
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
                      <CreditCard className="w-5 h-5 text-primary" />
                      <span>💳 Payments and Refunds</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <ul className="list-disc pl-6 space-y-2">
                      <li>All payments for subscriptions are processed securely through our payment provider</li>
                      <li>We do not offer free trials</li>
                      <li>Users are encouraged to review all platform features and pricing details before subscribing</li>
                      <li>Once payment is completed, the subscription will be activated immediately</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Refund Eligibility */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-green-500/20 bg-green-50/50 dark:bg-green-950/20">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-700 dark:text-green-400">Refund Eligibility</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground">
                      You may request a refund <strong className="text-green-700 dark:text-green-400">only within 48 hours</strong> of your initial payment if:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
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
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-red-500/20 bg-red-50/50 dark:bg-red-950/20">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="text-red-700 dark:text-red-400">Non-Refundable Circumstances</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground">We do not issue refunds in the following cases:</p>
                    <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
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
                      <AlertTriangle className="w-5 h-5 text-primary" />
                      <span>Cancellations</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
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
                      <FileText className="w-5 h-5 text-primary" />
                      <span>How to Request a Refund</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
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
                      <FileText className="w-5 h-5 text-primary" />
                      <span>Policy Updates</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none text-muted-foreground">
                    <p>
                      We reserve the right to update or modify this Refund Policy at any time without prior notice. Any changes will be reflected on this page with an updated effective date.
                    </p>
                  </CardContent>
                </Card>

                {/* Contact */}
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-primary/5 to-accent/5">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Mail className="w-5 h-5 text-primary" />
                      <span>Contact Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground mb-4">
                      For refund requests or questions:
                    </p>
                    <div className="not-prose space-y-2">
                      <div className="text-sm">
                        <strong>Dibiex</strong>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Mail className="w-4 h-4 text-primary" />
                        <span className="font-medium">dibiex.ai@gmail.com</span>
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

export default DashboardRefund;

