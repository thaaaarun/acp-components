import { createStore } from 'zustand/vanilla';
import type { AgentTerminalState, Message, ToolCallState, PermissionRequest, QueuedMessage } from '../types';
import type { SessionId, ContentBlock, StopReason, PlanEntry, UsageUpdate, SessionConfigOption, AvailableCommand, ToolCallContent } from '@agentclientprotocol/sdk';
import { generateId } from '../utils/id';

export interface SessionData {
  messages: Message[];
  isStreaming: boolean;
  pendingToolCalls: Map<string, ToolCallState>;
  pendingPermissions: PermissionRequest[];
  plan: PlanEntry[];
  usage: UsageUpdate | null;
  configOptions: SessionConfigOption[];
  availableCommands: AvailableCommand[];
  queuedMessages: QueuedMessage[];
  terminals: Map<string, AgentTerminalState>;
}

export interface SessionStoreState {
  sessions: Map<SessionId, SessionData>;

  ensureSession: (id: SessionId) => void;
  removeSession: (id: SessionId) => void;
  resetSession: (id: SessionId) => void;

  addMessage: (sessionId: SessionId, msg: Message) => void;
  updateMessage: (sessionId: SessionId, id: string, update: Partial<Message>) => void;
  appendContent: (sessionId: SessionId, messageId: string, role: Message['role'], block: ContentBlock) => void;
  appendThought: (sessionId: SessionId, messageId: string, role: Message['role'], block: ContentBlock) => void;
  replaceContent: (sessionId: SessionId, messageId: string, role: Message['role'], content: ContentBlock[] | null | undefined) => void;
  replaceThought: (sessionId: SessionId, messageId: string, content: ContentBlock[] | null | undefined) => void;
  setIsStreaming: (sessionId: SessionId, v: boolean) => void;
  setStopReason: (sessionId: SessionId, r: StopReason, messageId?: string) => void;
  upsertToolCall: (sessionId: SessionId, tc: ToolCallState) => void;
  updateToolCall: (sessionId: SessionId, id: string, update: Partial<ToolCallState>) => void;
  appendToolCallContent: (sessionId: SessionId, id: string, block: ToolCallContent) => void;
  addPermissionRequest: (sessionId: SessionId, req: PermissionRequest) => void;
  removePermissionRequest: (sessionId: SessionId, requestId?: string) => void;
  /**
   * Reject every still-pending permission Promise for a session and clear the
   * queue. Used on session removal/reset and on agent disconnect so the agent's
   * `session/request_permission` RPC never hangs waiting for a response that
   * will never arrive — the unresolved Promise would otherwise leak forever
   * (it pins the SDK `RequestResponder` and leaves a stale dialog in the UI).
   */
  rejectAllPermissions: (sessionId: SessionId) => void;
  setPlan: (sessionId: SessionId, entries: PlanEntry[]) => void;
  upsertPlan: (sessionId: SessionId, planId: string, entries: PlanEntry[]) => void;
  removePlan: (sessionId: SessionId, planId: string) => void;
  setUsage: (sessionId: SessionId, usage: UsageUpdate) => void;
  setConfigOptions: (sessionId: SessionId, configOptions: SessionConfigOption[]) => void;
  setAvailableCommands: (sessionId: SessionId, commands: AvailableCommand[]) => void;
  setPartExpanded: (sessionId: SessionId, messageId: string, partIndex: number, expanded: boolean) => void;
  setToolCallExpanded: (sessionId: SessionId, toolCallId: string, expanded: boolean) => void;
  enqueueMessage: (sessionId: SessionId, msg: QueuedMessage) => void;
  dequeueMessage: (sessionId: SessionId, queuedId: string) => void;
  /** Remove and return the head of the queue (FIFO). Returns undefined when empty. */
  shiftQueuedMessage: (sessionId: SessionId) => QueuedMessage | undefined;
  updateTerminal: (sessionId: SessionId, update: AgentTerminalState) => void;
  appendTerminalOutput: (sessionId: SessionId, terminalId: string, data: string) => void;
}

function createSessionData(): SessionData {
  return {
    messages: [],
    isStreaming: false,
    pendingToolCalls: new Map(),
    pendingPermissions: [],
    plan: [],
    usage: null,
    configOptions: [],
    availableCommands: [],
    queuedMessages: [],
    terminals: new Map(),
  };
}

/**
 * Settle every pending permission Promise for a session (reject → `cancelled`),
 * then return the emptied queue so the caller can store it. A bare
 * `pendingPermissions` reference is read directly off `SessionData` and may be
 * `undefined` when the session was never ensured — the guard makes this safe.
 * Side-effect-only (Promise rejection); must run OUTSIDE a Zustand `set`
 * reducer to keep the reducer referentially clean.
 */
function rejectPendingPermissions(reqs: PermissionRequest[] | undefined): PermissionRequest[] {
  if (!reqs || reqs.length === 0) return [];
  for (const req of reqs) {
    try {
      req.reject();
    } catch {
      // A misbehaving reject callback must not block cleanup of the rest.
    }
  }
  return [];
}

function decodeBase64(value: string | null | undefined): Uint8Array {
  if (!value) return new Uint8Array();
  try {
    if (typeof globalThis.atob === 'function') {
      const decoded = globalThis.atob(value);
      return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
    }
    const nodeBuffer = (globalThis as typeof globalThis & {
      Buffer?: { from(value: string, encoding: string): Uint8Array };
    }).Buffer;
    return nodeBuffer ? new Uint8Array(nodeBuffer.from(value, 'base64')) : new Uint8Array();
  } catch {
    // Invalid agent output must not break processing of later session updates.
    return new Uint8Array();
  }
}

function concatBytes(previous: Uint8Array | undefined, next: Uint8Array): Uint8Array {
  if (!previous?.length) return next;
  const result = new Uint8Array(previous.length + next.length);
  result.set(previous);
  result.set(next, previous.length);
  return result;
}

// --- Message update helpers (avoid O(n) message scans during streaming) ---

function appendContentBlockToMessage(m: Message, block: ContentBlock): Message {
  const parts = m.parts;
  const last = parts[parts.length - 1];
  if (last?.type === 'content') {
    const blocks = last.content;
    if (blocks.length > 0) {
      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock.type === 'text' && block.type === 'text') {
        const hasAnnotations = 'annotations' in block && block.annotations != null;
        if (!hasAnnotations) {
          return {
            ...m,
            parts: [
              ...parts.slice(0, -1),
              { ...last, content: [...blocks.slice(0, -1), { ...lastBlock, text: lastBlock.text + block.text }] },
            ],
          };
        }
      }
    }
    return {
      ...m,
      parts: [...parts.slice(0, -1), { ...last, content: [...blocks, block] }],
    };
  }
  return { ...m, parts: [...parts, { type: 'content', content: [block] }] };
}

function appendThoughtBlockToMessage(m: Message, block: ContentBlock): Message {
  const parts = m.parts;
  const last = parts[parts.length - 1];
  if (last?.type === 'thought') {
    const blocks = last.thought;
    if (blocks.length > 0) {
      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock.type === 'text' && block.type === 'text') {
        const hasAnnotations = 'annotations' in block && block.annotations != null;
        if (!hasAnnotations) {
          return {
            ...m,
            parts: [
              ...parts.slice(0, -1),
              { ...last, thought: [...blocks.slice(0, -1), { ...lastBlock, text: lastBlock.text + block.text }] },
            ],
          };
        }
      }
    }
    return {
      ...m,
      parts: [...parts.slice(0, -1), { ...last, thought: [...blocks, block] }],
    };
  }
  return { ...m, parts: [...parts, { type: 'thought', thought: [block] }] };
}

export const sessionStore = createStore<SessionStoreState>((set) => ({
  sessions: new Map(),

  ensureSession: (id) =>
    set((s) => {
      if (s.sessions.has(id)) return s;
      const next = new Map(s.sessions);
      next.set(id, createSessionData());
      return { sessions: next };
    }),

  removeSession: (id) => {
    // Reject any still-pending permission Promises BEFORE dropping the entry —
    // otherwise the agent's `session/request_permission` RPC hangs forever
    // (the Promise was created in `setupPermissionHandler` and only settles on
    // user Allow/Deny; a removal would orphan it). Pure side-effect, done
    // outside the reducer to keep `set` referentially clean.
    rejectPendingPermissions(sessionStore.getState().sessions.get(id)?.pendingPermissions);
    set((s) => {
      const next = new Map(s.sessions);
      next.delete(id);
      return { sessions: next };
    });
  },

  resetSession: (id) => {
    // Same rationale as `removeSession`: reset drops the pending queue, so
    // reject first to unblock any in-flight `request_permission` call.
    rejectPendingPermissions(sessionStore.getState().sessions.get(id)?.pendingPermissions);
    set((s) => {
      const next = new Map(s.sessions);
      next.set(id, createSessionData());
      return { sessions: next };
    });
  },

  addMessage: (sessionId, msg) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const next = new Map(s.sessions);
      next.set(sessionId, { ...data, messages: [...data.messages, msg] });
      return { sessions: next };
    }),

  updateMessage: (sessionId, id, update) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const next = new Map(s.sessions);
      next.set(sessionId, {
        ...data,
        messages: data.messages.map((m) => (m.id === id ? { ...m, ...update } : m)),
      });
      return { sessions: next };
    }),

  appendContent: (sessionId, messageId, role, block) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const msgs = data.messages;
      const lastIdx = msgs.length - 1;

      let messages: Message[];

      // Fast path: last message matches (common streaming case, O(1))
      if (lastIdx >= 0 && msgs[lastIdx].id === messageId) {
        const updated = appendContentBlockToMessage(msgs[lastIdx], block);
        messages = [...msgs.slice(0, lastIdx), updated];
      } else {
        // Slow path: find the target message (for edge cases, O(n) but rare)
        const idx = msgs.findIndex((m) => m.id === messageId);
        if (idx >= 0) {
          const updated = appendContentBlockToMessage(msgs[idx], block);
          messages = [...msgs.slice(0, idx), updated, ...msgs.slice(idx + 1)];
        } else {
          const newMsg: Message = {
            id: messageId,
            role,
            parts: [{ type: 'content', content: [block] }],
            timestamp: Date.now(),
          };
          messages = [...msgs, newMsg];
        }
      }

      const next = new Map(s.sessions);
      next.set(sessionId, { ...data, messages });
      return { sessions: next };
    }),

  appendThought: (sessionId, messageId, role, block) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const msgs = data.messages;
      const lastIdx = msgs.length - 1;

      let messages: Message[];

      // Fast path: last message matches (common streaming case, O(1))
      if (lastIdx >= 0 && msgs[lastIdx].id === messageId) {
        const updated = appendThoughtBlockToMessage(msgs[lastIdx], block);
        messages = [...msgs.slice(0, lastIdx), updated];
      } else {
        // Slow path: find the target message (for edge cases, O(n) but rare)
        const idx = msgs.findIndex((m) => m.id === messageId);
        if (idx >= 0) {
          const updated = appendThoughtBlockToMessage(msgs[idx], block);
          messages = [...msgs.slice(0, idx), updated, ...msgs.slice(idx + 1)];
        } else {
          const newMsg: Message = {
            id: messageId,
            role,
            parts: [{ type: 'thought', thought: [block] }],
            timestamp: Date.now(),
          };
          messages = [...msgs, newMsg];
        }
      }

      const next = new Map(s.sessions);
      next.set(sessionId, { ...data, messages });
      return { sessions: next };
    }),

  replaceContent: (sessionId, messageId, role, content) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const existingIndex = data.messages.findIndex((m) => m.id === messageId);
      const messages = [...data.messages];
      if (content === undefined && existingIndex >= 0) return s;
      if (existingIndex < 0) {
        messages.push({
          id: messageId,
          role,
          parts: content == null ? [] : [{ type: 'content', content }],
          timestamp: Date.now(),
        });
      } else {
        const message = data.messages[existingIndex];
        const contentPart: Extract<Message['parts'][number], { type: 'content' }> | null = content == null ? null : { type: 'content', content };
        const parts: Message['parts'] = message.parts.filter((part) => part.type !== 'content');
        const firstContentIndex = message.parts.findIndex((part) => part.type === 'content');
        if (contentPart) parts.splice(Math.min(firstContentIndex < 0 ? parts.length : firstContentIndex, parts.length), 0, contentPart);
        messages[existingIndex] = { ...message, parts };
      }
      const next = new Map(s.sessions);
      next.set(sessionId, { ...data, messages });
      return { sessions: next };
    }),

  replaceThought: (sessionId, messageId, content) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const idx = data.messages.findIndex((m) => m.id === messageId);
      if (content === undefined && idx >= 0) return s;
      const messages = [...data.messages];
      if (idx < 0) {
        messages.push({
          id: messageId,
          role: 'agent',
          parts: content == null ? [] : [{ type: 'thought', thought: content }],
          timestamp: Date.now(),
        });
      } else {
        const message = messages[idx];
        const thoughtPart: Extract<Message['parts'][number], { type: 'thought' }> | null = content == null ? null : { type: 'thought', thought: content };
        const parts: Message['parts'] = message.parts.filter((part) => part.type !== 'thought');
        const firstThoughtIndex = message.parts.findIndex((part) => part.type === 'thought');
        if (thoughtPart) parts.splice(Math.min(firstThoughtIndex < 0 ? parts.length : firstThoughtIndex, parts.length), 0, thoughtPart);
        messages[idx] = { ...message, parts };
      }
      const next = new Map(s.sessions);
      next.set(sessionId, { ...data, messages });
      return { sessions: next };
    }),

  setIsStreaming: (sessionId, v) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const next = new Map(s.sessions);
      next.set(sessionId, { ...data, isStreaming: v });
      return { sessions: next };
    }),

  setStopReason: (sessionId, r, messageId) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data || data.messages.length === 0) return s;
      const next = new Map(s.sessions);
      const messages = [...data.messages];
      const messageIndex = messageId
        ? messages.findIndex((message) => message.id === messageId)
        : messages.length - 1;
      if (messageIndex < 0) return s;
      messages[messageIndex] = { ...messages[messageIndex], stopReason: r };
      next.set(sessionId, { ...data, messages });
      return { sessions: next };
    }),

  upsertToolCall: (sessionId, tc) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const next = new Map(s.sessions);
      const toolCalls = new Map(data.pendingToolCalls);
      const existing = toolCalls.get(tc.toolCallId);
      // Preserve UI-only expanded state (agent never sends it)
      toolCalls.set(tc.toolCallId, existing ? { ...existing, ...tc, expanded: existing.expanded } : tc);

      const lastMsg = data.messages[data.messages.length - 1];
      let messages: Message[];

      if (lastMsg && lastMsg.role === 'agent') {
        const parts = lastMsg.parts;
        const last = parts[parts.length - 1];
        if (last?.type === 'tool_calls') {
          const tcs = last.toolCalls;
          const idx = tcs.findIndex((t) => t.toolCallId === tc.toolCallId);
          if (idx >= 0) {
            const updatedTcs = [...tcs];
            // Preserve UI-only expanded state (agent never sends it)
            updatedTcs[idx] = { ...updatedTcs[idx], ...tc, expanded: updatedTcs[idx].expanded };
            messages = [
              ...data.messages.slice(0, -1),
              { ...lastMsg, parts: [...parts.slice(0, -1), { ...last, toolCalls: updatedTcs }] },
            ];
          } else {
            messages = [
              ...data.messages.slice(0, -1),
              { ...lastMsg, parts: [...parts.slice(0, -1), { ...last, toolCalls: [...tcs, tc] }] },
            ];
          }
        } else {
          messages = [
            ...data.messages.slice(0, -1),
            { ...lastMsg, parts: [...parts, { type: 'tool_calls' as const, toolCalls: [tc] }] },
          ];
        }
      } else {
        messages = [
          ...data.messages,
          {
            id: generateId('msg'),
            role: 'agent',
            parts: [{ type: 'tool_calls' as const, toolCalls: [tc] }],
            timestamp: Date.now(),
          },
        ];
      }

      next.set(sessionId, { ...data, pendingToolCalls: toolCalls, messages });
      return { sessions: next };
    }),

  updateToolCall: (sessionId, id, update) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const existing = data.pendingToolCalls.get(id);
      if (!existing) return s;
      const toolCalls = new Map(data.pendingToolCalls);

      const updated = {
        ...existing,
        ...update,
        content: 'content' in update ? (update.content ?? []) : existing.content,
        locations: 'locations' in update ? (update.locations ?? []) : existing.locations,
        expanded: existing.expanded,
      };
      toolCalls.set(id, updated);

      // Also update tool call on the attached message
      const messages = data.messages.map((m) => {
        const tcPartIdx = m.parts.findIndex((p) => p.type === 'tool_calls' && p.toolCalls.some((t) => t.toolCallId === id));
        if (tcPartIdx >= 0) {
          const part = m.parts[tcPartIdx];
          if (part.type === 'tool_calls') {
            const updatedParts = [...m.parts];
            updatedParts[tcPartIdx] = {
              ...part,
              toolCalls: part.toolCalls.map((t) => (t.toolCallId === id ? updated : t)),
            };
            return { ...m, parts: updatedParts };
          }
        }
        return m;
      });

      const next = new Map(s.sessions);
      next.set(sessionId, { ...data, pendingToolCalls: toolCalls, messages });
      return { sessions: next };
    }),

  appendToolCallContent: (sessionId, id, block) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const existing = data.pendingToolCalls.get(id);
      if (!existing) return s;
      const updated = { ...existing, content: [...(existing.content ?? []), block], expanded: existing.expanded };
      const pendingToolCalls = new Map(data.pendingToolCalls);
      pendingToolCalls.set(id, updated);
      const messages = data.messages.map((m) => ({
        ...m,
        parts: m.parts.map((p) => p.type === 'tool_calls'
          ? { ...p, toolCalls: p.toolCalls.map((t) => t.toolCallId === id ? updated : t) }
          : p),
      }));
      const next = new Map(s.sessions);
      next.set(sessionId, { ...data, pendingToolCalls, messages });
      return { sessions: next };
    }),

  addPermissionRequest: (sessionId, req) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const next = new Map(s.sessions);
      next.set(sessionId, {
        ...data,
        pendingPermissions: [...data.pendingPermissions, req],
      });
      return { sessions: next };
    }),

  removePermissionRequest: (sessionId, requestId) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const next = new Map(s.sessions);
      next.set(sessionId, {
        ...data,
        pendingPermissions: data.pendingPermissions.filter((r) => r.id !== requestId),
      });
      return { sessions: next };
    }),

  rejectAllPermissions: (sessionId) => {
    // Reject outside the reducer (Promise settlement is a side effect), then
    // clear the queue inside `set` so subscribers see the emptied array.
    rejectPendingPermissions(sessionStore.getState().sessions.get(sessionId)?.pendingPermissions);
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data || data.pendingPermissions.length === 0) return s;
      const next = new Map(s.sessions);
      next.set(sessionId, { ...data, pendingPermissions: [] });
      return { sessions: next };
    });
  },

  setPlan: (sessionId, entries) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const messages = [
        ...data.messages,
        {
          id: generateId('plan'),
          role: 'agent' as const,
          parts: [{ type: 'plan' as const, plan: entries }],
          timestamp: Date.now(),
        },
      ];
      const next = new Map(s.sessions);
      next.set(sessionId, { ...data, plan: entries, messages });
      return { sessions: next };
    }),

  upsertPlan: (sessionId, planId, entries) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const planMessageIndex = data.messages.findIndex((message) =>
        message.parts.some((part) => part.type === 'plan' && part.planId === planId));
      const planPart = { type: 'plan' as const, plan: entries, planId };
      const messages = [...data.messages];
      if (planMessageIndex >= 0) {
        const message = messages[planMessageIndex];
        messages[planMessageIndex] = {
          ...message,
          parts: message.parts.map((part) =>
            part.type === 'plan' && part.planId === planId ? planPart : part),
        };
      } else {
        messages.push({ id: generateId('plan'), role: 'agent', parts: [planPart], timestamp: Date.now() });
      }
      const next = new Map(s.sessions);
      next.set(sessionId, { ...data, plan: entries, messages });
      return { sessions: next };
    }),

  removePlan: (sessionId, planId) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const messages = data.messages
        .map((message) => ({
          ...message,
          parts: message.parts.filter((part) => !(part.type === 'plan' && part.planId === planId)),
        }))
        .filter((message) => message.parts.length > 0);
      const remainingPlans = messages.flatMap((message) => message.parts
        .filter((part): part is Extract<Message['parts'][number], { type: 'plan' }> => part.type === 'plan')
        .map((part) => part.plan));
      const next = new Map(s.sessions);
      next.set(sessionId, { ...data, messages, plan: remainingPlans.at(-1) ?? [] });
      return { sessions: next };
    }),

  setUsage: (sessionId, usage) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const next = new Map(s.sessions);
      next.set(sessionId, { ...data, usage });
      return { sessions: next };
    }),

  setConfigOptions: (sessionId, configOptions) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const next = new Map(s.sessions);
      next.set(sessionId, { ...data, configOptions });
      return { sessions: next };
    }),

  setAvailableCommands: (sessionId, commands) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const next = new Map(s.sessions);
      next.set(sessionId, { ...data, availableCommands: commands });
      return { sessions: next };
    }),

  setPartExpanded: (sessionId, messageId, partIndex, expanded) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const messages = data.messages.map((m) => {
        if (m.id !== messageId) return m;
        const part = m.parts[partIndex];
        if (!part || part.type !== 'thought') return m;
        const updatedPart = { ...part, expanded };
        const parts = [...m.parts];
        parts[partIndex] = updatedPart;
        return { ...m, parts };
      });
      const next = new Map(s.sessions);
      next.set(sessionId, { ...data, messages });
      return { sessions: next };
    }),

  setToolCallExpanded: (sessionId, toolCallId, expanded) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;

      // Update in pendingToolCalls
      const existing = data.pendingToolCalls.get(toolCallId);
      const pendingToolCalls = new Map(data.pendingToolCalls);
      if (existing) {
        pendingToolCalls.set(toolCallId, { ...existing, expanded });
      }

      // Update in messages (tool calls are embedded in tool_calls parts)
      const messages = data.messages.map((m) => {
        const tcPartIdx = m.parts.findIndex(
          (p) => p.type === 'tool_calls' && p.toolCalls.some((t) => t.toolCallId === toolCallId),
        );
        if (tcPartIdx < 0) return m;
        const part = m.parts[tcPartIdx];
        if (part.type !== 'tool_calls') return m;
        const updatedParts = [...m.parts];
        updatedParts[tcPartIdx] = {
          ...part,
          toolCalls: part.toolCalls.map((t) =>
            t.toolCallId === toolCallId ? { ...t, expanded } : t,
          ),
        };
        return { ...m, parts: updatedParts };
      });

      const next = new Map(s.sessions);
      next.set(sessionId, { ...data, pendingToolCalls, messages });
      return { sessions: next };
    }),

  enqueueMessage: (sessionId, msg) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const next = new Map(s.sessions);
      next.set(sessionId, { ...data, queuedMessages: [...data.queuedMessages, msg] });
      return { sessions: next };
    }),

  dequeueMessage: (sessionId, queuedId) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const next = new Map(s.sessions);
      next.set(sessionId, {
        ...data,
        queuedMessages: data.queuedMessages.filter((m) => m.id !== queuedId),
      });
      return { sessions: next };
    }),

  shiftQueuedMessage: (sessionId): QueuedMessage | undefined => {
    const data: SessionData | undefined = sessionStore.getState().sessions.get(sessionId);
    if (!data || data.queuedMessages.length === 0) return undefined;
    const head: QueuedMessage = data.queuedMessages[0];
    set((s) => {
      const current = s.sessions.get(sessionId);
      if (!current) return s;
      const next = new Map(s.sessions);
      next.set(sessionId, { ...current, queuedMessages: current.queuedMessages.slice(1) });
      return { sessions: next };
    });
    return head;
  },

  updateTerminal: (sessionId, update) =>
    set((s) => {
      const data = s.sessions.get(sessionId);
      if (!data) return s;
      const terminals = new Map(data.terminals);
      const previous = terminals.get(update.terminalId);
      const hasSnapshot = Object.prototype.hasOwnProperty.call(update, 'outputBase64');
      terminals.set(update.terminalId, {
        ...previous,
        ...update,
        outputChunks: hasSnapshot ? [] : previous?.outputChunks ?? [],
        outputBytes: hasSnapshot ? decodeBase64(update.outputBase64) : previous?.outputBytes,
        outputMeta: hasSnapshot ? update.outputMeta : previous?.outputMeta,
      });
      const next = new Map(s.sessions);
      next.set(sessionId, { ...data, terminals });
      return { sessions: next };
    }),

  appendTerminalOutput: (sessionId, terminalId, data) =>
    set((s) => {
      const session = s.sessions.get(sessionId);
      if (!session) return s;
      const terminals = new Map(session.terminals);
      const previous = terminals.get(terminalId) ?? { terminalId, outputChunks: [] };
      terminals.set(terminalId, {
        ...previous,
        outputChunks: [...(previous.outputChunks ?? []), data],
        outputBytes: concatBytes(previous.outputBytes, decodeBase64(data)),
      });
      const next = new Map(s.sessions);
      next.set(sessionId, { ...session, terminals });
      return { sessions: next };
    }),
}));
