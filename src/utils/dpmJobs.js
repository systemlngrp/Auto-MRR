import { fetchDpmJobs, saveDpmJob, deleteDpmJob } from '../sheetSync';

const STORAGE_PREFIX = 'rms_dpm_jobs_v1';

function firmKey(firm) {
  return String(firm?.spreadsheetId || firm?.id || firm?.firm_id || 'lnki').trim() || 'lnki';
}

function storageKey(firm) {
  return `${STORAGE_PREFIX}:${firmKey(firm)}`;
}

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Loads jobs from local storage (cache).
 */
export function loadDpmJobsLocal(firm) {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(storageKey(firm));
  return safeParse(raw);
}

/**
 * Loads jobs from backend and updates local cache.
 */
export async function loadDpmJobs(firm) {
  try {
    const remoteJobs = await fetchDpmJobs(firm);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey(firm), JSON.stringify(remoteJobs));
    }
    return remoteJobs;
  } catch (err) {
    console.error('Failed to load DPM jobs from backend:', err);
    return loadDpmJobsLocal(firm);
  }
}

export function saveDpmJobsLocal(firm, jobs) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(firm), JSON.stringify(Array.isArray(jobs) ? jobs : []));
}

export async function addDpmJob(firm, job) {
  const now = new Date().toISOString();
  const id = `dpm_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const record = {
    id,
    stage: 'reel_issue_pending',
    created_at: now,
    updated_at: now,
    ...job
  };

  // Optimistic local update
  const jobs = loadDpmJobsLocal(firm);
  jobs.unshift(record);
  saveDpmJobsLocal(firm, jobs);

  // Sync to backend
  try {
    await saveDpmJob(firm, record);
  } catch (err) {
    console.error('Failed to save DPM job to backend:', err);
  }
  return record;
}

export async function updateDpmJob(firm, id, patch) {
  const jobs = loadDpmJobsLocal(firm);
  const now = new Date().toISOString();
  let updatedJob = null;
  const next = jobs.map((j) => {
    if (j?.id === id) {
      updatedJob = { ...j, ...patch, updated_at: now };
      return updatedJob;
    }
    return j;
  });

  // Optimistic local update
  saveDpmJobsLocal(firm, next);

  // Sync to backend
  if (updatedJob) {
    try {
      await saveDpmJob(firm, updatedJob);
    } catch (err) {
      console.error('Failed to update DPM job on backend:', err);
    }
  }
  return next;
}

export async function deleteDpmJobRecord(firm, id) {
  const jobs = loadDpmJobsLocal(firm);
  const next = jobs.filter((j) => j?.id !== id);
  
  // Optimistic local update
  saveDpmJobsLocal(firm, next);

  // Sync to backend
  try {
    await deleteDpmJob(firm, id);
  } catch (err) {
    console.error('Failed to delete DPM job from backend:', err);
  }
  return next;
}

export async function updateDpmJobStage(firm, id, stage) {
  return updateDpmJob(firm, id, { stage });
}

