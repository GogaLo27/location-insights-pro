import { supabase } from '@/integrations/supabase/client'

/**
 * Gets the current Supabase JWT and Google provider token.
 * Refreshes the session if the Google token is missing.
 */
export const getSessionTokens = async (): Promise<{ supabaseJwt: string; googleAccessToken: string }> => {
  let { data: { session } } = await supabase.auth.getSession()
  if (!session?.provider_token) {
    await supabase.auth.refreshSession()
    const refreshed = await supabase.auth.getSession()
    session = refreshed.data.session
  }
  return {
    supabaseJwt: session?.access_token ?? '',
    googleAccessToken: session?.provider_token ?? '',
  }
}

/**
 * Resolves a location to a consistent string ID.
 * Handles both DB shape (id/location_id) and Google shape (google_place_id).
 */
export const resolveLocationId = (location: Record<string, unknown>): string => {
  const directId = (location.id ?? location.location_id) as string | undefined
  if (directId) return String(directId)
  const gp = (location.google_place_id ?? '') as string
  return gp.split('/').pop() ?? gp
}
