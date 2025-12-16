
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onIdTokenChanged } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import type { IdTokenResult } from 'firebase/auth';

interface UserAuthState {
  user: User | null;
  decodedClaims: IdTokenResult['claims'] | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean; 
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  user: User | null;
  decodedClaims: IdTokenResult['claims'] | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
  user: User | null;
  decodedClaims: IdTokenResult['claims'] | null,
  isUserLoading: boolean;
  userError: Error | null;
}

export interface UserHookResult { 
  user: User | null;
  decodedClaims: IdTokenResult['claims'] | null,
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
  storage,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: auth?.currentUser || null, // Immediately set user if available
    decodedClaims: null,
    isUserLoading: !auth?.currentUser, // If user exists, we aren't "loading"
    userError: null,
  });

  useEffect(() => {
    if (!auth) {
      setUserAuthState({ user: null, decodedClaims: null, isUserLoading: false, userError: new Error("Auth service not provided.") });
      return;
    }

    // Set initial loading state only if user is not already available
    if (!auth.currentUser) {
        setUserAuthState(prev => ({ ...prev, isUserLoading: true }));
    }

    const unsubscribe = onIdTokenChanged(
      auth,
      async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const idTokenResult = await firebaseUser.getIdTokenResult();
            setUserAuthState({ user: firebaseUser, decodedClaims: idTokenResult.claims, isUserLoading: false, userError: null });
          } catch (error) {
            console.error("FirebaseProvider: getIdTokenResult error:", error);
            setUserAuthState({ user: firebaseUser, decodedClaims: null, isUserLoading: false, userError: error as Error });
          }
        } else {
          setUserAuthState({ user: null, decodedClaims: null, isUserLoading: false, userError: null });
        }
      },
      (error) => {
        console.error("FirebaseProvider: onIdTokenChanged error:", error);
        setUserAuthState({ user: null, decodedClaims: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe();
  }, [auth]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth && storage);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      storage: servicesAvailable ? storage : null,
      user: userAuthState.user,
      decodedClaims: userAuthState.decodedClaims,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, storage, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth || !context.storage) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    storage: context.storage,
    user: context.user,
    decodedClaims: context.decodedClaims,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

export const useStorage = (): FirebaseStorage => {
    const { storage } = useFirebase();
    return storage;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase<T> = T & { __memo?: boolean };

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const memoized = useMemo(factory, deps);

    if (memoized && typeof memoized === 'object') {
        try {
            Object.defineProperty(memoized, '__memo', {
                value: true,
                writable: false,
                enumerable: false,
                configurable: false,
            });
        } catch (e) {
            // This might fail on frozen objects, but it's a dev-time check, so we can ignore it.
        }
    }
    
    return memoized;
}

export const useUser = (): UserHookResult => {
  const { user, decodedClaims, isUserLoading, userError } = useFirebase();
  return { user, decodedClaims, isUserLoading, userError };
};
