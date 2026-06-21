import { createClient } from '@supabase/supabase-js';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dvyohojgkhbdztrgvmxc.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-anon-key';

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get authentication headers including Supabase JWT access token.
 */
async function getAuthHeaders() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { 'Authorization': `Bearer ${session.access_token}` };
    }
  } catch (err) {
    console.error('Error getting auth headers:', err);
  }
  return {};
}

/**
 * Wrapper around global fetch that automatically injects auth headers.
 */
async function authedFetch(url, options = {}) {
  const authHeaders = await getAuthHeaders();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...authHeaders
  };
  return fetch(url, { ...options, headers });
}

/**
 * Handle HTTP response and return JSON.
 * @param {Response} response 
 * @returns {Promise<any>}
 */
async function handleResponse(response) {
  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errJson = await response.json();
      errorMsg = errJson.message || errJson.error || errorMsg;
    } catch (e) {
      // no-op
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

export async function fetchSession() {
  const res = await authedFetch(`${API_BASE_URL}/user/session`);
  return handleResponse(res);
}

export async function saveProfile(profileData, userId) {
  const query = userId ? `?user_id=${userId}` : '';
  const res = await authedFetch(`${API_BASE_URL}/user/profile${query}`, {
    method: 'POST',
    body: JSON.stringify(profileData)
  });
  return handleResponse(res);
}

export async function fetchProfile(userId) {
  const query = userId ? `?user_id=${userId}` : '';
  const res = await authedFetch(`${API_BASE_URL}/user/profile${query}`);
  return handleResponse(res);
}

export async function saveGoal(goalData, userId) {
  const query = userId ? `?user_id=${userId}` : '';
  const res = await authedFetch(`${API_BASE_URL}/user/goal${query}`, {
    method: 'POST',
    body: JSON.stringify(goalData)
  });
  return handleResponse(res);
}

export async function fetchGoal(userId) {
  const query = userId ? `?user_id=${userId}` : '';
  const res = await authedFetch(`${API_BASE_URL}/user/goal${query}`);
  return handleResponse(res);
}

export async function saveLog(logData, userId) {
  const query = userId ? `?user_id=${userId}` : '';
  const res = await authedFetch(`${API_BASE_URL}/logs${query}`, {
    method: 'POST',
    body: JSON.stringify(logData)
  });
  return handleResponse(res);
}

export async function fetchLogs(userId, startDate = '', endDate = '') {
  let url = `${API_BASE_URL}/logs?user_id=${userId}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  const res = await authedFetch(url);
  return handleResponse(res);
}

export async function deleteLog(logId) {
  const res = await authedFetch(`${API_BASE_URL}/logs/${logId}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

export async function fetchWhatIfSimulation(currentType, replacementType, distance, frequency) {
  const query = `?currentType=${encodeURIComponent(currentType)}&replacementType=${encodeURIComponent(replacementType)}&distance=${distance}&frequency=${frequency}`;
  const res = await authedFetch(`${API_BASE_URL}/analysis/what-if${query}`);
  return handleResponse(res);
}

export async function fetchForecast(userId) {
  const query = userId ? `?user_id=${userId}` : '';
  const res = await authedFetch(`${API_BASE_URL}/analysis/forecast${query}`);
  return handleResponse(res);
}

export async function fetchCoaching(userId) {
  const query = userId ? `?user_id=${userId}` : '';
  const res = await authedFetch(`${API_BASE_URL}/analysis/coach${query}`);
  return handleResponse(res);
}

export async function fetchJourneyPlan(origin, destination) {
  const query = `?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
  const res = await authedFetch(`${API_BASE_URL}/analysis/journey-plan${query}`);
  return handleResponse(res);
}

export async function saveJourneyHistory(journeyData, userId) {
  const query = userId ? `?user_id=${userId}` : '';
  const res = await authedFetch(`${API_BASE_URL}/journeys${query}`, {
    method: 'POST',
    body: JSON.stringify(journeyData)
  });
  return handleResponse(res);
}

export async function fetchJourneyHistory(userId) {
  const query = userId ? `?user_id=${userId}` : '';
  const res = await authedFetch(`${API_BASE_URL}/journeys${query}`);
  return handleResponse(res);
}

export async function fetchJourneyCoachAdvice(journeyData) {
  const res = await authedFetch(`${API_BASE_URL}/analysis/journey-coach`, {
    method: 'POST',
    body: JSON.stringify(journeyData)
  });
  return handleResponse(res);
}

export async function submitAuditChat(messages, userId) {
  const res = await authedFetch(`${API_BASE_URL}/audit/chat`, {
    method: 'POST',
    body: JSON.stringify({ messages, user_id: userId })
  });
  return handleResponse(res);
}

export async function submitAuditForm(profileData, userId) {
  const res = await authedFetch(`${API_BASE_URL}/audit/form`, {
    method: 'POST',
    body: JSON.stringify({ ...profileData, user_id: userId })
  });
  return handleResponse(res);
}

export async function askDecisionChat(question) {
  const res = await authedFetch(`${API_BASE_URL}/decision/chat`, {
    method: 'POST',
    body: JSON.stringify({ question })
  });
  return handleResponse(res);
}

export async function extractReceiptFile(fileData, filename, mimeType, userId) {
  const res = await authedFetch(`${API_BASE_URL}/receipts/extract`, {
    method: 'POST',
    body: JSON.stringify({ fileData, filename, mimeType, user_id: userId })
  });
  return handleResponse(res);
}

export async function confirmReceiptData(receiptData, userId) {
  const res = await authedFetch(`${API_BASE_URL}/receipts/confirm`, {
    method: 'POST',
    body: JSON.stringify({ ...receiptData, user_id: userId })
  });
  return handleResponse(res);
}

export async function fetchReceiptHistory(userId) {
  const query = userId ? `?user_id=${userId}` : '';
  const res = await authedFetch(`${API_BASE_URL}/receipts/history${query}`);
  return handleResponse(res);
}

export async function fetchTwinData(userId) {
  const query = userId ? `?user_id=${userId}` : '';
  const res = await authedFetch(`${API_BASE_URL}/twin${query}`);
  return handleResponse(res);
}

export async function fetchTwinNarrative(currentYou, futureYou, goalType) {
  const res = await authedFetch(`${API_BASE_URL}/twin/narrative`, {
    method: 'POST',
    body: JSON.stringify({ currentYou, futureYou, goalType })
  });
  return handleResponse(res);
}
