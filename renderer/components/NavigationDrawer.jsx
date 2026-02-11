import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Calendar, LayoutDashboard, MessageCircle, Settings as SettingsIcon, Menu, User } from 'lucide-react';

export function NavigationDrawer({ isOpen, onToggle, currentView, onViewChange }) {
  const [logoUrl, setLogoUrl] = useState(null);
  const [iconUrl, setIconUrl] = useState(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(null);

  useEffect(() => {
    if (typeof window.tentak?.getAssetPath !== 'function') return;
    window.tentak.getAssetPath('logo.png').then((res) => {
      if (res?.ok && res.data) setLogoUrl(res.data);
    });
    window.tentak.getAssetPath('icon.png').then((res) => {
      if (res?.ok && res.data) setIconUrl(res.data);
    });
  }, []);

  useEffect(() => {
    if (!isOpen || typeof window.tentak?.profile?.get !== 'function') return;
    window.tentak.profile.get().then((res) => {
      if (!res?.ok || !res.data?.avatar_path) {
        setProfileAvatarUrl(null);
        return;
      }
      window.tentak.profile.getAvatarUrl(res.data.avatar_path).then((urlRes) => {
        setProfileAvatarUrl(urlRes?.ok && urlRes.data ? urlRes.data : null);
      });
    });
  }, [isOpen]);

  const navItems = [
    { id: 'board', label: 'Board', icon: LayoutDashboard },
    { id: 'day', label: 'Day', icon: Calendar },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Drawer - always visible closed state, overlays when open */}
      <div
        className={cn(
          'fixed left-0 top-0 h-full bg-background border-r border-border z-50 transition-all duration-300 ease-in-out overflow-hidden',
          isOpen ? 'w-64' : 'w-16'
        )}
      >
        {/* Logo / app icon */}
        <div className="h-16 flex items-center justify-center border-b border-border shrink-0">
          {isOpen ? (
            logoUrl ? (
              <img src={logoUrl} alt="Tentak" className="h-10 w-auto max-w-[180px] object-contain object-center" />
            ) : (
              <div className="text-lg font-semibold">Tentak</div>
            )
          ) : (
            iconUrl ? (
              <img src={iconUrl} alt="" className="w-8 h-8 object-contain" aria-hidden />
            ) : (
              <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold">T</span>
              </div>
            )
          )}
        </div>

        {/* Hamburger button */}
        <div className="p-2 border-b border-border">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="w-full"
            aria-label={isOpen ? 'Close drawer' : 'Open drawer'}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation items */}
        {isOpen && (
          <nav className="flex flex-col p-2 gap-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              const isProfile = item.id === 'profile';
              const showAvatar = isProfile && profileAvatarUrl;
              return (
                <Button
                  key={item.id}
                  type="button"
                  variant={isActive ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => {
                    onViewChange(item.id);
                    onToggle(); // Close drawer after selection
                  }}
                >
                  {showAvatar ? (
                    <img
                      src={profileAvatarUrl}
                      alt=""
                      className="h-4 w-4 rounded-full object-cover mr-2 shrink-0"
                      aria-hidden
                    />
                  ) : (
                    <Icon className="h-4 w-4 mr-2 shrink-0" />
                  )}
                  {item.label}
                </Button>
              );
            })}
          </nav>
        )}
      </div>
    </>
  );
}
