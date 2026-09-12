import type {
  AgentCapabilities,
  AuthMethod,
  ClientCapabilities,
  ContentBlock,
  Implementation,
  InitializeResponse,
  SessionNotification,
} from '@agentclientprotocol/sdk';

export type AcpProtocolVersion = 1 | 2;

/** The JSON-RPC stream shared by all transports and protocol adapters. */
export interface AcpWireStream {
  writable: WritableStream<unknown>;
  readable: ReadableStream<unknown>;
}

export interface NormalizedInitializeResult {
  protocolVersion: AcpProtocolVersion;
  agentInfo: Implementation;
  capabilities: AgentCapabilities | null;
  authMethods: AuthMethod[];
  /** Keep the native response available to callers that need protocol data. */
  response: InitializeResponse;
}

export interface ProtocolAdapter {
  readonly version: AcpProtocolVersion;
  readonly signal: AbortSignal;

  initialize(
    clientInfo?: Implementation,
    clientCapabilities?: ClientCapabilities,
  ): Promise<NormalizedInitializeResult>;

  newSession(cwd: string, mcpServers?: unknown[]): Promise<unknown>;
  forkSession(sessionId: string, cwd: string, mcpServers?: unknown[]): Promise<unknown>;
  prompt(sessionId: string, prompt: ContentBlock[]): Promise<unknown>;
  cancel(sessionId: string): Promise<void>;
  listSessions(cursor?: string, cwd?: string): Promise<unknown>;
  resumeSession(sessionId: string, cwd: string, mcpServers?: unknown[]): Promise<unknown>;
  setSessionConfigOption(sessionId: string, configId: string, value: string | boolean): Promise<unknown>;
  closeSession(sessionId: string): Promise<unknown>;
  deleteSession(sessionId: string): Promise<unknown>;
  login(methodId: string): Promise<unknown>;
  extMethod(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>>;
  extNotification(method: string, params: Record<string, unknown>): Promise<void>;
  close(): void;
}

export type SessionUpdateHandler = (notification: SessionNotification) => void;

export type PermissionHandler = (
  request: import('@agentclientprotocol/sdk').RequestPermissionRequest,
) => Promise<import('@agentclientprotocol/sdk').RequestPermissionResponse>;
