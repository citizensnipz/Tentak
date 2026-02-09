import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Send, Sparkles } from 'lucide-react';
import { routeChatMessage } from '@/utils/chatRouter';

export function ChatView() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
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
          setMessages((prev) => [
            ...prev,
            {
              id: `agent-${baseTimestamp}-unavailable`,
              role: 'assistant',
              content:
                'Clawdbot is not available in this build. The rest of Tentak continues to work normally.',
              timestamp: baseTimestamp,
              usedLLM: false,
            },
          ]);
          return;
        }

        const result = await window.tentak.agentAsk(content);
        if (result.ok && result.reply) {
          setMessages((prev) => [
            ...prev,
            {
              id: `agent-${baseTimestamp}`,
              role: 'assistant',
              content: result.reply,
              timestamp: Date.now(),
              usedLLM: result.usedLLM === true, // Only true if LLM was actually used
            },
          ]);
        } else {
          const errorText = result && !result.ok && result.error ? result.error : 'Unknown agent error';
          setMessages((prev) => [
            ...prev,
            {
              id: `agent-${baseTimestamp}-error`,
              role: 'assistant',
              content: `Clawdbot failed to answer: ${errorText}`,
              timestamp: Date.now(),
              usedLLM: false,
            },
          ]);
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `agent-error-${Date.now()}`,
            role: 'assistant',
            content: `Clawdbot encountered an unexpected error: ${String(err)}`,
            timestamp: Date.now(),
            usedLLM: false,
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [],
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
      } else {
        void sendToAgent(trimmed);
      }
    }
  }, [inputValue, isSending, sendToAgent, chatContext]);

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
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-4 py-2 text-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                <div
                  className={cn(
                    'text-xs mt-1 flex items-center gap-1.5',
                    msg.role === 'user'
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
            </div>
          ))
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
