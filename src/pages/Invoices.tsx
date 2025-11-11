import { useState, useEffect } from 'react';
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Calendar, CreditCard, Loader2, Eye } from "lucide-react";
import { format } from "date-fns";

interface Invoice {
  id: string;
  invoice_number: string;
  amount_cents: number;
  currency: string;
  status: string;
  plan_type: string;
  plan_name: string;
  invoice_date: string;
  paid_date: string;
  payment_method: string;
  customer_name: string;
  customer_email: string;
  billing_period_start: string;
  billing_period_end: string;
}

const Invoices = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user!.id)
        .order('invoice_date', { ascending: false });

      if (error) throw error;

      setInvoices(data || []);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = (invoice: Invoice) => {
    // Open invoice in new window for printing/saving as PDF
    const invoiceWindow = window.open('', '_blank');
    if (invoiceWindow) {
      invoiceWindow.document.write(generateInvoiceHTML(invoice));
      invoiceWindow.document.close();
      setTimeout(() => {
        invoiceWindow.print();
      }, 250);
    }
  };

  const generateInvoiceHTML = (invoice: Invoice) => {
    const amount = (invoice.amount_cents / 100).toFixed(2);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; }
          .company { font-size: 28px; font-weight: bold; color: #1f2937; }
          .invoice-number { text-align: right; }
          .invoice-number h2 { margin: 0; color: #3b82f6; font-size: 24px; }
          .invoice-details { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .section-title { font-size: 14px; color: #6b7280; text-transform: uppercase; margin-bottom: 10px; }
          .info-line { margin: 5px 0; }
          .info-label { color: #6b7280; display: inline-block; width: 140px; }
          table { width: 100%; border-collapse: collapse; margin: 40px 0; }
          th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
          td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
          .total-row { font-weight: bold; font-size: 18px; background: #f9fafb; }
          .status-paid { color: #10b981; font-weight: 600; }
          .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company">DIBIEX</div>
            <p style="margin: 5px 0; color: #6b7280;">Review Management Platform</p>
            <p style="margin: 5px 0; color: #6b7280;">support@dibiex.com</p>
          </div>
          <div class="invoice-number">
            <h2>INVOICE</h2>
            <p style="margin: 5px 0; font-size: 18px; font-weight: 600;">${invoice.invoice_number}</p>
            <p style="margin: 5px 0; color: #6b7280;">${format(new Date(invoice.invoice_date), 'MMMM dd, yyyy')}</p>
          </div>
        </div>

        <div class="invoice-details">
          <div>
            <div class="section-title">Bill To:</div>
            <div style="font-weight: 600; font-size: 16px; margin-bottom: 5px;">${invoice.customer_name || invoice.customer_email}</div>
            ${invoice.customer_company ? `<div style="color: #6b7280; margin-bottom: 5px;">${invoice.customer_company}</div>` : ''}
            <div style="color: #6b7280;">${invoice.customer_email}</div>
          </div>
          <div>
            <div class="info-line"><span class="info-label">Invoice Date:</span> ${format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}</div>
            <div class="info-line"><span class="info-label">Payment Date:</span> ${invoice.paid_date ? format(new Date(invoice.paid_date), 'MMM dd, yyyy') : 'Pending'}</div>
            <div class="info-line"><span class="info-label">Payment Method:</span> ${invoice.payment_method.toUpperCase()}</div>
            <div class="info-line"><span class="info-label">Status:</span> <span class="status-paid">${invoice.status.toUpperCase()}</span></div>
            ${invoice.paypal_transaction_id ? `<div class="info-line"><span class="info-label">Transaction ID:</span> ${invoice.paypal_transaction_id}</div>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Period</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>${invoice.plan_name || invoice.plan_type}</strong><br>
                <span style="color: #6b7280; font-size: 14px;">Monthly Subscription</span>
              </td>
              <td>
                ${invoice.billing_period_start && invoice.billing_period_end 
                  ? `${format(new Date(invoice.billing_period_start), 'MMM dd, yyyy')} - ${format(new Date(invoice.billing_period_end), 'MMM dd, yyyy')}`
                  : 'N/A'}
              </td>
              <td style="text-align: right;">$${amount}</td>
            </tr>
            <tr class="total-row">
              <td colspan="2" style="text-align: right;">Total Amount:</td>
              <td style="text-align: right;">$${amount} ${invoice.currency}</td>
            </tr>
          </tbody>
        </table>

        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            <strong>Thank you for your business!</strong><br>
            This invoice confirms your payment for Dibiex ${invoice.plan_name || invoice.plan_type}. 
            Your subscription is active and you have access to all plan features.
          </p>
        </div>

        <div class="footer">
          <p>Dibiex - Review Management Platform</p>
          <p>Questions? Contact us at support@dibiex.com</p>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
            Print / Save as PDF
          </button>
        </div>
      </body>
      </html>
    `;
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      paid: { variant: "default", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      pending: { variant: "secondary", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
      failed: { variant: "destructive", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
      refunded: { variant: "outline", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" }
    };
    return variants[status] || variants.paid;
  };

  const getPlanBadge = (plan: string) => {
    const colors: any = {
      enterprise: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      professional: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      starter: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    };
    return colors[plan] || colors.starter;
  };

  if (!user && !authLoading) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">Invoices</h1>
            </div>
          </header>

          <div className="flex-1 p-8">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Your Invoices</h1>
              <p className="text-muted-foreground">
                View and download all your payment invoices
              </p>
            </div>

            {/* Invoices List */}
            {invoices.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
                  <p className="text-muted-foreground">
                    Invoices will appear here after your first payment
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {invoice.invoice_number}
                          </CardTitle>
                          <CardDescription className="mt-2 space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(invoice.invoice_date), 'MMMM dd, yyyy')}
                            </div>
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              {invoice.payment_method.toUpperCase()}
                            </div>
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold">
                            ${(invoice.amount_cents / 100).toFixed(2)}
                          </div>
                          <p className="text-sm text-muted-foreground">{invoice.currency}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={getPlanBadge(invoice.plan_type)}>
                            {invoice.plan_name || invoice.plan_type}
                          </Badge>
                          <Badge className={getStatusBadge(invoice.status).className}>
                            {invoice.status}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingInvoice(invoice)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => downloadInvoice(invoice)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </Button>
                        </div>
                      </div>
                      {invoice.billing_period_start && invoice.billing_period_end && (
                        <div className="mt-4 text-sm text-muted-foreground">
                          <span className="font-medium">Billing Period:</span>{' '}
                          {format(new Date(invoice.billing_period_start), 'MMM dd, yyyy')} - {format(new Date(invoice.billing_period_end), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Invoice Preview Modal */}
            {viewingInvoice && (
              <div 
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={() => setViewingInvoice(null)}
              >
                <Card 
                  className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-background"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CardHeader className="bg-background">
                    <div className="flex justify-between items-center">
                      <CardTitle>Invoice Preview</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => downloadInvoice(viewingInvoice)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingInvoice(null)}
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="bg-background">
                    <div className="border rounded-lg p-8 bg-card">
                      <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-primary">
                        <div>
                          <div className="text-3xl font-bold">DIBIEX</div>
                          <p className="text-sm text-muted-foreground mt-1">Review Management Platform</p>
                          <p className="text-sm text-muted-foreground">support@dibiex.com</p>
                        </div>
                        <div className="text-right">
                          <h2 className="text-2xl font-bold text-primary">INVOICE</h2>
                          <p className="text-lg font-semibold mt-1">{viewingInvoice.invoice_number}</p>
                          <p className="text-sm text-muted-foreground">{format(new Date(viewingInvoice.invoice_date), 'MMMM dd, yyyy')}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                          <div className="text-xs text-muted-foreground uppercase mb-2">Bill To:</div>
                          <div className="font-semibold text-lg mb-1">{viewingInvoice.customer_name || viewingInvoice.customer_email}</div>
                          {viewingInvoice.customer_company && <div className="text-muted-foreground mb-1">{viewingInvoice.customer_company}</div>}
                          <div className="text-muted-foreground">{viewingInvoice.customer_email}</div>
                        </div>
                        <div className="text-sm space-y-1">
                          <div><span className="text-muted-foreground">Invoice Date:</span> <span className="font-medium">{format(new Date(viewingInvoice.invoice_date), 'MMM dd, yyyy')}</span></div>
                          <div><span className="text-muted-foreground">Payment Date:</span> <span className="font-medium">{viewingInvoice.paid_date ? format(new Date(viewingInvoice.paid_date), 'MMM dd, yyyy') : 'Pending'}</span></div>
                          <div><span className="text-muted-foreground">Payment Method:</span> <span className="font-medium uppercase">{viewingInvoice.payment_method}</span></div>
                          <div><span className="text-muted-foreground">Status:</span> <span className="font-semibold text-green-600">{viewingInvoice.status.toUpperCase()}</span></div>
                        </div>
                      </div>

                      <table className="w-full mb-8">
                        <thead>
                          <tr className="border-b-2">
                            <th className="py-3 text-left text-sm font-semibold">Description</th>
                            <th className="py-3 text-left text-sm font-semibold">Period</th>
                            <th className="py-3 text-right text-sm font-semibold">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-4">
                              <div className="font-semibold">{viewingInvoice.plan_name || viewingInvoice.plan_type}</div>
                              <div className="text-sm text-muted-foreground">Monthly Subscription</div>
                            </td>
                            <td className="py-4 text-sm">
                              {viewingInvoice.billing_period_start && viewingInvoice.billing_period_end 
                                ? `${format(new Date(viewingInvoice.billing_period_start), 'MMM dd, yyyy')} - ${format(new Date(viewingInvoice.billing_period_end), 'MMM dd, yyyy')}`
                                : 'N/A'}
                            </td>
                            <td className="py-4 text-right font-medium">${(viewingInvoice.amount_cents / 100).toFixed(2)}</td>
                          </tr>
                          <tr className="bg-muted/50">
                            <td colSpan={2} className="py-4 text-right font-bold text-lg">Total Amount:</td>
                            <td className="py-4 text-right font-bold text-xl">${(viewingInvoice.amount_cents / 100).toFixed(2)} {viewingInvoice.currency}</td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="bg-muted/30 p-6 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Thank you for your business!</strong><br/>
                          This invoice confirms your payment for Dibiex {viewingInvoice.plan_name || viewingInvoice.plan_type}. 
                          Your subscription is active and you have access to all plan features.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Invoices;

