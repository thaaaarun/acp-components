import {
  client,
  methods,
  type AuthenticateRequest,
  type AuthenticateResponse,
  type CancelNotification,
  type ClientCapabilities,
  type ClientConnection,
  type ClientContext,
  type CloseSessionRequest,
  type CloseSessionResponse,
  type DeleteSessionRequest,
  type DeleteSessionResponse,
  type ForkSessionRequest,
  type ForkSessionResponse,
  type Implementation,
  type InitializeRequest,
  type ListSessionsRequest,
  type ListSessionsResponse,
  type LoadSessionRequest,
  type LoadSessionResponse,
  type NewSessionRequest,
  type NewSessionResponse,
  type PromptRequest,
  type PromptResponse,
  type SetSessionConfigOptionRequest,
  type SetSessionConfigOptionResponse,
  type Stream,
} from '@agentclientprotocol/sdk';
import type {
  NormalizedInitializeResult,
  PermissionHandler,
  ProtocolAdapter,
  SessionUpdateHandler,
} from '../types';

export interface V1AdapterOptions {
  stream: Stream;
  onSessionUpdate: SessionUpdateHandler;
  onPermission: PermissionHandler;
}

export class V1Adapter implements ProtocolAdapter {
  readonly version = 1 as const;
  private readonly connection: ClientConnection;
  private readonly context: ClientContext;

  constructor(options: V1AdapterOptions) {
    const app = client({ name: 'acp-components-client' })
      .onNotification(methods.client.session.update, (ctx) => {
        options.onSessionUpdate(ctx.params);
      })
      .onRequest(methods.client.session.requestPermission, (ctx) => {
        return options.onPermission(ctx.params);
      });
    this.connection = app.connect(options.stream);
    this.context = this.connection.agent;
  }

  get signal(): AbortSignal {
    return this.connection.signal;
  }

  async initialize(clientInfo?: Implementation, clientCapabilities?: ClientCapabilities): Promise<NormalizedInitializeResult> {
    const request: InitializeRequest = {
      protocolVersion: 1,
      clientInfo: clientInfo ?? null,
      clientCapabilities: clientCapabilities ?? undefined,
    };
    const response = await this.context.request(methods.agent.initialize, request);
    if (response.protocolVersion !== 1) {
      throw new Error(`Unsupported ACP protocol version in v1 initialize response: ${String(response.protocolVersion)}`);
    }
    return {
      protocolVersion: 1,
      agentInfo: response.agentInfo ?? clientInfo ?? { name: 'unknown', version: 'unknown' },
      capabilities: response.agentCapabilities ?? null,
      authMethods: response.authMethods ?? [],
      response,
    };
  }

  newSession(cwd: string, mcpServers: NewSessionRequest['mcpServers'] = []): Promise<NewSessionResponse> {
    return this.context.request(methods.agent.session.new, { cwd, mcpServers });
  }

  forkSession(sessionId: string, cwd: string, mcpServers: ForkSessionRequest['mcpServers'] = []): Promise<ForkSessionResponse> {
    return this.context.request(methods.agent.session.fork, { sessionId, cwd, mcpServers });
  }

  prompt(sessionId: string, prompt: PromptRequest['prompt']): Promise<PromptResponse> {
    return this.context.request(methods.agent.session.prompt, { sessionId, prompt });
  }

  async cancel(sessionId: string): Promise<void> {
    const params: CancelNotification = { sessionId };
    await this.context.notify(methods.agent.session.cancel, params);
  }

  listSessions(cursor?: string, cwd?: string): Promise<ListSessionsResponse> {
    const params: ListSessionsRequest = {};
    if (cursor) params.cursor = cursor;
    if (cwd) params.cwd = cwd;
    return this.context.request(methods.agent.session.list, params);
  }

  resumeSession(sessionId: string, cwd: string, mcpServers: LoadSessionRequest['mcpServers'] = []): Promise<LoadSessionResponse> {
    return this.context.request(methods.agent.session.load, { sessionId, cwd, mcpServers });
  }

  setSessionConfigOption(sessionId: string, configId: string, value: string | boolean): Promise<SetSessionConfigOptionResponse> {
    const params: SetSessionConfigOptionRequest = { sessionId, configId } as SetSessionConfigOptionRequest;
    (params as Record<string, unknown>).value = value;
    if (typeof value === 'boolean') (params as Record<string, unknown>).type = 'boolean';
    return this.context.request(methods.agent.session.setConfigOption, params);
  }

  closeSession(sessionId: string): Promise<CloseSessionResponse> {
    const params: CloseSessionRequest = { sessionId };
    return this.context.request(methods.agent.session.close, params);
  }

  deleteSession(sessionId: string): Promise<DeleteSessionResponse> {
    const params: DeleteSessionRequest = { sessionId };
    return this.context.request(methods.agent.session.delete, params);
  }

  authenticate(methodId: string): Promise<AuthenticateResponse> {
    const params: AuthenticateRequest = { methodId };
    return this.context.request(methods.agent.authenticate, params);
  }

  login(methodId: string): Promise<AuthenticateResponse> {
    return this.authenticate(methodId);
  }

  extMethod(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.context.request<Record<string, unknown>, Record<string, unknown>>(method, params);
  }

  async extNotification(method: string, params: Record<string, unknown>): Promise<void> {
    await this.context.notify<Record<string, unknown>>(method, params);
  }

  close(): void {
    this.connection.close();
  }
}
