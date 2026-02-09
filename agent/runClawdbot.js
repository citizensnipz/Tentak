/**
 * Clawdbot agent runner.
 *
 * SECURITY:
 * - Accepts ONLY a user message string and a plain JSON context object.
 * - No direct DB access, no filesystem access, no Electron IPC, no window/global sharing.
 * - Does NOT call tentak:mutate or any write APIs.
 *
 * NOTE:
 * - This default implementation is intentionally conservative: it does NOT
 *   call a real LLM service until configured.
 * - To hook up a real LLM, replace the placeholder implementation in
 *   `runClawdbot` with a call to your provider of choice, using the
 *   `systemPrompt`, `userMessage`, and `serializedContext` variables.
 */

function buildSystemPrompt(useLLM = false) {
  const basePrompt = [
    'You are Clawdbot, a read-only assistant integrated into the Tentak app.',
    'You can only answer questions based on the JSON context you are given.',
    'HARD SECURITY RULES:',
    '- You cannot create, update, or delete any data.',
    '- You cannot issue commands, run code, or call APIs.',
    '- You must NOT instruct the user to click buttons that would mutate data.',
    '- You must NOT pretend to have changed anything in the user\'s system.',
    '',
    'BEHAVIOR RULES:',
    '- Answer concisely and clearly in plain text.',
    '- If the context does not contain enough information, say so explicitly.',
    '- If the user asks you to perform an action, explain that you are read-only.',
    '',
    'You will receive a JSON blob called "context" and a user message.',
    'Use ONLY that information to answer.',
  ];

  if (useLLM) {
    // Add strict constraints for LLM responses
    basePrompt.push(
      '',
      'CRITICAL: Answer concisely. Prefer 1–3 sentences. Do not explain reasoning unless explicitly asked. Avoid personality, tone, or stylistic flourishes.'
    );
  }

  return basePrompt.join('\n');
}

/**
 * Run Clawdbot in a strictly read-only fashion.
 *
 * @param {string} userMessage - The user's message from the Chat view.
 * @param {unknown} context - Plain JSON context built by buildAgentContext.
 * @param {string|null} openaiApiKey - Optional OpenAI API key. If provided, uses OpenAI LLM.
 * @returns {Promise<{reply: string, usedLLM: boolean}>} - Assistant reply and LLM usage flag.
 */
export async function runClawdbot(userMessage, context, openaiApiKey = null) {
  if (typeof userMessage !== 'string') {
    throw new Error('userMessage must be a string');
  }

  // Defensive copy + serialization to ensure context is JSON-only.
  let serializedContext = '{}';
  try {
    serializedContext = JSON.stringify(context ?? {}, null, 2);
  } catch {
    // If context is not serializable for some reason, fall back to empty.
    serializedContext = '{}';
  }

  // If API key is provided, use OpenAI LLM
  if (openaiApiKey && typeof openaiApiKey === 'string' && openaiApiKey.trim()) {
    try {
      const systemPrompt = buildSystemPrompt(true);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: systemPrompt + '\n\nContext data:\n' + serializedContext,
            },
            {
              role: 'user',
              content: userMessage,
            },
          ],
          max_tokens: 150, // Strict limit for short responses
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content?.trim() || 'No response from OpenAI.';
      
      return { reply, usedLLM: true };
    } catch (err) {
      // If LLM call fails, fall back to demo mode
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        reply: `Failed to call OpenAI: ${errorMsg}. Falling back to demo mode.`,
        usedLLM: false,
      };
    }
  }

  // Demo mode (no LLM)
  const systemPrompt = buildSystemPrompt(false);
  const contextKeys = (() => {
    if (context && typeof context === 'object') {
      return Object.keys(context).join(', ') || '(no top-level keys)';
    }
    return '(no context)';
  })();

  const replyLines = [
    'Clawdbot is currently running in local read-only demo mode (no external LLM configured).',
    '',
    'I received your question:',
    userMessage,
    '',
    'I also received a JSON context snapshot with the following top-level keys:',
    contextKeys,
    '',
    'In a full LLM-backed setup, I would use this context to answer your question.',
    'Right now, please treat this response as a confirmation that the secure agent',
    'pipeline is wired correctly, without any data mutations or external calls.',
  ];

  return { reply: replyLines.join('\n'), usedLLM: false };
}
