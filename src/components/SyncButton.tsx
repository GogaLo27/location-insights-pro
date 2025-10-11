import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import rateLimit from '@/lib/rateLimit';

interface SyncButtonProps {
  locationId: string;
  onSyncComplete?: () => void;
  className?: string;
}

export function SyncButton({ locationId, onSyncComplete, className }: SyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const handleSync = async () => {
    // Rate limit check
    if (rateLimit.sync(locationId)) {
      toast({
        title: "Too Fast!",
        description: "Please wait 5 seconds between syncs",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    setSyncStatus('idle');

    try {
      // Get tokens
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseJwt = session?.access_token;
      const googleAccessToken = session?.provider_token;

      if (!supabaseJwt || !googleAccessToken) {
        throw new Error('Authentication required');
      }

      // Call incremental sync
      const { data, error } = await supabase.functions.invoke('google-business-api', {
        body: {
          action: 'sync_reviews_incremental',
          locationId,
        },
        headers: {
          Authorization: `Bearer ${supabaseJwt}`,
          'X-Google-Token': googleAccessToken,
        },
      });

      if (error) throw error;

      if (data.success) {
        setSyncStatus('success');
        toast({
          title: "Sync Complete!",
          description: data.message || `Synced ${data.new_reviews} new reviews`,
        });
        
        // Call callback
        onSyncComplete?.();

        // Reset status after 3 seconds
        setTimeout(() => setSyncStatus('idle'), 3000);
      } else {
        throw new Error(data.message || 'Sync failed');
      }

    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync reviews",
        variant: "destructive",
      });

      // Reset status after 3 seconds
      setTimeout(() => setSyncStatus('idle'), 3000);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={syncing}
      variant={syncStatus === 'success' ? 'default' : syncStatus === 'error' ? 'destructive' : 'outline'}
      className={className}
    >
      {syncing ? (
        <>
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          Syncing...
        </>
      ) : syncStatus === 'success' ? (
        <>
          <CheckCircle className="w-4 h-4 mr-2" />
          Synced!
        </>
      ) : syncStatus === 'error' ? (
        <>
          <AlertCircle className="w-4 h-4 mr-2" />
          Failed
        </>
      ) : (
        <>
          <RefreshCw className="w-4 h-4 mr-2" />
          Sync New Reviews
        </>
      )}
    </Button>
  );
}

