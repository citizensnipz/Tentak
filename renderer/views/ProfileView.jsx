import React, { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, Upload, HardDrive } from 'lucide-react';

function formatLastBackup(lastBackupAt) {
  if (!lastBackupAt) return 'Never';
  const then = new Date(lastBackupAt);
  const now = new Date();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  return then.toISOString().slice(0, 16).replace('T', ' ');
}

export function ProfileView() {
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatarPath, setAvatarPath] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupRunning, setBackupRunning] = useState(false);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    if (typeof window?.tentak?.profile?.get !== 'function') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await window.tentak.profile.get();
      if (res?.ok && res.data) {
        const p = res.data;
        setProfile(p);
        setUsername(p.username ?? '');
        setEmail(p.email ?? '');
        setAvatarPath(p.avatar_path ?? null);
        if (p.avatar_path) {
          const urlRes = await window.tentak.profile.getAvatarUrl(p.avatar_path);
          setAvatarPreviewUrl(urlRes?.ok ? urlRes.data : null);
        } else {
          setAvatarPreviewUrl(null);
        }
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSaveProfile = useCallback(async () => {
    if (typeof window?.tentak?.profile?.update !== 'function') return;
    setSaving(true);
    setError(null);
    try {
      const res = await window.tentak.profile.update({ username: username.trim(), email: email.trim() || null });
      if (res?.ok && res.data) {
        setProfile(res.data);
      } else {
        setError(res?.error || 'Failed to save');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }, [username, email]);

  const handleChooseAvatar = useCallback(async () => {
    if (typeof window?.tentak?.profile?.chooseAvatar !== 'function') return;
    const res = await window.tentak.profile.chooseAvatar();
    if (!res?.ok) return;
    const path = res.data;
    if (!path) return;
    setAvatarPath(path);
    const urlRes = await window.tentak.profile.getAvatarUrl(path);
    setAvatarPreviewUrl(urlRes?.ok ? urlRes.data : null);
    const updateRes = await window.tentak.profile.update({ avatar_path: path });
    if (updateRes?.ok && updateRes.data) setProfile(updateRes.data);
  }, []);

  const handleBackupNow = useCallback(async () => {
    if (typeof window?.tentak?.backupNow !== 'function') return;
    setBackupRunning(true);
    setError(null);
    try {
      const res = await window.tentak.backupNow();
      if (res?.ok && res.data) {
        setProfile(res.data);
      } else {
        setError(res?.error || 'Backup failed');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBackupRunning(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 p-4 space-y-6 overflow-y-auto">
      <div>
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Your identity and backup status.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-4 mt-2">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
              {avatarPreviewUrl ? (
                <img src={avatarPreviewUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleChooseAvatar}>
              <Upload className="h-4 w-4 mr-2" />
              Choose image
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-username" className="text-sm font-medium">Username</Label>
          <Input
            id="profile-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={handleSaveProfile}
            placeholder="Default"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-email" className="text-sm font-medium">Email</Label>
          <Input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleSaveProfile}
            placeholder="optional@example.com"
          />
        </div>
        {saving && <p className="text-xs text-muted-foreground">Saving...</p>}
      </div>

      <div className="border-t border-border pt-4 space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <HardDrive className="h-4 w-4" />
          Backups
        </h3>
        <p className="text-sm text-muted-foreground">
          Last backup: {formatLastBackup(profile?.last_backup_at)}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={handleBackupNow}
          disabled={backupRunning}
        >
          {backupRunning ? 'Backing up...' : 'Backup Now'}
        </Button>
      </div>
    </div>
  );
}
