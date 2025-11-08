import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CampaignData {
  campaign_code?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_page?: string;
  timestamp?: string;
  visitor_id?: string;
  session_id?: string;
}

interface CampaignContextType {
  campaignData: CampaignData | null;
  getCampaignData: () => CampaignData | null;
  clearCampaignData: () => void;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

const STORAGE_KEY = 'campaign_tracking';
const VISITOR_ID_KEY = 'visitor_id';
const SESSION_ID_KEY = 'session_id';
const EXPIRY_DAYS = 30; // Campaign data expires after 30 days

interface CampaignProviderProps {
  children: ReactNode;
}

// Generate unique visitor ID
const getOrCreateVisitorId = (): string => {
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
};

// Generate session ID (expires with browser session)
const getOrCreateSessionId = (): string => {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
};

// Track visit to backend
const trackCampaignVisit = async (campaignData: CampaignData) => {
  try {
    console.log('🔵 Tracking campaign visit for:', campaignData.campaign_code);
    const visitorId = getOrCreateVisitorId();
    const sessionId = getOrCreateSessionId();

    const response = await supabase.functions.invoke('track-campaign-visit', {
      body: {
        campaign_code: campaignData.campaign_code,
        visitor_id: visitorId,
        landing_page: campaignData.landing_page || window.location.pathname,
        referrer: document.referrer || null,
        utm_source: campaignData.utm_source,
        utm_medium: campaignData.utm_medium,
        utm_campaign: campaignData.utm_campaign,
        utm_content: campaignData.utm_content,
        utm_term: campaignData.utm_term,
        user_agent: navigator.userAgent,
        session_id: sessionId
      }
    });
    
    console.log('🔵 Edge function response:', response);
    if (response.error) {
      console.error('🔴 Edge function error:', response.error);
    } else {
      console.log('✅ Visit tracked successfully for campaign:', campaignData.campaign_code);
    }
  } catch (error) {
    console.error('🔴 Failed to track campaign visit:', error);
    // Don't block user experience if tracking fails
  }
};

export const CampaignProvider: React.FC<CampaignProviderProps> = ({ children }) => {
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);

  useEffect(() => {
    console.log('🔵 CampaignProvider mounted - checking for campaign parameters...');
    // Try to load existing campaign data from localStorage
    const loadCampaignData = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          
          // Check if data has expired
          if (parsed.timestamp) {
            const storedDate = new Date(parsed.timestamp);
            const now = new Date();
            const daysDiff = (now.getTime() - storedDate.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysDiff > EXPIRY_DAYS) {
              // Expired, clear it
              localStorage.removeItem(STORAGE_KEY);
              return null;
            }
          }
          
          return parsed;
        }
      } catch (error) {
        console.error('Error loading campaign data:', error);
      }
      return null;
    };

    // Capture URL parameters on first load
    const captureUrlParams = async () => {
      console.log('🔵 Capturing URL params from:', window.location.href);
      const params = new URLSearchParams(window.location.search);
      console.log('🔵 URL params:', Object.fromEntries(params.entries()));
      
      const visitorId = getOrCreateVisitorId();
      const sessionId = getOrCreateSessionId();
      console.log('🔵 Visitor ID:', visitorId);
      
      const newData: CampaignData = {
        // Primary campaign code (can be 'ref' or 'campaign' parameter)
        campaign_code: params.get('ref') || params.get('campaign') || undefined,
        
        // UTM parameters
        utm_source: params.get('utm_source') || undefined,
        utm_medium: params.get('utm_medium') || undefined,
        utm_campaign: params.get('utm_campaign') || undefined,
        utm_content: params.get('utm_content') || undefined,
        utm_term: params.get('utm_term') || undefined,
        
        // Landing page (current path)
        landing_page: window.location.pathname,
        
        // Tracking IDs
        visitor_id: visitorId,
        session_id: sessionId,
        
        // Timestamp for expiry
        timestamp: new Date().toISOString()
      };

      // Only save if we have at least one tracking parameter
      const hasTrackingData = Object.keys(newData).some(
        key => !['landing_page', 'timestamp', 'visitor_id', 'session_id'].includes(key) 
          && newData[key as keyof CampaignData]
      );

      console.log('🔵 Has tracking data?', hasTrackingData, newData);

      if (hasTrackingData) {
        console.log('🔵 Saving campaign data and tracking visit...');
        // Don't override existing campaign data unless this is a new campaign
        const existing = loadCampaignData();
        if (!existing || params.get('ref') || params.get('campaign')) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
          
          // Track the visit in database
          if (newData.campaign_code) {
            await trackCampaignVisit(newData);
          }
          
          return newData;
        }
        return existing;
      }

      // No new tracking data, return existing
      return loadCampaignData();
    };

    captureUrlParams().then(data => {
      console.log('🔵 captureUrlParams result:', data);
      setCampaignData(data);
      // Log for debugging (remove in production)
      if (data && (data.campaign_code || data.utm_source)) {
        console.log('📊 Campaign tracking captured:', data);
      } else {
        console.log('🔵 No campaign data captured');
      }
    }).catch(error => {
      console.error('🔴 Error in captureUrlParams:', error);
    });
  }, []); // Only run once on mount

  const getCampaignData = (): CampaignData | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error getting campaign data:', error);
    }
    return null;
  };

  const clearCampaignData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCampaignData(null);
  };

  return (
    <CampaignContext.Provider value={{ campaignData, getCampaignData, clearCampaignData }}>
      {children}
    </CampaignContext.Provider>
  );
};

// Hook to use campaign context
export const useCampaign = (): CampaignContextType => {
  const context = useContext(CampaignContext);
  if (context === undefined) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
};

// Utility function to get campaign data without context (for use in functions)
export const getCampaignDataFromStorage = (): CampaignData | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error getting campaign data from storage:', error);
  }
  return null;
};

