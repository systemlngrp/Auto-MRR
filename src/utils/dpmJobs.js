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

export function loadDpmJobs(firm) {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(storageKey(firm));
  return safeParse(raw);
}

export function saveDpmJobs(firm, jobs) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(firm), JSON.stringify(Array.isArray(jobs) ? jobs : []));
}

export function addDpmJob(firm, job) {
  const jobs = loadDpmJobs(firm);
  const now = new Date().toISOString();
  const id = `dpm_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const record = {
    id,
    stage: 'reel_issue_pending',
    created_at: now,
    updated_at: now,
    ...job
  };
  jobs.unshift(record);
  saveDpmJobs(firm, jobs);
  return record;
}

export function updateDpmJob(firm, id, patch) {
  const jobs = loadDpmJobs(firm);
  const now = new Date().toISOString();
  const next = jobs.map((j) => (j?.id === id ? { ...j, ...patch, updated_at: now } : j));
  saveDpmJobs(firm, next);
  return next;
}

export function updateDpmJobStage(firm, id, stage) {
  return updateDpmJob(firm, id, { stage });
}

