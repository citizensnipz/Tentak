import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Send, Sparkles, User } from 'lucide-react';
import { routeChatMessage } from '@/utils/chatRouter';

const AVATAR_SIZE = 'h-8 w-8';

export function ChatView() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState(null);
  const [chatContext, setChatContext] = useState({
    today: [],
    backlog: [],
    scheduled: [],
    waiting: [],
    tables: [],
  });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load persisted chat messages on mount (active chatId: default).
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.tentak?.loadChatMessages !== 'function') return;
    window.tentak
      .loadChatMessages('default')
      .then((res) => {
        if (res?.ok && Array.isArray(res.data)) setMessages(res.data);
      })
      .catch(() => {});
  }, []);

  // Tentak logo for assistant messages
  useEffect(() => {
    if (typeof window?.tentak?.getAssetPath !== 'function') return;
    window.tentak.getAssetPath('logo.png').then((res) => {
      if (res?.ok && res.data) setLogoUrl(res.data);
    });
  }, []);

  // User avatar for user messages
  useEffect(() => {
    if (typeof window?.tentak?.profile?.get !== 'function') return;
    window.tentak.profile.get().then((res) => {
      if (!res?.ok || !res.data?.avatar_path) {
        setUserAvatarUrl(null);
        return;
      }
      window.tentak.profile.getAvatarUrl(res.data.avatar_path).then((urlRes) => {
        setUserAvatarUrl(urlRes?.ok && urlRes.data ? urlRes.data : null);
      });
    });
  }, []);

  const persistMessage = useCallback((msg) => {
    if (typeof window.tentak?.appendChatMessage !== 'function') return;
    window.tentak.appendChatMessage('default', {
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      usedLLM: msg.role === 'assistant' ? (msg.usedLLM === true) : false,
    });
  }, []);

  // Fetch context data for chat routing
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.tentak === 'undefined') return;

    const todayStr = new Date().toISOString().slice(0, 10);

    Promise.all([
      window.tentak.query({ type: 'tasksByScheduledDate', params: { date: todayStr } }),
      window.tentak.query({ type: 'tasksBacklog' }),
      window.tentak.query({ type: 'tasksScheduled' }),
      window.tentak.query({ type: 'tasksWaiting' }),
      window.tentak.query({ type: 'allTables' }),
    ])
      .then(([todayRes, backlogRes, scheduledRes, waitingRes, tablesRes]) => {
        setChatContext({
          today: todayRes.ok ? todayRes.data : [],
          backlog: backlogRes.ok ? backlogRes.data : [],
          scheduled: scheduledRes.ok ? scheduledRes.data : [],
          waiting: waitingRes.ok ? waitingRes.data : [],
          tables: tablesRes.ok ? tablesRes.data : [],
        });
      })
      .catch(() => {
        // Silently fail - context will be empty, router will route to agent
      });
  }, []);

  const sendToAgent = useCallback(
    async (content) => {
      setIsSending(true);
      try {
        const baseTimestamp = Date.now();

        // If the agent API is not available, show a graceful message and return.
        if (typeof window === 'undefined' || !window.tentak || typeof window.tentak.agentAsk !== 'function') {
          const msg = {
            id: `agent-${baseTimestamp}-unavailable`,
            role: 'assistant',
            content:
              'Clawdbot is not available in this build. The rest of Tentak continues to work normally.',
            timestamp: baseTimestamp,
            usedLLM: false,
          };
          setMessages((prev) => [...prev, msg]);
          persistMessage(msg);
          return;
        }

        const result = await window.tentak.agentAsk(content);
        if (result.ok && result.reply) {
          const msg = {
            id: `agent-${baseTimestamp}`,
            role: 'assistant',
            content: result.reply,
            timestamp: Date.now(),
            usedLLM: result.usedLLM === true, // Only true if LLM was actually used
          };
          setMessages((prev) => [...prev, msg]);
          persistMessage(msg);
        } else {
          const errorText = result && !result.ok && result.error ? result.error : 'Unknown agent error';
          const msg = {
            id: `agent-${baseTimestamp}-error`,
            role: 'assistant',
            content: `Clawdbot failed to answer: ${errorText}`,
            timestamp: Date.now(),
            usedLLM: false,
          };
          setMessages((prev) => [...prev, msg]);
          persistMessage(msg);
        }
      } catch (err) {
        const msg = {
          id: `agent-error-${Date.now()}`,
          role: 'assistant',
          content: `Clawdbot encountered an unexpected error: ${String(err)}`,
          timestamp: Date.now(),
          usedLLM: false,
        };
        setMessages((prev) => [...prev, msg]);
        persistMessage(msg);
      } finally {
        setIsSending(false);
      }
    },
    [persistMessage],
  );

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) return;

    const userMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    persistMessage(userMessage);
    setInputValue('');
    inputRef.current?.focus();

    // Refresh context to ensure we have latest data before routing
    if (typeof window !== 'undefined' && window.tentak) {
      const todayStr = new Date().toISOString().slice(0, 10);
      try {
        const [todayRes, backlogRes, scheduledRes, waitingRes, tablesRes] = await Promise.all([
          window.tentak.query({ type: 'tasksByScheduledDate', params: { date: todayStr } }),
          window.tentak.query({ type: 'tasksBacklog' }),
          window.tentak.query({ type: 'tasksScheduled' }),
          window.tentak.query({ type: 'tasksWaiting' }),
          window.tentak.query({ type: 'allTables' }),
        ]);
        const freshContext = {
          today: todayRes.ok ? todayRes.data : [],
          backlog: backlogRes.ok ? backlogRes.data : [],
          scheduled: scheduledRes.ok ? scheduledRes.data : [],
          waiting: waitingRes.ok ? waitingRes.data : [],
          tables: tablesRes.ok ? tablesRes.data : [],
        };
        setChatContext(freshContext);

        // CRITICAL: Route message BEFORE any Clawdbot call
        const route = routeChatMessage(trimmed, freshContext);

        if (route.type === 'local') {
          // Fast path: answer locally (no LLM used)
          const localResponse = {
            id: `local-${Date.now()}`,
            role: 'assistant',
            content: route.response,
            timestamp: Date.now(),
            usedLLM: false, // Local responses never use LLM
          };
          setMessages((prev) => [...prev, localResponse]);
          persistMessage(localResponse);
        } else {
          // Slow path: send to agent (may use LLM if API key is configured)
          void sendToAgent(trimmed);
        }
      } catch {
        // If context fetch fails, use existing context and route
        const route = routeChatMessage(trimmed, chatContext);
        if (route.type === 'local') {
          const localResponse = {
            id: `local-${Date.now()}`,
            role: 'assistant',
            content: route.response,
            timestamp: Date.now(),
            usedLLM: false, // Local responses never use LLM
          };
          setMessages((prev) => [...prev, localResponse]);
          persistMessage(localResponse);
        } else {
          void sendToAgent(trimmed);
        }
      }
    } else {
      // Fallback: route with existing context
      const route = routeChatMessage(trimmed, chatContext);
      if (route.type === 'local') {
        const localResponse = {
          id: `local-${Date.now()}`,
          role: 'assistant',
          content: route.response,
          timestamp: Date.now(),
          usedLLM: false, // Local responses never use LLM
        };
        setMessages((prev) => [...prev, localResponse]);
        persistMessage(localResponse);
      } else {
        void sendToAgent(trimmed);
      }
    }
  }, [inputValue, isSending, sendToAgent, chatContext, persistMessage]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No messages yet. Start a conversation...
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const bubble = (
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-4 py-2 text-sm',
                  isUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                <div
                  className={cn(
                    'text-xs mt-1 flex items-center gap-1.5',
                    isUser
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground/70'
                  )}
                >
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {msg.role === 'assistant' && msg.usedLLM === true && (
                    <span
                      className="inline-flex items-center"
                      title="Generated using AI"
                    >
                      <Sparkles className="h-3 w-3 opacity-60" />
                    </span>
                  )}
                </div>
              </div>
            );

            const avatar = (
              <div
                className={cn(
                  'shrink-0 rounded-full overflow-hidden bg-muted flex items-center justify-center',
                  AVATAR_SIZE
                )}
                aria-hidden
              >
                {isUser ? (
                  userAvatarUrl ? (
                    <img
                      src={userAvatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )
                ) : logoUrl ? (
                  <img
                    src={logoUrl}
                    alt=""
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary">T</span>
                  </div>
                )}
              </div>
            );

            return (
              <div
                key={msg.id}
                className={cn(
                  'flex items-end gap-2',
                  isUser ? 'justify-end' : 'justify-start'
                )}
              >
                {isUser ? (
                  <>
                    {bubble}
                    {avatar}
                  </>
                ) : (
                  <>
                    {avatar}
                    {bubble}
                  </>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t border-border p-4 shrink-0">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="resize-none min-h-[44px] max-h-[120px]"
          />
          <Button
            type="button"
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            className="h-[44px] w-[44px] shrink-0"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
