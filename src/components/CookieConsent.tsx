import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Cookie } from 'lucide-react';

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const hasAccepted = localStorage.getItem('cookiesAccepted');
    if (!hasAccepted) {
      // Show the popup after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookiesAccepted', 'true');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookiesAccepted', 'false');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border shadow-elegant">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-8 h-8 bg-gradient-to-br from-[#2b394c] to-[#ecc00c] rounded-lg flex items-center justify-center shadow-lg animate-float">
                <Cookie className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  We value your privacy
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We use cookies and similar technologies to enhance your browsing experience, 
                  analyze site traffic, and personalize content. By continuing to use our site, 
                  you consent to our use of cookies. You can learn more about our cookie policy 
                  and manage your preferences at any time.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDecline}
                className="text-xs px-3 py-1.5 hover:bg-muted/50 transition-colors"
              >
                Decline
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
                className="bg-gradient-to-r from-[#2b394c] to-[#ecc00c] hover:from-[#2b394c]/90 hover:to-[#ecc00c]/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-xs px-4 py-1.5 text-white"
              >
                Accept All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="text-muted-foreground hover:text-foreground p-1.5"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
