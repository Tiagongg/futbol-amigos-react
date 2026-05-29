import { auth } from '../firebase/config';
import type { MatchUserInfo } from '../types/models';
import { loadUserProfile } from './tournamentService';

export async function resolveCurrentMatchUser(): Promise<MatchUserInfo> {
  const user = auth.currentUser;
  if (!user) return {};
  const profile = await loadUserProfile().catch(() => null);
  const email = user.email ?? '';
  const displayName =
    profile?.displayName?.trim() ||
    email.split('@')[0] ||
    '';
  return {
    userId: user.uid,
    email,
    displayName,
  };
}
