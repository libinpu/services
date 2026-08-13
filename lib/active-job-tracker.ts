import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchActiveProviderJob } from './tracking-api';

const ACTIVE_JOB_KEY = 'active_provider_job_id';

export async function getStoredActiveJobId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_JOB_KEY);
  } catch {
    return null;
  }
}

export async function setStoredActiveJobId(jobId: string | null): Promise<void> {
  try {
    if (jobId) await AsyncStorage.setItem(ACTIVE_JOB_KEY, jobId);
    else await AsyncStorage.removeItem(ACTIVE_JOB_KEY);
  } catch {
    // ignore
  }
}

/** Restore active job from backend (source of truth) and sync local storage. */
export async function restoreActiveProviderJob(providerId: string) {
  const job = await fetchActiveProviderJob(providerId);
  await setStoredActiveJobId(job?.id ?? null);
  return job;
}
