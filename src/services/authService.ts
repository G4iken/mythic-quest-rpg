import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User
} from 'firebase/auth';
import { firebaseAuth } from './firebase';
import type { AppUser } from '../types';

function toAppUser(user: User): AppUser {
  return { uid: user.uid, email: user.email, isGuest: false };
}

export function listenForAuth(callback: (user: AppUser | null) => void) {
  if (!firebaseAuth) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(firebaseAuth, user => callback(user ? toAppUser(user) : null));
}

export async function registerWithEmail(email: string, password: string): Promise<AppUser> {
  if (!firebaseAuth) throw new Error('Firebase is not configured. Add .env.local first or use Guest Mode.');
  const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  return toAppUser(credential.user);
}

export async function loginWithEmail(email: string, password: string): Promise<AppUser> {
  if (!firebaseAuth) throw new Error('Firebase is not configured. Add .env.local first or use Guest Mode.');
  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  return toAppUser(credential.user);
}

export async function logoutFromFirebase() {
  if (firebaseAuth) await signOut(firebaseAuth);
}

export function createGuestUser(): AppUser {
  return { uid: 'guest', email: null, isGuest: true };
}
