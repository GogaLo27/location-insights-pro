import { Button } from "@/components/ui/button";
import { MenuIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { GoogleSignInButton } from "@/components/ui/google-signin-button";
import { useNavigate, useLocation } from "react-router-dom";

// Smooth scroll function or navigate to home
const scrollToSection = (sectionId: string, navigate: (path: string) => void, currentPath: string) => {
  // If we're on the home page, scroll to section
  if (currentPath === '/') {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  } else {
    // Otherwise, navigate to home with hash
    navigate(`/#${sectionId}`);
  }
};

export function EnhancedHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { signInWithGoogle, signInAsDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src="/logo.png" 
              alt="Dibiex Logo" 
              className="h-10 w-auto object-contain"
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection('features', navigate, location.pathname)}
              className="text-[#2b394c] hover:text-[#ecc00c] transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('pricing', navigate, location.pathname)}
              className="text-[#2b394c] hover:text-[#ecc00c] transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection('how-it-works', navigate, location.pathname)}
              className="text-[#2b394c] hover:text-[#ecc00c] transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('testimonials', navigate, location.pathname)}
              className="text-[#2b394c] hover:text-[#ecc00c] transition-colors"
            >
              Testimonials
            </button>
            <a
              href="/blog"
              className="text-[#2b394c] hover:text-[#ecc00c] transition-colors"
            >
              Blog
            </a>
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button
              variant="ghost"
              className="text-[#2b394c] hover:text-[#ecc00c] hover:bg-[#ecc00c]/10 h-10"
              onClick={signInAsDemo}
            >
              Try Demo
            </Button>
            <GoogleSignInButton
              onClick={signInWithGoogle}
              text="Sign in with Google"
              variant="light"
              size="default"
              className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 h-10"
            />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 rounded-md text-[#2b394c] hover:text-[#ecc00c] hover:bg-[#ecc00c]/10"
          >
            {isMenuOpen ? (
              <XIcon className="h-6 w-6" />
            ) : (
              <MenuIcon className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-4">
              <button
                onClick={() => {
                  scrollToSection('features', navigate, location.pathname);
                  setIsMenuOpen(false);
                }}
                className="text-[#2b394c] hover:text-[#ecc00c] transition-colors text-left"
              >
                Features
              </button>
              <button
                onClick={() => {
                  scrollToSection('pricing', navigate, location.pathname);
                  setIsMenuOpen(false);
                }}
                className="text-[#2b394c] hover:text-[#ecc00c] transition-colors text-left"
              >
                Pricing
              </button>
              <button
                onClick={() => {
                  scrollToSection('how-it-works', navigate, location.pathname);
                  setIsMenuOpen(false);
                }}
                className="text-[#2b394c] hover:text-[#ecc00c] transition-colors text-left"
              >
                How It Works
              </button>
              <button
                onClick={() => {
                  scrollToSection('testimonials', navigate, location.pathname);
                  setIsMenuOpen(false);
                }}
                className="text-[#2b394c] hover:text-[#ecc00c] transition-colors text-left"
              >
                Testimonials
              </button>
              <a
                href="/blog"
                className="text-[#2b394c] hover:text-[#ecc00c] transition-colors text-left"
              >
                Blog
              </a>
              <div className="flex flex-col space-y-2 pt-4">
                <Button
                  variant="ghost"
                  className="justify-start text-[#2b394c] hover:text-[#ecc00c] hover:bg-[#ecc00c]/10"
                  onClick={signInAsDemo}
                >
                  Try Demo
                </Button>
                <GoogleSignInButton
                  onClick={signInWithGoogle}
                  text="Sign in with Google"
                  variant="light"
                  size="default"
                />
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
