'use server';

import { initializeApp, getApps, App, applicationDefault } from 'firebase-admin/app';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export async function initializeServerFirebase(): Promise<App> {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  
  try {
    // When running in a Google Cloud environment, applicationDefault() will automatically
    // find the service account credentials.
    return initializeApp({
      credential: applicationDefault(),
    });
  } catch (e) {
     console.error('Failed to initialize Firebase Admin SDK with Application Default Credentials.', e);
    // As a fallback for different environments, you might use initializeApp() without arguments,
    // but explicit credential handling is more robust.
    try {
        return initializeApp();
    } catch (fallbackError) {
        console.error('Fallback Firebase Admin SDK initialization also failed.', fallbackError);
        // Re-throw the original error to surface the primary issue.
        throw e;
    }
  }
}
