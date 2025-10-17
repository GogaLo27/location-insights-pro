/**
 * Google Sign-In Button Examples
 * 
 * This file demonstrates all available variants and sizes of the GoogleSignInButton component.
 * Use this as a reference when implementing sign-in buttons in your application.
 * 
 * Note: This file is for documentation purposes and is not used in production.
 */

import { GoogleSignInButton } from "./google-signin-button";

export function GoogleSignInButtonExamples() {
  const handleClick = () => {
    console.log("Google sign-in clicked");
  };

  return (
    <div className="p-8 space-y-12 bg-gray-50">
      <div>
        <h2 className="text-2xl font-bold mb-6">Google Sign-In Button Examples</h2>
        <p className="text-gray-600 mb-4">
          All buttons below follow Google's official branding guidelines.
        </p>
      </div>

      {/* Light Variant (Recommended) */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">
          Light Variant (Recommended by Google)
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          White background with colored logo - Google's preferred style
        </p>
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <p className="text-xs text-gray-500 mb-2">Small</p>
            <GoogleSignInButton
              onClick={handleClick}
              text="Sign in with Google"
              variant="light"
              size="sm"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">Default</p>
            <GoogleSignInButton
              onClick={handleClick}
              text="Sign in with Google"
              variant="light"
              size="default"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">Large</p>
            <GoogleSignInButton
              onClick={handleClick}
              text="Sign in with Google"
              variant="light"
              size="lg"
            />
          </div>
        </div>
      </section>

      {/* Default Variant (Google Blue) */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">
          Default Variant (Google Blue)
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Blue background (#4285F4) with white logo
        </p>
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <p className="text-xs text-gray-500 mb-2">Small</p>
            <GoogleSignInButton
              onClick={handleClick}
              text="Sign in with Google"
              variant="default"
              size="sm"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">Default</p>
            <GoogleSignInButton
              onClick={handleClick}
              text="Sign in with Google"
              variant="default"
              size="default"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">Large</p>
            <GoogleSignInButton
              onClick={handleClick}
              text="Sign in with Google"
              variant="default"
              size="lg"
            />
          </div>
        </div>
      </section>

      {/* Icon Only Variant */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">
          Icon Only Variant
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Just the Google logo for compact spaces
        </p>
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <p className="text-xs text-gray-500 mb-2">Small</p>
            <GoogleSignInButton
              onClick={handleClick}
              variant="icon-only"
              size="sm"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">Default</p>
            <GoogleSignInButton
              onClick={handleClick}
              variant="icon-only"
              size="default"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">Large</p>
            <GoogleSignInButton
              onClick={handleClick}
              variant="icon-only"
              size="lg"
            />
          </div>
        </div>
      </section>

      {/* Custom Text Examples */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">
          Custom Text Examples
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          You can customize the text while keeping Google's branding
        </p>
        <div className="flex flex-col gap-4 max-w-md">
          <GoogleSignInButton
            onClick={handleClick}
            text="Sign in with Google"
            variant="light"
            size="default"
          />
          <GoogleSignInButton
            onClick={handleClick}
            text="Continue with Google"
            variant="light"
            size="default"
          />
          <GoogleSignInButton
            onClick={handleClick}
            text="Get Started"
            variant="light"
            size="default"
          />
        </div>
      </section>

      {/* Usage in Different Contexts */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">
          Usage in Different Contexts
        </h3>
        
        {/* On Dark Background */}
        <div className="bg-gray-900 p-6 rounded-lg">
          <p className="text-white text-sm mb-4">On Dark Background</p>
          <GoogleSignInButton
            onClick={handleClick}
            text="Sign in with Google"
            variant="light"
            size="lg"
          />
        </div>

        {/* On Colored Background */}
        <div className="bg-blue-600 p-6 rounded-lg">
          <p className="text-white text-sm mb-4">On Colored Background</p>
          <GoogleSignInButton
            onClick={handleClick}
            text="Sign in with Google"
            variant="light"
            size="lg"
          />
        </div>

        {/* On Gradient Background */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-lg">
          <p className="text-white text-sm mb-4">On Gradient Background</p>
          <GoogleSignInButton
            onClick={handleClick}
            text="Sign in with Google"
            variant="light"
            size="lg"
          />
        </div>
      </section>

      {/* Best Practices */}
      <section className="space-y-4 bg-blue-50 p-6 rounded-lg">
        <h3 className="text-xl font-semibold text-gray-800">
          ✅ Best Practices
        </h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Use the "light" variant for most cases - it's Google's recommended style</li>
          <li>Keep button text simple: "Sign in with Google" or "Continue with Google"</li>
          <li>Don't modify the Google logo colors or proportions</li>
          <li>Ensure sufficient padding around the button (at least 8px)</li>
          <li>Use larger sizes (lg) for primary CTAs on landing pages</li>
          <li>Test the button on different backgrounds to ensure visibility</li>
          <li>Always include hover states for better UX</li>
        </ul>
      </section>

      {/* What NOT to Do */}
      <section className="space-y-4 bg-red-50 p-6 rounded-lg">
        <h3 className="text-xl font-semibold text-gray-800">
          ❌ What NOT to Do
        </h3>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Don't change the Google logo colors</li>
          <li>Don't use outdated Google+ branding</li>
          <li>Don't make the button too small (minimum recommended: default size)</li>
          <li>Don't use ambiguous text like "Login" or "Enter"</li>
          <li>Don't combine with other social login icons in the same button</li>
          <li>Don't modify the aspect ratio of the Google logo</li>
        </ul>
      </section>
    </div>
  );
}

export default GoogleSignInButtonExamples;





