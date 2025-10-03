import { Button } from "@/components/ui/button";
import { MenuIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/ui/auth-provider";

// Smooth scroll function
const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
};

export function EnhancedHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { signInWithGoogle, signInAsDemo } = useAuth();

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
              onClick={() => scrollToSection('features')}
              className="text-[#2b394c] hover:text-[#ecc00c] transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="text-[#2b394c] hover:text-[#ecc00c] transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-[#2b394c] hover:text-[#ecc00c] transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('testimonials')}
              className="text-[#2b394c] hover:text-[#ecc00c] transition-colors"
            >
              Testimonials
            </button>
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button
              variant="ghost"
              className="text-[#2b394c] hover:text-[#ecc00c] hover:bg-[#ecc00c]/10"
              onClick={signInAsDemo}
            >
              Try Demo
            </Button>
            <Button 
              className="bg-[#2b394c] hover:bg-[#2b394c]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              onClick={signInWithGoogle}
            >
              Get Started
            </Button>
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
                  scrollToSection('features');
                  setIsMenuOpen(false);
                }}
                className="text-[#2b394c] hover:text-[#ecc00c] transition-colors text-left"
              >
                Features
              </button>
              <button
                onClick={() => {
                  scrollToSection('pricing');
                  setIsMenuOpen(false);
                }}
                className="text-[#2b394c] hover:text-[#ecc00c] transition-colors text-left"
              >
                Pricing
              </button>
              <button
                onClick={() => {
                  scrollToSection('how-it-works');
                  setIsMenuOpen(false);
                }}
                className="text-[#2b394c] hover:text-[#ecc00c] transition-colors text-left"
              >
                How It Works
              </button>
              <button
                onClick={() => {
                  scrollToSection('testimonials');
                  setIsMenuOpen(false);
                }}
                className="text-[#2b394c] hover:text-[#ecc00c] transition-colors text-left"
              >
                Testimonials
              </button>
              <div className="flex flex-col space-y-2 pt-4">
                <Button
                  variant="ghost"
                  className="justify-start text-[#2b394c] hover:text-[#ecc00c] hover:bg-[#ecc00c]/10"
                  onClick={signInAsDemo}
                >
                  Try Demo
                </Button>
                <Button 
                  className="bg-[#2b394c] hover:bg-[#2b394c]/90 text-white"
                  onClick={signInWithGoogle}
                >
                  Get Started
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
