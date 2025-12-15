'use server';

import { initializeApp, getApps, App } from 'firebase-admin/app';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeServerFirebase(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  
  // Important! initializeApp() is called without any arguments because Firebase App Hosting
  // integrates with the initializeApp() function to provide the environment variables needed to
  // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
  // without arguments.
  let firebaseApp;
  try {
    // Attempt to initialize via Firebase App Hosting environment variables
    firebaseApp = initializeApp();
  } catch (e) {
    // Only warn in production because it's normal to use a service account in development
    if (process.env.NODE_ENV === "production") {
      console.warn('Automatic server initialization failed. You may need to configure a service account.', e);
    }
    // For local development, you would typically use a service account JSON file.
    // Since we don't have that in this environment, this will likely fail if run locally without App Hosting.
    firebaseApp = initializeApp();
  }

  return firebaseApp;
}
