import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User as UserIcon } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { cn } from '@/lib/utils';

function PasswordField({ id, label, value, onChange }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Input
        id={id}
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function AuthOverlay() {
  const { isAuthenticated, setCurrentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [avatars, setAvatars] = useState({});
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [password, setPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
  const [signupAvatarPath, setSignupAvatarPath] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    if (typeof window === 'undefined' || !window.tentak?.auth?.listUsers) return;
    try {
      const res = await window.tentak.auth.listUsers();
      if (res?.ok && Array.isArray(res.data)) {
        setUsers(res.data);
        if (res.data.length === 0) {
          setMode('signup');
        } else {
          setMode('login');
        }

        const avatarEntries = {};
        await Promise.all(
          res.data.map(async (u) => {
            if (u.avatar_path && window.tentak?.profile?.getAvatarUrl) {
              try {
                const urlRes = await window.tentak.profile.getAvatarUrl(u.avatar_path);
                if (urlRes?.ok && urlRes.data) {
                  avatarEntries[u.id] = urlRes.data;
                }
              } catch {
                // ignore avatar errors
              }
            }
          })
        );
        setAvatars(avatarEntries);
      }
    } catch {
      // ignore load errors; overlay will still show signup if no users
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      void loadUsers();
    }
  }, [isAuthenticated, loadUsers]);

  if (isAuthenticated) return null;

  const handleLogin = async () => {
    if (!selectedUserId) {
      setError('Select a user');
      return;
    }
    if (!password) {
      setError('Enter your password');
      return;
    }
    if (!window.tentak?.auth?.login) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await window.tentak.auth.login({ userId: selectedUserId, password });
      if (res?.ok && res.data) {
        setCurrentUser(res.data);
        setPassword('');
      } else {
        setError(res?.error || 'Login failed');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignupAvatar = async () => {
    if (!window.tentak?.profile?.chooseAvatar) return;
    try {
      const res = await window.tentak.profile.chooseAvatar();
      if (res?.ok && res.data) {
        setSignupAvatarPath(res.data);
      }
    } catch {
      // ignore
    }
  };

  const handleSignup = async () => {
    if (!window.tentak?.auth?.signup) return;
    if (!signupUsername.trim()) {
      setError('Username is required');
      return;
    }
    if (!signupPassword || signupPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (signupPassword !== signupPasswordConfirm) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await window.tentak.auth.signup({
        username: signupUsername.trim(),
        email: signupEmail.trim() || null,
        password: signupPassword,
        avatar_path: signupAvatarPath || null,
      });
      if (res?.ok && res.data) {
        setCurrentUser(res.data);
        setSignupPassword('');
        setSignupPasswordConfirm('');
      } else {
        setError(res?.error || 'Failed to create account');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-background shadow-lg border border-border p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">
            {mode === 'login' ? 'Welcome to Tentak' : 'Create a Tentak account'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {mode === 'login'
              ? 'Select a profile and enter your password to continue.'
              : 'Create a local-only account. No cloud, no OAuth.'}
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {mode === 'login' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Choose a profile</Label>
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No profiles yet. Create a new account.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {users.map((u) => {
                    const isSelected = selectedUserId === u.id;
                    const avatarUrl = avatars[u.id];
                    return (
                      <button
                        key={u.id}
                        type="button"
                        className={cn(
                          'flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition',
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-background hover:bg-muted'
                        )}
                        onClick={() => {
                          setSelectedUserId(u.id);
                          setError('');
                        }}
                      >
                        <span className="inline-flex items-center justify-center rounded-full bg-muted overflow-hidden h-7 w-7">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </span>
                        <span>{u.username}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <PasswordField
              id="auth-login-password"
              label="Password"
              value={password}
              onChange={setPassword}
            />
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setMode('signup');
                  setError('');
                }}
              >
                Create new account
              </Button>
              <Button
                type="button"
                onClick={handleLogin}
                disabled={submitting || !selectedUserId || !password}
              >
                {submitting ? 'Logging in...' : 'Login'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="auth-signup-username" className="text-sm font-medium">
                Username
              </Label>
              <Input
                id="auth-signup-username"
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-signup-email" className="text-sm font-medium">
                Email (optional)
              </Label>
              <Input
                id="auth-signup-email"
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
              />
            </div>
            <PasswordField
              id="auth-signup-password"
              label="Password"
              value={signupPassword}
              onChange={setSignupPassword}
            />
            <PasswordField
              id="auth-signup-password-confirm"
              label="Confirm password"
              value={signupPasswordConfirm}
              onChange={setSignupPasswordConfirm}
            />
            <div className="space-y-2">
              <Label className="text-sm font-medium">Avatar (optional)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSignupAvatar}
                >
                  Choose image
                </Button>
                {signupAvatarPath && (
                  <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {signupAvatarPath}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
              >
                Back to login
              </Button>
              <Button
                type="button"
                onClick={handleSignup}
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create account'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

