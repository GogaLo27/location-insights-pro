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
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">RL</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                ReviewLip
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection('features')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('testimonials')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Testimonials
            </button>
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button
              variant="ghost"
              className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              onClick={signInAsDemo}
            >
              Try Demo
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              onClick={signInWithGoogle}
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
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
                className="text-gray-600 hover:text-gray-900 transition-colors text-left"
              >
                Features
              </button>
              <button
                onClick={() => {
                  scrollToSection('pricing');
                  setIsMenuOpen(false);
                }}
                className="text-gray-600 hover:text-gray-900 transition-colors text-left"
              >
                Pricing
              </button>
              <button
                onClick={() => {
                  scrollToSection('how-it-works');
                  setIsMenuOpen(false);
                }}
                className="text-gray-600 hover:text-gray-900 transition-colors text-left"
              >
                How It Works
              </button>
              <button
                onClick={() => {
                  scrollToSection('testimonials');
                  setIsMenuOpen(false);
                }}
                className="text-gray-600 hover:text-gray-900 transition-colors text-left"
              >
                Testimonials
              </button>
              <div className="flex flex-col space-y-2 pt-4">
                <Button
                  variant="ghost"
                  className="justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  onClick={signInAsDemo}
                >
                  Try Demo
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
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
