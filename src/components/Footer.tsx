import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gray-100 border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">RL</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Dibiex</span>
            </div>
            <p className="text-gray-600 mb-4 max-w-md">
              AI-powered review management and sentiment analysis for businesses. 
              Get insights from your customer feedback and improve your online reputation.
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span>contact@reviewlip.com</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Phone className="w-4 h-4" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>San Francisco, CA</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4 text-gray-900">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/dashboard" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/reviews" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Reviews
                </Link>
              </li>
              <li>
                <Link to="/analytics" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Analytics
                </Link>
              </li>
              <li>
                <Link to="/sentiment" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Sentiment Analysis
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4 text-gray-900">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Terms and Conditions
                </Link>
              </li>
              <li>
                <Link to="/cookie-policy" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
                  GDPR Compliance
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-6 text-center">
          <p className="text-sm text-gray-600">
            © 2025 Dibiex. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;