'use client';
import { createContext } from 'react';
import { defaultProfile, type Profile } from '@/lib/profile';
export const RoomAppearance = createContext<
  Profile['appearance'] & { name: string; personalized?: boolean }
>({ ...defaultProfile.appearance, name: 'sophie' });
