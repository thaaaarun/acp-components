import type {
  AgentCapabilities,
  AuthMethod,
  ClientCapabilities,
  ContentBlock,
  Implementation,
  InitializeResponse,
  SessionNotification,
} from '@agentclientprotocol/sdk';
import type * as V2 from '@agentclientprotocol/sdk/experimental/v2';

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
  hasSession?: boolean;
}

export interface NormalizedPermissionRequest {
  sessionId: string;
  title: string;
  description?: string;
  toolCall: import('@agentclientprotocol/sdk').ToolCallUpdate;
  subject?: {
    type: string;
    command?: string;
    cwd?: string;
    toolCallId?: string | null;
    terminalId?: string | null;
  };
  options: import('@agentclientprotocol/sdk').PermissionOption[];
  _meta?: Record<string, unknown> | null;
}

export type ProtocolSessionNotification = {
  sessionId: string;
  update: SessionNotification['update'];
  protocolVersion: 1;
  _meta?: Record<string, unknown> | null;
} | {
  sessionId: string;
  update: V2.SessionUpdate;
  protocolVersion: 2;
  _meta?: Record<string, unknown> | null;
};

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
  resumeSession(sessionId: string, cwd: string, mcpServers?: unknown[], replayFromStart?: boolean): Promise<unknown>;
  setSessionConfigOption(sessionId: string, configId: string, value: string | boolean): Promise<unknown>;
  closeSession(sessionId: string): Promise<unknown>;
  deleteSession(sessionId: string): Promise<unknown>;
  login(methodId: string): Promise<unknown>;
  logout(): Promise<unknown>;
  extMethod(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>>;
  extNotification(method: string, params: Record<string, unknown>): Promise<void>;
  close(): void;
}

export type SessionUpdateHandler = (notification: ProtocolSessionNotification) => void;

export type PermissionHandler = (
  request: NormalizedPermissionRequest,
) => Promise<import('@agentclientprotocol/sdk').RequestPermissionResponse>;
