import { useState } from 'react';
import type { AppUser } from '../types';

interface AuthScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, playerName: string) => Promise<void>;
  onGuest: (playerName: string) => void;
  error?: string;
  loading: boolean;
  user: AppUser | null;
  continueToSaves: () => void;
}

export function AuthScreen({ onLogin, onRegister, onGuest, error, loading, user, continueToSaves }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [playerName, setPlayerName] = useState('Adventurer');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  if (user && !user.isGuest) {
    return (
      <section className="auth-screen safe-top safe-bottom">
        <div className="panel centered">
          <h1>Welcome back</h1>
          <p className="muted">Signed in as {user.email}. Your cloud slots are ready.</p>
          <button className="primary" onClick={continueToSaves}>Open Save Slots</button>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-screen safe-top safe-bottom">
      <div className="panel auth-card">
        <p className="eyebrow">Account Save</p>
        <h1>{mode === 'login' ? 'Login' : 'Register'} Adventurer</h1>
        <label>Player Name
          <input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Adventurer" />
        </label>
        <label>Email
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
        </label>
        <label>Password
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="At least 6 characters" />
        </label>
        {error && <div className="notice danger">{error}</div>}
        <div className="stacked-actions">
          {mode === 'login' ? (
            <button className="primary" disabled={loading} onClick={() => onLogin(email, password)}>{loading ? 'Loading...' : 'Login'}</button>
          ) : (
            <button className="primary" disabled={loading} onClick={() => onRegister(email, password, playerName)}>{loading ? 'Creating...' : 'Register'}</button>
          )}
          <button className="ghost" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
          </button>
          <button className="secondary" onClick={() => onGuest(playerName)}>Play Guest / Offline</button>
        </div>
      </div>
    </section>
  );
}
