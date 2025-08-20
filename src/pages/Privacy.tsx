import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Privacy = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-xl font-semibold ml-4">Privacy Policy</h1>
          </header>
          
          <div className="flex-1 space-y-4 p-8 pt-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 prose prose-sm max-w-none">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Information We Collect</h3>
                  <p className="text-muted-foreground">
                    We collect information you provide directly to us, such as when you create an account, 
                    use our services, or contact us for support. This may include your name, email address, 
                    business information, and Google Business Profile data.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">How We Use Your Information</h3>
                  <p className="text-muted-foreground">
                    We use the information we collect to provide, maintain, and improve our services, 
                    process transactions, send communications, and comply with legal obligations. 
                    We analyze your business reviews to provide sentiment analysis and insights.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Information Sharing</h3>
                  <p className="text-muted-foreground">
                    We do not sell, trade, or otherwise transfer your personal information to third parties 
                    without your consent, except as described in this policy. We may share information with 
                    service providers who assist us in operating our platform.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Data Security</h3>
                  <p className="text-muted-foreground">
                    We implement appropriate security measures to protect your personal information against 
                    unauthorized access, alteration, disclosure, or destruction. However, no method of 
                    transmission over the internet is 100% secure.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Your Rights</h3>
                  <p className="text-muted-foreground">
                    You have the right to access, update, or delete your personal information. You may also 
                    opt out of certain communications from us. To exercise these rights, please contact us 
                    using the information provided below.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Changes to This Policy</h3>
                  <p className="text-muted-foreground">
                    We may update this privacy policy from time to time. We will notify you of any changes 
                    by posting the new policy on this page and updating the effective date.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Contact Us</h3>
                  <p className="text-muted-foreground">
                    If you have any questions about this privacy policy, please contact us at privacy@reviewlip.com 
                    or use the contact information provided in our footer.
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Effective Date: January 20, 2025
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Privacy;