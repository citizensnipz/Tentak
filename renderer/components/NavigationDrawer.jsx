import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Calendar, LayoutDashboard, MessageCircle, Settings as SettingsIcon, Menu } from 'lucide-react';

export function NavigationDrawer({ isOpen, onToggle, currentView, onViewChange }) {
  const navItems = [
    { id: 'board', label: 'Board', icon: LayoutDashboard },
    { id: 'day', label: 'Day', icon: Calendar },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
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
        {/* Logo placeholder */}
        <div className="h-16 flex items-center justify-center border-b border-border shrink-0">
          {isOpen ? (
            <div className="text-lg font-semibold">Tentak</div>
          ) : (
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold">T</span>
            </div>
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
                  <Icon className="h-4 w-4 mr-2" />
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
