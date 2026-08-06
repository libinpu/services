import { supabase } from './supabase';

let channelSequence = 0;

/**
 * A unique client channel name avoids reusing a channel that is still being
 * asynchronously removed during React Strict Mode or Expo Fast Refresh.
 */
export function createRealtimeChannel(scope: string) {
  channelSequence += 1;
  return supabase.channel(`${scope}:${Date.now()}:${channelSequence}`);
}
