import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User as UserIcon, X } from 'lucide-react';
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
  const { isAuthenticated, setCurrentUser, sessionChecked } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [avatars, setAvatars] = useState({});
  const [mode, setMode] = useState('login');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [password, setPassword] = useState('');
  const [showOtherAccount, setShowOtherAccount] = useState(false);
  const [otherUsername, setOtherUsername] = useState('');
  const [otherPassword, setOtherPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
  const [signupAvatarPath, setSignupAvatarPath] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRememberedProfiles = useCallback(async () => {
    if (typeof window === 'undefined' || !window.tentak?.auth?.getRememberedProfiles) return;
    try {
      const res = await window.tentak.auth.getRememberedProfiles();
      if (res?.ok && Array.isArray(res.data)) {
        setProfiles(res.data);
        if (res.data.length === 0) setMode('signup');

        const avatarEntries = {};
        await Promise.all(
          res.data.map(async (p) => {
            if (p.avatarPath && window.tentak?.profile?.getAvatarUrl) {
              try {
                const urlRes = await window.tentak.profile.getAvatarUrl(p.avatarPath);
                if (urlRes?.ok && urlRes.data) avatarEntries[p.userId] = urlRes.data;
              } catch {
                // ignore
              }
            }
          })
        );
        setAvatars(avatarEntries);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) void loadRememberedProfiles();
  }, [isAuthenticated, loadRememberedProfiles]);

  if (!sessionChecked || isAuthenticated) return null;

  const handleLogin = async () => {
    if (!selectedUserId) {
      setError('Select a profile');
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

  const handleLoginByUsername = async () => {
    if (!otherUsername.trim() || !otherPassword) {
      setError('Enter username and password');
      return;
    }
    if (!window.tentak?.auth?.loginByUsername) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await window.tentak.auth.loginByUsername({
        username: otherUsername.trim(),
        password: otherPassword,
      });
      if (res?.ok && res.data) {
        setCurrentUser(res.data);
        setOtherUsername('');
        setOtherPassword('');
        setShowOtherAccount(false);
      } else {
        setError(res?.error || 'Login failed');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveProfile = async (userId, e) => {
    e.stopPropagation();
    if (!window.confirm('Remove this profile from the login screen? You can log in again with username and password.')) return;
    if (!window.tentak?.auth?.removeRememberedProfile) return;
    try {
      const res = await window.tentak.auth.removeRememberedProfile({ userId });
      if (res?.ok && res.data?.wasCurrentUser) setCurrentUser(null);
      await loadRememberedProfiles();
      if (selectedUserId === userId) {
        setSelectedUserId(null);
        setPassword('');
      }
    } catch {
      // ignore
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
              {profiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No profiles yet. Create a new account or log in with username below.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profiles.map((p) => {
                    const isSelected = selectedUserId === p.userId;
                    const avatarUrl = avatars[p.userId];
                    return (
                      <div
                        key={p.userId}
                        role="group"
                        className={cn(
                          'relative flex items-center gap-2 rounded-full border px-3 py-1.5 pr-1 text-sm transition',
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-background hover:bg-muted'
                        )}
                      >
                        <button
                          type="button"
                          className="flex items-center gap-2 flex-1 min-w-0 text-left"
                          onClick={() => {
                            setSelectedUserId(p.userId);
                            setError('');
                          }}
                        >
                          <span className="relative inline-flex items-center justify-center rounded-full bg-muted overflow-hidden h-8 w-8 shrink-0">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <UserIcon className="h-4 w-4 text-muted-foreground" />
                            )}
                          </span>
                          <span className="flex flex-col min-w-0">
                            <span className="font-medium truncate">{p.username}</span>
                            {p.email ? (
                              <span className="text-xs text-muted-foreground truncate">{p.email}</span>
                            ) : null}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="h-6 w-6 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center hover:bg-destructive shrink-0"
                          aria-label="Remove profile from list"
                          onClick={(e) => handleRemoveProfile(p.userId, e)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {!showOtherAccount ? (
              <>
                <PasswordField
                  id="auth-login-password"
                  label="Password"
                  value={password}
                  onChange={setPassword}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-2">
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
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowOtherAccount(true);
                        setError('');
                      }}
                    >
                      Use different account
                    </Button>
                  </div>
                  <Button
                    type="button"
                    onClick={handleLogin}
                    disabled={submitting || !selectedUserId || !password}
                  >
                    {submitting ? 'Logging in...' : 'Login'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-3 border-t border-border pt-3">
                <p className="text-sm text-muted-foreground">Log in with username and password</p>
                <div className="space-y-2">
                  <Label htmlFor="auth-other-username" className="text-sm font-medium">Username</Label>
                  <Input
                    id="auth-other-username"
                    value={otherUsername}
                    onChange={(e) => setOtherUsername(e.target.value)}
                  />
                </div>
                <PasswordField
                  id="auth-other-password"
                  label="Password"
                  value={otherPassword}
                  onChange={setOtherPassword}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowOtherAccount(false);
                      setOtherUsername('');
                      setOtherPassword('');
                      setError('');
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleLoginByUsername}
                    disabled={submitting || !otherUsername.trim() || !otherPassword}
                  >
                    {submitting ? 'Logging in...' : 'Log in'}
                  </Button>
                </div>
              </div>
            )}
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

