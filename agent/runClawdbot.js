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

function buildSystemPrompt() {
  return [
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
  ].join('\n');
}

/**
 * Run Clawdbot in a strictly read-only fashion.
 *
 * @param {string} userMessage - The user’s message from the Chat view.
 * @param {unknown} context - Plain JSON context built by buildAgentContext.
 * @returns {Promise<string>} - Assistant reply as plain text.
 */
export async function runClawdbot(userMessage, context) {
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

  const systemPrompt = buildSystemPrompt();

  // PLACEHOLDER IMPLEMENTATION (safe default):
  // -----------------------------------------
  // This does NOT call any external LLM yet; it simply echoes back
  // the question and gives a brief summary of the available context.
  //
  // To integrate a real LLM, replace the code below with a call to your
  // provider (OpenAI, Anthropic, etc.), passing systemPrompt,
  // serializedContext, and userMessage as part of the prompt.

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

  return replyLines.join('\n');
}
