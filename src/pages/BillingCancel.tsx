import { Link } from 'react-router-dom';
import { PageOrbs, fancyCardClass } from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function BillingCancel() {
  return (
    <div className="min-h-screen relative overflow-x-hidden flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10 p-4">
      <PageOrbs />
      <Card className={`max-w-md w-full ${fancyCardClass}`}>
        <CardContent className="pt-6 text-center">
          <p className="text-lg text-muted-foreground mb-4">Payment canceled. You can select a plan again anytime.</p>
          <Button asChild>
            <Link to="/dashboard/upgrade">Choose a plan</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
