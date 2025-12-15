'use client';
import { useUser as useFirebaseUserHook } from '@/firebase/provider';

// This is now a re-export. All logic is in provider.tsx
export const useUser = useFirebaseUserHook;
export type { UserHookResult as UseUserResult } from '@/firebase/provider';
