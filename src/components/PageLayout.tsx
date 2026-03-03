/**
 * Shared fancy page layout: decorative orbs and optional animated page title.
 * Use inside SidebarInset for consistent look across Dashboard, Invoices, Locations, Settings, etc.
 */
export function PageOrbs() {
  return (
    <>
      <div
        className="pointer-events-none absolute top-20 right-0 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-primary/10 dark:bg-primary/20 blur-3xl -z-10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-1/4 left-0 w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-accent/10 dark:bg-accent/15 blur-3xl -z-10"
        aria-hidden
      />
    </>
  );
}

interface PageTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function PageTitle({ title, subtitle, className = "" }: PageTitleProps) {
  return (
    <div className={`mb-6 sm:mb-8 opacity-0 animate-fade-in-up ${className}`}>
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent dark:to-primary/90">
        {title}
      </h1>
      {subtitle && (
        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">{subtitle}</p>
      )}
    </div>
  );
}

/** Card style for fancy pages: rounded-2xl, shadow, hover lift */
export const fancyCardClass =
  "rounded-2xl border bg-card/80 backdrop-blur-sm shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elegant hover:border-primary/20 dark:hover:border-primary/30";
