import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GoogleSignInButtonProps {
  onClick: () => void;
  text?: string;
  variant?: "default" | "light" | "icon-only";
  size?: "default" | "lg" | "sm";
  className?: string;
}

// Official Google logo SVG
const GoogleLogo = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    xmlns="http://www.w3.org/2000/svg"
    className="mr-2"
  >
    <g fill="none" fillRule="evenodd">
      <path
        d="M17.64 9.20454545c0-.63818181-.0573091-1.25181818-.1636364-1.84090909H9v3.48136364h4.8436364c-.2086364.9954545-.8418182 1.8390909-1.7954545 2.4045454v2.0181818h2.9090909c1.7018182-1.5668182 2.6836364-3.8736364 2.6836364-6.6068182z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.4672727-.8059091 5.9563636-2.1804545l-2.9090909-2.0181819c-.8045454.5386364-1.8336364.8568182-3.0472727.8568182-2.34409091 0-4.32818182-1.5831818-5.03454545-3.7104545H.95727273v2.0836363C2.43818182 15.4831818 5.48181818 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.96545455 10.9477273c-.18-.5386364-.28227273-1.1136364-.28227273-1.7045455 0-.5909091.10227273-1.16590909.28227273-1.70454545V5.49363636H.95727273C.34772727 6.71181818 0 8.08181818 0 9.52272727c0 1.44090909.34772727 2.81090909.95727273 4.02909093l3.00818182-2.6040909z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.57954545c1.3213636 0 2.5077273.45409091 3.4404545 1.34590909l2.5813637-2.58136364C13.4631818.891818182 11.4259091 0 9 0 5.48181818 0 2.43818182 2.51681818.95727273 5.49363636l3.00818182 2.33181819C4.67181818 5.16272727 6.65590909 3.57954545 9 3.57954545z"
        fill="#EA4335"
      />
    </g>
  </svg>
);

export function GoogleSignInButton({
  onClick,
  text = "Continue with Google",
  variant = "default",
  size = "default",
  className,
}: GoogleSignInButtonProps) {
  // Default variant - White background with Google colors (Google's recommended style)
  if (variant === "light") {
    return (
      <Button
        onClick={onClick}
        size={size}
        className={cn(
          "bg-white hover:bg-gray-50 text-gray-700 font-medium border border-gray-300 shadow-sm hover:shadow-md transition-all duration-200",
          size === "lg" && "px-8 py-6 text-lg h-auto",
          size === "default" && "px-6 py-3 h-auto",
          size === "sm" && "px-4 py-2 text-sm h-auto",
          className
        )}
      >
        <GoogleLogo />
        {text}
      </Button>
    );
  }

  // Icon only variant
  if (variant === "icon-only") {
    return (
      <Button
        onClick={onClick}
        size={size}
        className={cn(
          "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm hover:shadow-md transition-all duration-200 p-3",
          className
        )}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g fill="none" fillRule="evenodd">
            <path
              d="M17.64 9.20454545c0-.63818181-.0573091-1.25181818-.1636364-1.84090909H9v3.48136364h4.8436364c-.2086364.9954545-.8418182 1.8390909-1.7954545 2.4045454v2.0181818h2.9090909c1.7018182-1.5668182 2.6836364-3.8736364 2.6836364-6.6068182z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.4672727-.8059091 5.9563636-2.1804545l-2.9090909-2.0181819c-.8045454.5386364-1.8336364.8568182-3.0472727.8568182-2.34409091 0-4.32818182-1.5831818-5.03454545-3.7104545H.95727273v2.0836363C2.43818182 15.4831818 5.48181818 18 9 18z"
              fill="#34A853"
            />
            <path
              d="M3.96545455 10.9477273c-.18-.5386364-.28227273-1.1136364-.28227273-1.7045455 0-.5909091.10227273-1.16590909.28227273-1.70454545V5.49363636H.95727273C.34772727 6.71181818 0 8.08181818 0 9.52272727c0 1.44090909.34772727 2.81090909.95727273 4.02909093l3.00818182-2.6040909z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.57954545c1.3213636 0 2.5077273.45409091 3.4404545 1.34590909l2.5813637-2.58136364C13.4631818.891818182 11.4259091 0 9 0 5.48181818 0 2.43818182 2.51681818.95727273 5.49363636l3.00818182 2.33181819C4.67181818 5.16272727 6.65590909 3.57954545 9 3.57954545z"
              fill="#EA4335"
            />
          </g>
        </svg>
      </Button>
    );
  }

  // Default variant - Google Blue (alternative style)
  return (
    <Button
      onClick={onClick}
      size={size}
      className={cn(
        "bg-[#4285F4] hover:bg-[#357AE8] text-white font-medium shadow-md hover:shadow-lg transition-all duration-200",
        size === "lg" && "px-8 py-6 text-lg h-auto",
        size === "default" && "px-6 py-3 h-auto",
        size === "sm" && "px-4 py-2 text-sm h-auto",
        className
      )}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        xmlns="http://www.w3.org/2000/svg"
        className="mr-2"
      >
        <path
          d="M17.64 9.20454545c0-.63818181-.0573091-1.25181818-.1636364-1.84090909H9v3.48136364h4.8436364c-.2086364.9954545-.8418182 1.8390909-1.7954545 2.4045454v2.0181818h2.9090909c1.7018182-1.5668182 2.6836364-3.8736364 2.6836364-6.6068182z"
          fill="#FFFFFF"
        />
        <path
          d="M9 18c2.43 0 4.4672727-.8059091 5.9563636-2.1804545l-2.9090909-2.0181819c-.8045454.5386364-1.8336364.8568182-3.0472727.8568182-2.34409091 0-4.32818182-1.5831818-5.03454545-3.7104545H.95727273v2.0836363C2.43818182 15.4831818 5.48181818 18 9 18z"
          fill="#FFFFFF"
        />
        <path
          d="M3.96545455 10.9477273c-.18-.5386364-.28227273-1.1136364-.28227273-1.7045455 0-.5909091.10227273-1.16590909.28227273-1.70454545V5.49363636H.95727273C.34772727 6.71181818 0 8.08181818 0 9.52272727c0 1.44090909.34772727 2.81090909.95727273 4.02909093l3.00818182-2.6040909z"
          fill="#FFFFFF"
        />
        <path
          d="M9 3.57954545c1.3213636 0 2.5077273.45409091 3.4404545 1.34590909l2.5813637-2.58136364C13.4631818.891818182 11.4259091 0 9 0 5.48181818 0 2.43818182 2.51681818.95727273 5.49363636l3.00818182 2.33181819C4.67181818 5.16272727 6.65590909 3.57954545 9 3.57954545z"
          fill="#FFFFFF"
        />
      </svg>
      {text}
    </Button>
  );
}





