import * as acp from '@agentclientprotocol/sdk/experimental/v2';
import type {
  AgentCapabilities as V1AgentCapabilities,
  AuthMethod as V1AuthMethod,
  ClientCapabilities as V1ClientCapabilities,
  ContentBlock as V1ContentBlock,
  Implementation,
  InitializeResponse,
} from '@agentclientprotocol/sdk';
import type {
  NormalizedInitializeResult,
  NormalizedPermissionRequest,
  PermissionHandler,
  ProtocolAdapter,
  SessionUpdateHandler,
} from '../types';
import type { AuthMethodExtension } from '../../types';

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
    // v2 `session` itself advertises the required baseline methods. There is
    // no v1 `loadSession` equivalent: replay is selected on session/resume.
    sessionCapabilities: {
      list: session != null ? {} : undefined,
      resume: session != null ? {} : undefined,
      close: session != null ? {} : undefined,
      delete: sessionRecord?.delete ? {} : undefined,
      fork: sessionRecord?.fork ? {} : undefined,
    },
    promptCapabilities: session?.prompt as V1AgentCapabilities['promptCapabilities'],
  };
}

function toLegacyAuthMethods(methods: acp.AuthMethod[] | undefined): (V1AuthMethod | AuthMethodExtension)[] {
  return (methods ?? []).map((method) => {
    const common = {
      id: method.methodId,
      name: method.name,
      description: method.description ?? undefined,
      _meta: method._meta,
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
    if (method.type === 'agent') {
      return { type: 'agent' as const, ...common };
    }
    return { ...method, ...common, type: method.type } as AuthMethodExtension;
  });
}

function toV2Capabilities(value: V1ClientCapabilities | undefined): acp.ClientCapabilities {
  if (!value) {
    return {};
  }
  return {
    auth: value.auth ? { terminal: value.auth.terminal ? {} : undefined } : undefined,
  };
}

export function toV2McpServers(value: unknown[] | undefined): acp.McpServer[] {
  return (value ?? []).map((item) => {
    if (!item || typeof item !== 'object') throw new TypeError('Invalid MCP server configuration');
    const source = item as Record<string, unknown>;
    const type = source.type;
    if (type === 'sse') {
      throw new TypeError('MCP SSE servers are not supported by ACP v2');
    }

    // The public core API still accepts the v1 MCP shape, which had no
    // discriminator. Only an omitted discriminator is eligible for that
    // compatibility conversion; an explicit null is malformed v2 input.
    if (type === 'stdio' || (type === undefined && typeof source.command === 'string')) {
      if (typeof source.name !== 'string' || typeof source.command !== 'string') {
        throw new TypeError('ACP v2 stdio MCP server requires name and command');
      }
      const env = source.env;
      if (source.args !== undefined && !Array.isArray(source.args)) {
        throw new TypeError('ACP v2 stdio MCP server args must be an array');
      }
      if (Array.isArray(source.args) && source.args.some((arg) => typeof arg !== 'string')) {
        throw new TypeError('ACP v2 stdio MCP server args must contain only strings');
      }
      if (Array.isArray(env) && env.some((entry) => !entry || typeof entry !== 'object'
        || typeof (entry as Record<string, unknown>).name !== 'string'
        || typeof (entry as Record<string, unknown>).value !== 'string')) {
        throw new TypeError('ACP v2 stdio MCP server env must contain name/value strings');
      }
      return {
        ...source,
        type: 'stdio',
        args: Array.isArray(source.args) ? source.args : undefined,
        env: Array.isArray(env)
          ? env
          : env && typeof env === 'object'
            ? Object.entries(env as Record<string, unknown>).map(([name, raw]) => {
              if (typeof raw !== 'string') {
                throw new TypeError(`ACP v2 stdio MCP environment value must be a string: ${name}`);
              }
              return { name, value: raw };
            })
            : undefined,
      } as acp.McpServer;
    }

    if (type === 'http') {
      if (typeof source.name !== 'string' || typeof source.url !== 'string') {
        throw new TypeError('ACP v2 HTTP MCP server requires name and url');
      }
      if (source.headers !== undefined && !Array.isArray(source.headers)) {
        throw new TypeError('ACP v2 HTTP MCP server headers must be an array');
      }
      if (Array.isArray(source.headers) && source.headers.some((entry) => !entry || typeof entry !== 'object'
        || typeof (entry as Record<string, unknown>).name !== 'string'
        || typeof (entry as Record<string, unknown>).value !== 'string')) {
        throw new TypeError('ACP v2 HTTP MCP server headers must contain name/value strings');
      }
      return { ...source, type: 'http', headers: source.headers } as acp.McpServer;
    }

    if (type === 'acp') {
      if (typeof source.name !== 'string' || typeof source.serverId !== 'string') {
        throw new TypeError('ACP v2 ACP MCP server requires name and serverId');
      }
      return source as acp.McpServer;
    }

    if (typeof type === 'string') {
      // Unknown discriminators are valid extension/future variants. Preserve
      // their payload instead of demoting them to a known variant.
      return source as acp.McpServer;
    }
    throw new TypeError('ACP v2 MCP server requires a type discriminator');
  });
}

export function toV2Content(value: V1ContentBlock[]): acp.ContentBlock[] {
  return value as unknown as acp.ContentBlock[];
}

export function toLegacyConfigOptions(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((option) => {
    if (!option || typeof option !== 'object') return option;
    const source = option as Record<string, unknown>;
    const result: Record<string, unknown> = { ...source };
    if ('configId' in source) {
      result.id = source.configId;
      delete result.configId;
    }
    if (Array.isArray(source.options)) {
      result.options = source.options.map((item) => {
        if (!item || typeof item !== 'object') return item;
        const optionValue = item as Record<string, unknown>;
        if (!('groupId' in optionValue)) return optionValue;
        const normalized: Record<string, unknown> = { ...optionValue, group: optionValue['groupId'] };
        delete normalized.groupId;
        return normalized;
      });
    }
    return result;
  });
}

function normalizeSessionResponse(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const response = value as Record<string, unknown>;
  return 'configOptions' in response
    ? { ...response, configOptions: toLegacyConfigOptions(response.configOptions) }
    : response;
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
    complete: Promise<void>;
    completeResolve: () => void;
    accepted: boolean;
    earlyIdleStopReason?: string;
  }>();
  private terminalAuthMethodIds = new Set<string>();
  private agentAuthMethodIds = new Set<string>();
  private hasAuthMethods = false;

  constructor(options: V2AdapterOptions) {
    const app = acp
      .client({ name: 'acp-components-client' })
      .onNotification(acp.methods.client.session.update, (ctx) => {
        const notification = ctx.params;
        options.onSessionUpdate({
          sessionId: notification.sessionId,
          update: notification.update,
          protocolVersion: 2,
          _meta: notification._meta,
        });
        if (isIdleStateUpdate(notification.update)) {
          const pending = this.pendingPrompts.get(notification.sessionId);
          if (pending?.accepted) {
            this.pendingPrompts.delete(notification.sessionId);
            const stopReason = (notification.update as unknown as { stopReason?: string | null }).stopReason;
            pending.resolve({ stopReason: stopReason ?? 'end_turn' });
            pending.completeResolve();
          } else if (pending) {
            pending.earlyIdleStopReason = (notification.update as unknown as { stopReason?: string | null }).stopReason ?? 'end_turn';
          }
        }
      })
      .onRequest(acp.methods.client.session.requestPermission, (ctx) => {
        const request = ctx.params;
        const subject = request.subject ?? undefined;
        const subjectRecord = subject as Record<string, unknown> | undefined;
        const subjectToolCall = subject?.type === 'tool_call' && subjectRecord?.toolCall
          ? subjectRecord.toolCall as acp.ToolCallUpdate
          : undefined;
        const toolCall = subjectToolCall
          ? {
            ...subjectToolCall,
            title: subjectToolCall.title ?? request.title,
            kind: subjectToolCall.kind ?? 'other',
            status: subjectToolCall.status ?? 'pending',
            content: subjectToolCall.content ?? [],
            locations: subjectToolCall.locations ?? [],
          }
          : {
            toolCallId: typeof subjectRecord?.toolCallId === 'string'
              ? subjectRecord.toolCallId : `permission-${Date.now()}`,
            title: subject?.type === 'command' && typeof subject.command === 'string' ? subject.command : request.title,
            kind: subject?.type === 'command' ? 'execute' : 'other',
            rawInput: subject?.type === 'command' ? { command: subject.command, cwd: subject.cwd } : undefined,
          };
        const normalized: NormalizedPermissionRequest = {
          sessionId: request.sessionId,
          title: request.title,
          description: request.description ?? undefined,
          subject: subject ? {
            type: subject.type,
            command: subject.type === 'command' && typeof subject.command === 'string' ? subject.command : undefined,
            cwd: subject.type === 'command' && typeof subject.cwd === 'string' ? subject.cwd : undefined,
            toolCallId: subject.type === 'command' && typeof (subject as { toolCallId?: unknown }).toolCallId === 'string'
              ? (subject as { toolCallId: string }).toolCallId : undefined,
            terminalId: subject.type === 'command' && typeof (subject as { terminalId?: unknown }).terminalId === 'string'
              ? (subject as { terminalId: string }).terminalId : undefined,
          } : undefined,
          toolCall: toolCall as never,
          options: request.options as never,
          _meta: request._meta,
        };
        return options.onPermission(normalized);
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
    this.terminalAuthMethodIds = new Set(
      (response.authMethods ?? [])
        .filter((method) => method.type === 'terminal')
        .map((method) => method.methodId),
    );
    this.agentAuthMethodIds = new Set(
      (response.authMethods ?? [])
        .filter((method) => method.type === 'agent')
        .map((method) => method.methodId),
    );
    this.hasAuthMethods = (response.authMethods?.length ?? 0) > 0;
    return {
      protocolVersion: 2,
      agentInfo: response.info,
      capabilities: normalizeCapabilities(response.capabilities),
      authMethods: toLegacyAuthMethods(response.authMethods),
      hasSession: response.capabilities?.session != null,
      response: responseForLegacy,
    };
  }

  newSession(cwd: string, mcpServers: unknown[] = []): Promise<unknown> {
    return this.context.request(acp.methods.agent.session.new, { cwd, mcpServers: toV2McpServers(mcpServers) }).then(normalizeSessionResponse);
  }

  forkSession(sessionId: string, cwd: string, mcpServers: unknown[] = []): Promise<unknown> {
    return this.context.request(acp.methods.agent.session.fork, { sessionId, cwd, mcpServers: toV2McpServers(mcpServers) }).then(normalizeSessionResponse);
  }

  async prompt(sessionId: string, prompt: V1ContentBlock[]): Promise<unknown> {
    let completeResolve!: () => void;
    const complete = new Promise<void>((resolve) => {
      completeResolve = resolve;
    });
    const completion = new Promise<unknown>((resolve, reject) => {
      this.pendingPrompts.set(sessionId, {
        resolve,
        reject,
        complete,
        completeResolve,
        accepted: false,
      });
    });
    try {
      await this.context.request(acp.methods.agent.session.prompt, {
        sessionId,
        prompt: toV2Content(prompt),
      });
      const pending = this.pendingPrompts.get(sessionId);
      if (pending) {
        pending.accepted = true;
        if (pending.earlyIdleStopReason !== undefined) {
          this.pendingPrompts.delete(sessionId);
          pending.resolve({ stopReason: pending.earlyIdleStopReason });
          pending.completeResolve();
        }
      }
    } catch (error) {
      const pending = this.pendingPrompts.get(sessionId);
      if (pending) {
        this.pendingPrompts.delete(sessionId);
        pending.reject(error);
        pending.completeResolve();
      }
      throw error;
    }
    return completion;
  }

  async cancel(sessionId: string): Promise<void> {
    await this.context.notify(acp.methods.agent.session.cancel, { sessionId });
    const pending = this.pendingPrompts.get(sessionId);
    if (pending) await pending.complete;
  }

  listSessions(cursor?: string, cwd?: string): Promise<unknown> {
    return this.context.request(acp.methods.agent.session.list, { cursor: cursor ?? null, cwd: cwd ?? null });
  }

  resumeSession(sessionId: string, cwd: string, mcpServers: unknown[] = [], replayFromStart = false): Promise<unknown> {
    return this.context.request(acp.methods.agent.session.resume, {
      sessionId,
      cwd,
      mcpServers: toV2McpServers(mcpServers),
      ...(replayFromStart ? { replayFrom: { type: 'start' } } : {}),
    }).then(normalizeSessionResponse);
  }

  setSessionConfigOption(sessionId: string, configId: string, value: string | boolean): Promise<unknown> {
    if (typeof value === 'boolean') {
      return this.context.request(acp.methods.agent.session.setConfigOption, {
        sessionId, configId, type: 'boolean', value,
      }).then(normalizeSessionResponse);
    }
    return this.context.request(acp.methods.agent.session.setConfigOption, {
      sessionId, configId, type: 'id', value,
    }).then(normalizeSessionResponse);
  }

  closeSession(sessionId: string): Promise<unknown> {
    return this.context.request(acp.methods.agent.session.close, { sessionId });
  }

  deleteSession(sessionId: string): Promise<unknown> {
    return this.context.request(acp.methods.agent.session.delete, { sessionId });
  }

  login(methodId: string): Promise<unknown> {
    if (this.terminalAuthMethodIds.has(methodId)) {
      return Promise.reject(new Error('ACP v2 terminal authentication must be run by the host process, not auth/login'));
    }
    if (!this.agentAuthMethodIds.has(methodId)) {
      return Promise.reject(new Error(`ACP v2 auth method is not an agent login method: ${methodId}`));
    }
    return this.context.request(acp.methods.agent.auth.login, { methodId });
  }

  logout(): Promise<unknown> {
    if (!this.hasAuthMethods) {
      return Promise.reject(new Error('ACP v2 auth/logout is unavailable without advertised auth methods'));
    }
    return this.context.request(acp.methods.agent.auth.logout, {});
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
      pending.completeResolve();
    }
    this.pendingPrompts.clear();
  }
}
