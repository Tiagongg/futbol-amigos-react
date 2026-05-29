import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase/config';

export function subscribeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function reloadUser() {
  await auth.currentUser?.reload();
}

export function isEmailVerified(): boolean {
  return auth.currentUser?.emailVerified === true;
}

export async function signIn(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email.trim(), password);
  await reloadUser();
}

export async function signUp(email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await sendEmailVerification(cred.user);
}

export async function resendVerificationEmail() {
  const user = auth.currentUser;
  if (!user) throw new Error('No hay sesión activa');
  await sendEmailVerification(user);
}

export async function sendPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email.trim());
}

export function signOutUser() {
  return signOut(auth);
}

export function currentUser() {
  return auth.currentUser;
}
