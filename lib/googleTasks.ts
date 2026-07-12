import { ActionItem } from './types';

const SCOPE = 'https://www.googleapis.com/auth/tasks';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: TokenResponse) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

let gisLoading: Promise<void> | null = null;
let accessToken: string | null = null;
let tokenExpiry = 0;

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoading) return gisLoading;
  gisLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisLoading = null;
      reject(new Error('Could not load Google sign-in — check your connection'));
    };
    document.head.appendChild(script);
  });
  return gisLoading;
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      'Google Client ID not configured — add NEXT_PUBLIC_GOOGLE_CLIENT_ID to .env.local and restart the app'
    );
  }
  // reuse cached token if it has at least a minute left
  if (accessToken && Date.now() < tokenExpiry - 60_000) return accessToken;

  await loadGis();
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: resp => {
        if (resp.error) {
          reject(new Error(resp.error_description || resp.error));
          return;
        }
        accessToken = resp.access_token;
        tokenExpiry = Date.now() + (Number(resp.expires_in) || 3600) * 1000;
        resolve(resp.access_token);
      },
      error_callback: err => reject(new Error(err?.message || 'Google sign-in was cancelled')),
    });
    client.requestAccessToken();
  });
}

export async function addToGoogleTasks(item: ActionItem): Promise<void> {
  const token = await getAccessToken();

  // Google Tasks stores due as date-only (time of day is discarded),
  // so a set time is recorded in the notes instead.
  const notes = [
    item.time ? `Time: ${item.time}` : '',
    item.description,
    ...item.tasks.map(t => `• ${t.task}`),
  ]
    .filter(Boolean)
    .join('\n');

  const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: item.title,
      notes: notes || undefined,
      due: `${item.date}T00:00:00.000Z`,
    }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      accessToken = null; // stale token — next attempt re-prompts
      throw new Error('Google session expired — try exporting again');
    }
    throw new Error(`Google Tasks error (${res.status}) — ${(await res.text()).slice(0, 200)}`);
  }
}
