import { Link } from "react-router-dom";
import {
  TwitterIcon,
  LinkedinIcon,
  FacebookIcon,
  InstagramIcon,
} from "lucide-react";

export function EnhancedFooter() {
  const footerLinks = {
    product: [
      { name: "Features", href: "#features" },
      { name: "Pricing", href: "#pricing" },
      { name: "Analytics", href: "/analytics" },
      { name: "Sentiment Analysis", href: "/sentiment" },
    ],

    company: [
      { name: "About Us", href: "#about" },
      { name: "Contact", href: "#contact" },
      { name: "Support", href: "#support" },
      { name: "Blog", href: "#blog" },
    ],

    resources: [
      { name: "Help Center", href: "#help" },
      { name: "Tutorials", href: "#tutorials" },
      { name: "API Documentation", href: "#api" },
      { name: "Case Studies", href: "#cases" },
    ],

    legal: [
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Terms & Conditions", href: "/terms" },
      { name: "Cookie Policy", href: "/cookie-policy" },
      { name: "GDPR Compliance", href: "#gdpr" },
    ],
  };

  const socialLinks = [
    { name: "Twitter", icon: TwitterIcon, href: "#" },
    { name: "LinkedIn", icon: LinkedinIcon, href: "#" },
    { name: "Facebook", icon: FacebookIcon, href: "#" },
    { name: "Instagram", icon: InstagramIcon, href: "#" },
  ];

  return (
    <footer className="bg-[#2b394c] text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
            {/* Company Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center mb-6">
                <img 
                  src="/logo.png" 
                  alt="ReviewLip Logo" 
                  className="h-10 w-auto object-contain"
                />
              </div>
              <p className="text-gray-300 mb-6 leading-relaxed">
                Transform your Google Reviews into powerful business insights
                with AI-powered sentiment analysis and performance metrics.
              </p>
              <div className="flex space-x-4">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      className="w-10 h-10 bg-[#2b394c]/80 rounded-lg flex items-center justify-center hover:bg-[#ecc00c] hover:text-[#2b394c] transition-colors"
                      aria-label={social.name}
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-3">
                {footerLinks.product.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-gray-300 hover:text-[#ecc00c] transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-gray-300 hover:text-[#ecc00c] transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-3">
                {footerLinks.resources.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-gray-300 hover:text-[#ecc00c] transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-gray-300 hover:text-[#ecc00c] transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-[#2b394c]/50 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="text-gray-300 text-sm">
              © 2024 ReviewLip. All rights reserved.
            </div>

            {/* Legal Links */}
            <div className="flex flex-wrap justify-center md:justify-end space-x-6 text-sm">
              <Link
                to="/privacy"
                className="text-gray-300 hover:text-[#ecc00c] transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="text-gray-300 hover:text-[#ecc00c] transition-colors"
              >
                Terms & Conditions
              </Link>
              <Link
                to="/cookie-policy"
                className="text-gray-300 hover:text-[#ecc00c] transition-colors"
              >
                Cookie Policy
              </Link>
              <a
                href="#contact"
                className="text-gray-300 hover:text-[#ecc00c] transition-colors"
              >
                Contact
              </a>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-6 pt-6 border-t border-[#2b394c]/50">
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              Google and Google Business Profile are trademarks of Google LLC.
              ReviewLip is not affiliated with or endorsed by Google. This
              service uses the Google My Business API to fetch publicly
              available review data with proper authentication and user consent.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

