'use client';
import { createContext, useContext } from 'react';
import type { StudySession } from './types';

export interface AppCtx {
  userId: string;
  email: string;
  openEntry: (session?: StudySession) => void;
}
const Ctx = createContext<AppCtx | null>(null);
export const AppProvider = Ctx.Provider;
export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp must be used inside AppProvider');
  return c;
}
