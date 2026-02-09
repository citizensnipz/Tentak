import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DEFAULT_BOARD_BACKGROUND_COLOR } from '@/lib/board-utils';

export function SettingsView({ boardBackgroundColor, onBoardBackgroundColorChange }) {
  const [localColor, setLocalColor] = useState(boardBackgroundColor || DEFAULT_BOARD_BACKGROUND_COLOR);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyMasked, setApiKeyMasked] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    setLocalColor(boardBackgroundColor || DEFAULT_BOARD_BACKGROUND_COLOR);
  }, [boardBackgroundColor]);

  // Load API key status on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.tentak && window.tentak.settings) {
      window.tentak.settings.getOpenAIApiKey()
        .then((response) => {
          if (response.ok) {
            setHasApiKey(response.data.hasKey);
            setApiKeyMasked(response.data.key || '');
          }
        })
        .catch(() => {
          // Silently fail if settings API is not available
        });
    }
  }, []);

  function handleColorChange(e) {
    const value = e.target.value;
    setLocalColor(value);
    if (onBoardBackgroundColorChange) {
      onBoardBackgroundColorChange(value);
    }
  }

  function handleApiKeyChange(e) {
    setApiKey(e.target.value);
    setSaveStatus('');
  }

  async function handleSaveApiKey() {
    if (typeof window === 'undefined' || !window.tentak || !window.tentak.settings) {
      setSaveStatus('Settings API not available');
      return;
    }

    setIsLoading(true);
    setSaveStatus('');

    try {
      const response = await window.tentak.settings.setOpenAIApiKey(apiKey);
      if (response.ok) {
        setSaveStatus('API key saved successfully');
        setApiKey('');
        // Refresh the masked key display
        const keyResponse = await window.tentak.settings.getOpenAIApiKey();
        if (keyResponse.ok) {
          setHasApiKey(keyResponse.data.hasKey);
          setApiKeyMasked(keyResponse.data.key || '');
        }
        // Clear status after 3 seconds
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setSaveStatus(`Error: ${response.error || 'Failed to save API key'}`);
      }
    } catch (err) {
      setSaveStatus(`Error: ${String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleClearApiKey() {
    if (typeof window === 'undefined' || !window.tentak || !window.tentak.settings) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await window.tentak.settings.setOpenAIApiKey('');
      if (response.ok) {
        setHasApiKey(false);
        setApiKeyMasked('');
        setApiKey('');
        setSaveStatus('API key cleared');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    } catch (err) {
      setSaveStatus(`Error: ${String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 p-4 space-y-6 overflow-y-auto">
      <div>
        <h2 className="text-lg font-semibold mb-1">Appearance</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Customize how your board looks.
        </p>
        <div className="flex items-center gap-4">
          <Label htmlFor="board-bg-color" className="text-sm font-medium">
            Board background color
          </Label>
          <input
            id="board-bg-color"
            type="color"
            value={localColor}
            onChange={handleColorChange}
            className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0"
          />
          <span className="text-xs font-mono text-muted-foreground">
            {localColor}
          </span>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-1">Clawdbot</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Configure OpenAI API key for Clawdbot. The key is stored securely and never exposed to the renderer process.
        </p>
        <div className="space-y-3">
          {hasApiKey && (
            <div className="space-y-2">
              <Label htmlFor="api-key-masked" className="text-sm font-medium">
                Current API key
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="api-key-masked"
                  type="text"
                  value={apiKeyMasked}
                  disabled
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearApiKey}
                  disabled={isLoading}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="api-key" className="text-sm font-medium">
              {hasApiKey ? 'Update API key' : 'OpenAI API key'}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder="sk-..."
                className="font-mono"
                disabled={isLoading}
              />
              <Button
                type="button"
                onClick={handleSaveApiKey}
                disabled={isLoading || !apiKey.trim()}
                size="sm"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
            </div>
            {saveStatus && (
              <p className={`text-xs ${saveStatus.includes('Error') ? 'text-destructive' : 'text-muted-foreground'}`}>
                {saveStatus}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
