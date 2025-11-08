import { useEffect } from 'react';
import { useAuth } from '@/components/ui/auth-provider';
import { supabase } from '@/integrations/supabase/client';
import { getCampaignDataFromStorage } from '@/contexts/CampaignContext';

// Hook to track signup after Google authentication
export const useCampaignSignupTracking = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const trackSignup = async () => {
      try {
        // Get campaign data from localStorage
        const campaignData = getCampaignDataFromStorage();
        
        if (!campaignData?.campaign_code) {
          console.log('🔵 No campaign data to track for signup');
          return;
        }

        console.log('🔵 User authenticated, checking if we need to track signup...', user.id);

        // Check if user profile already has campaign data
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('signup_campaign_code')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('🔴 Error checking user profile:', profileError);
          return;
        }

        // If user already has campaign data, don't override
        if (profile?.signup_campaign_code) {
          console.log('🔵 User already has campaign data, skipping');
          return;
        }

        console.log('🔵 Updating user profile with campaign data:', campaignData);

        // Update user profile with campaign data
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            signup_campaign_code: campaignData.campaign_code,
            signup_referral_source: campaignData.utm_source || null,
            signup_referral_medium: campaignData.utm_medium || null,
            signup_referral_campaign: campaignData.utm_campaign || null,
            signup_referral_content: campaignData.utm_content || null,
            signup_referral_term: campaignData.utm_term || null,
            signup_landing_page: campaignData.landing_page || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('🔴 Error updating user profile:', updateError);
        } else {
          console.log('✅ Signup tracked! User attributed to campaign:', campaignData.campaign_code);
        }

      } catch (error) {
        console.error('🔴 Error in signup tracking:', error);
      }
    };

    // Small delay to ensure user profile is created
    const timer = setTimeout(trackSignup, 1000);
    return () => clearTimeout(timer);
  }, [user]);
};

