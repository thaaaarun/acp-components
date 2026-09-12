import * as acp from '@agentclientprotocol/sdk/experimental/v2';
import type {
  AgentCapabilities as V1AgentCapabilities,
  AuthMethod as V1AuthMethod,
  ClientCapabilities as V1ClientCapabilities,
  ContentBlock as V1ContentBlock,
  Implementation,
  InitializeResponse,
  SessionNotification as V1SessionNotification,
  SessionUpdate as V1SessionUpdate,
} from '@agentclientprotocol/sdk';
import type {
  NormalizedInitializeResult,
  PermissionHandler,
  ProtocolAdapter,
  SessionUpdateHandler,
} from '../types';

export interface V2AdapterOptions {
  stream: acp.Stream;
  onSessionUpdate: SessionUpdateHandler;
  onPermission: PermissionHandler;
}

type V2Connection = acp.ClientConnection;
type V2Context = V2Connection['agent'];

function normalizeCapabilities(value: acp.AgentCapabilities | undefined): V1AgentCapabilities | null {
  if (!value) return null;
  const session = value.session;
  const sessionRecord = session as Record<string, unknown> | null | undefined;
  return {
    loadSession: !!sessionRecord?.resume,
    sessionCapabilities: {
      list: sessionRecord?.list ? {} : undefined,
      close: sessionRecord?.close ? {} : undefined,
      delete: sessionRecord?.delete ? {} : undefined,
      fork: sessionRecord?.fork ? {} : undefined,
    },
    promptCapabilities: session?.prompt as V1AgentCapabilities['promptCapabilities'],
  };
}

function toLegacyAuthMethods(methods: acp.AuthMethod[] | undefined): V1AuthMethod[] {
  return (methods ?? []).map((method) => {
    const common = {
      id: method.methodId,
      name: method.name,
      description: method.description ?? undefined,
    };
    if (method.type === 'terminal') {
      return {
        type: 'terminal' as const,
        ...common,
        args: method.args,
        env: (method.env as unknown as Array<{ name: string; value: string }> | undefined)?.reduce<Record<string, string>>((result, item) => {
          result[item.name] = item.value;
          return result;
        }, {}),
      };
    }
    return common;
  });
}

function toV2Capabilities(value: V1ClientCapabilities | undefined): acp.ClientCapabilities {
  if (!value) return {};
  return {
    auth: value.auth ? { terminal: value.auth.terminal ? {} : undefined } : undefined,
  };
}

function toV2McpServers(value: unknown[] | undefined): acp.McpServer[] {
  return (value ?? []) as acp.McpServer[];
}

function toV2Content(value: V1ContentBlock[]): acp.ContentBlock[] {
  return value as unknown as acp.ContentBlock[];
}

function toLegacyNotifications(
  notification: acp.UpdateSessionNotification,
): V1SessionNotification[] {
  const update = notification.update;
  const base = { sessionId: notification.sessionId };
  switch (update.sessionUpdate) {
    case 'user_message_chunk':
    case 'agent_message_chunk':
    case 'agent_thought_chunk':
      return [{ ...base, update: update as unknown as V1SessionUpdate } as V1SessionNotification];
    case 'user_message':
    case 'agent_message':
    case 'agent_thought': {
      const role = update.sessionUpdate === 'user_message'
        ? 'user_message_chunk'
        : update.sessionUpdate === 'agent_message'
          ? 'agent_message_chunk'
          : 'agent_thought_chunk';
      const content = (update as unknown as { content?: V1ContentBlock[] }).content ?? [];
      return content.map((item) => ({
        ...base,
        update: { sessionUpdate: role, messageId: update.messageId, content: item } as unknown as V1SessionUpdate,
      } as V1SessionNotification));
    }
    case 'tool_call_update':
      return [{ ...base, update: update as unknown as V1SessionUpdate } as V1SessionNotification];
    case 'tool_call_content_chunk':
      return [{
        ...base,
        update: {
          sessionUpdate: 'tool_call_update',
          toolCallId: update.toolCallId,
          content: [update.content],
        } as unknown as V1SessionUpdate,
      } as V1SessionNotification];
    case 'plan_update': {
      const plan = (update as unknown as { plan?: { type?: string; entries?: unknown[] } }).plan;
      if (plan?.type === 'items') {
        return [{
          ...base,
          update: { sessionUpdate: 'plan', entries: plan.entries ?? [] } as unknown as V1SessionUpdate,
        } as V1SessionNotification];
      }
      return [];
    }
    case 'config_option_update':
    case 'session_info_update':
    case 'usage_update':
    case 'available_commands_update':
      return [{ ...base, update: update as unknown as V1SessionUpdate } as V1SessionNotification];
    default:
      return [];
  }
}

function isIdleStateUpdate(update: acp.SessionUpdate): boolean {
  const value = update as unknown as { sessionUpdate?: string; state?: string };
  return value.sessionUpdate === 'state_update' && value.state === 'idle';
}

function asExtensionMethod(method: string): `_${string}` {
  if (!method.startsWith('_')) {
    throw new Error(`ACP v2 extension methods must start with _: ${method}`);
  }
  return method as `_${string}`;
}

export class V2Adapter implements ProtocolAdapter {
  readonly version = 2 as const;
  private readonly connection: V2Connection;
  private readonly context: V2Context;
  private readonly pendingPrompts = new Map<string, {
    resolve: (response: unknown) => void;
    reject: (error: unknown) => void;
  }>();

  constructor(options: V2AdapterOptions) {
    const app = acp
      .client({ name: 'acp-components-client' })
      .onNotification(acp.methods.client.session.update, (ctx) => {
        const notification = ctx.params;
        for (const legacy of toLegacyNotifications(notification)) {
          options.onSessionUpdate(legacy);
        }
        if (isIdleStateUpdate(notification.update)) {
          const pending = this.pendingPrompts.get(notification.sessionId);
          if (pending) {
            this.pendingPrompts.delete(notification.sessionId);
            const stopReason = (notification.update as unknown as { stopReason?: string | null }).stopReason;
            pending.resolve({ stopReason: stopReason ?? 'end_turn' });
          }
        }
      })
      .onRequest(acp.methods.client.session.requestPermission, (ctx) => {
        return options.onPermission(ctx.params as never);
      });
    this.connection = app.connect(options.stream);
    this.context = this.connection.agent;
  }

  get signal(): AbortSignal {
    return this.connection.signal;
  }

  async initialize(clientInfo?: Implementation, clientCapabilities?: V1ClientCapabilities): Promise<NormalizedInitializeResult> {
    const response = await this.context.request(acp.methods.agent.initialize, {
      protocolVersion: acp.PROTOCOL_VERSION,
      info: clientInfo ?? { name: 'acp-components-client', version: '0.1.0' },
      capabilities: toV2Capabilities(clientCapabilities),
    });
    if (response.protocolVersion !== acp.PROTOCOL_VERSION || !response.info) {
      throw new Error(`Unsupported ACP protocol version in v2 initialize response: ${String(response.protocolVersion)}`);
    }
    const responseForLegacy: InitializeResponse = {
      protocolVersion: response.protocolVersion,
      agentInfo: response.info,
      agentCapabilities: normalizeCapabilities(response.capabilities) ?? undefined,
      authMethods: toLegacyAuthMethods(response.authMethods),
    };
    return {
      protocolVersion: 2,
      agentInfo: response.info,
      capabilities: normalizeCapabilities(response.capabilities),
      authMethods: toLegacyAuthMethods(response.authMethods),
      response: responseForLegacy,
    };
  }

  newSession(cwd: string, mcpServers: unknown[] = []): Promise<unknown> {
    return this.context.request(acp.methods.agent.session.new, { cwd, mcpServers: toV2McpServers(mcpServers) });
  }

  forkSession(sessionId: string, cwd: string, mcpServers: unknown[] = []): Promise<unknown> {
    return this.context.request(acp.methods.agent.session.fork, { sessionId, cwd, mcpServers: toV2McpServers(mcpServers) });
  }

  async prompt(sessionId: string, prompt: V1ContentBlock[]): Promise<unknown> {
    const completion = new Promise<unknown>((resolve, reject) => {
      this.pendingPrompts.set(sessionId, { resolve, reject });
    });
    try {
      await this.context.request(acp.methods.agent.session.prompt, {
        sessionId,
        prompt: toV2Content(prompt),
      });
    } catch (error) {
      const pending = this.pendingPrompts.get(sessionId);
      if (pending) {
        this.pendingPrompts.delete(sessionId);
        pending.reject(error);
      }
      throw error;
    }
    return completion;
  }

  async cancel(sessionId: string): Promise<void> {
    await this.context.notify(acp.methods.agent.session.cancel, { sessionId });
  }

  listSessions(cursor?: string, cwd?: string): Promise<unknown> {
    return this.context.request(acp.methods.agent.session.list, { cursor: cursor ?? null, cwd: cwd ?? null });
  }

  resumeSession(sessionId: string, cwd: string, mcpServers: unknown[] = []): Promise<unknown> {
    return this.context.request(acp.methods.agent.session.resume, { sessionId, cwd, mcpServers: toV2McpServers(mcpServers) });
  }

  setSessionConfigOption(sessionId: string, configId: string, value: string | boolean): Promise<unknown> {
    if (typeof value === 'boolean') {
      return this.context.request(acp.methods.agent.session.setConfigOption, {
        sessionId, configId, type: 'boolean', value,
      });
    }
    return this.context.request(acp.methods.agent.session.setConfigOption, {
      sessionId, configId, type: 'id', value,
    });
  }

  closeSession(sessionId: string): Promise<unknown> {
    return this.context.request(acp.methods.agent.session.close, { sessionId });
  }

  deleteSession(sessionId: string): Promise<unknown> {
    return this.context.request(acp.methods.agent.session.delete, { sessionId });
  }

  login(methodId: string): Promise<unknown> {
    return this.context.request(acp.methods.agent.auth.login, { methodId });
  }

  extMethod(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.context.request<Record<string, unknown>, Record<string, unknown>>(asExtensionMethod(method), params);
  }

  async extNotification(method: string, params: Record<string, unknown>): Promise<void> {
    await this.context.notify(asExtensionMethod(method), params);
  }

  close(): void {
    this.connection.close();
    for (const pending of this.pendingPrompts.values()) {
      pending.resolve({ stopReason: 'end_turn' });
    }
    this.pendingPrompts.clear();
  }
}
