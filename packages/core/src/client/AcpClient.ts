import type {
  AgentCapabilities,
  ClientCapabilities,
  Implementation,
  InitializeResponse,
  AuthenticateResponse,
  CloseSessionResponse,
  DeleteSessionResponse,
  ForkSessionRequest,
  ForkSessionResponse,
  ListSessionsResponse,
  LoadSessionRequest,
  LoadSessionResponse,
  NewSessionRequest,
  NewSessionResponse,
  PromptRequest,
  PromptResponse,
  SetSessionConfigOptionResponse,
  RequestPermissionResponse,
} from '@agentclientprotocol/sdk';
import { HttpTransport, WebSocketTransport } from '../transport';
import type { AcpTransport, StdioTransportOptions } from '../transport';
import type { ConnectionStatus, TransportConfig } from '../types';
import type { Skill } from '../store/skillStore';
import { ProtocolNegotiator } from '../protocol';
import type { AcpProtocolVersion, NormalizedPermissionRequest, ProtocolSessionNotification } from '../protocol';

/**
 * Host-injected factory that turns a stdio spawn config into a concrete
 * `AcpTransport`. core does not own a stdio spawn implementation (spawning a
 * child process is a host-native capability a browser cannot back), so a host
 * provides this via `Platform.process.createStdioTransport`; the React
 * `AcpProvider` resolves it and injects it through `createAcpProvider`. When
 * unset, a `{ type: 'stdio' }` config fails fast at connect time.
 */
export type StdioTransportFactory = (options: StdioTransportOptions) => AcpTransport;

/** Host-native runner for ACP v2 terminal authentication. */
export type TerminalAuthFactory = (options: {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}) => Promise<void>;

export type SessionUpdateHandler = (update: ProtocolSessionNotification) => void;
export type PermissionHandler = (request: NormalizedPermissionRequest) => Promise<RequestPermissionResponse>;

/**
 * A skill entry already normalized to the core `Skill` shape, paired with the
 * source workspace root it was reported for (when the agent returns a
 * per-cwd grouped response).
 */
interface NormalizedSkillEntry {
  cwd?: string;
  skill: Skill;
}

/**
 * Pull skills out of an arbitrary `_acp/skills/list` response, preserving the
 * source `cwd` when the agent returns a per-workspace grouped result.
 *
 * Supported response shapes (most-specific first):
 *  1. Per-cwd grouped array: `[{ cwd: "/a", skills: [...] }, ...]` — emitted
 *     when `listSkills(cwds)` is called with one or more workspaces. Each
 *     skill is tagged with its entry's `cwd`.
 *  2. Bare flat array: `[skill, skill, ...]` (no `cwd` context).
 *  3. Enveloped: `{ skills: [...] }` or `{ data: [...] }`.
 *
 * Elements that are not skill records are dropped. Unknown fields are
 * tolerated by `normalizeSkill`.
 */
function extractSkillEntries(res: unknown): NormalizedSkillEntry[] {
  const arr = Array.isArray(res)
    ? res
    : Array.isArray((res as Record<string, unknown> | null | undefined)?.skills)
      ? (res as Record<string, unknown>).skills as unknown[]
      : Array.isArray((res as Record<string, unknown> | null | undefined)?.data)
        ? (res as Record<string, unknown>).data as unknown[]
        : [];

  const entries: NormalizedSkillEntry[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    // Per-cwd grouped entry: `{ cwd, skills: [...] }`. Detect by a `skills`
    // array (and a stringish `cwd`); the inner array is the real skill list.
    const inner = Array.isArray(rec.skills) ? rec.skills as unknown[] : null;
    if (inner) {
      const cwd = typeof rec.cwd === 'string' ? rec.cwd : undefined;
      for (const s of inner) {
        if (!s || typeof s !== 'object') continue;
        entries.push({ cwd, skill: normalizeSkill(s as Record<string, unknown>) });
      }
    } else {
      entries.push({ cwd: undefined, skill: normalizeSkill(rec) });
    }
  }
  return entries;
}

/**
 * Map an agent-provided skill record onto the core `Skill` shape. Accepts a few
 * common field aliases (`name`/`title`, `description`/`desc`) and tolerates
 * missing fields — only `id`/`name` are required on the output.
 */
function normalizeSkill(raw: Record<string, unknown>): Skill {
  const id = String(raw.id ?? raw.skillId ?? raw.name ?? '');
  const name = String(raw.name ?? raw.title ?? id);
  const description =
    raw.description != null ? String(raw.description)
      : raw.desc != null ? String(raw.desc)
        : undefined;
  const group = raw.group != null ? String(raw.group) : raw.source != null ? String(raw.source) : undefined;
  const iconName = raw.iconName != null ? String(raw.iconName) : raw.icon != null ? String(raw.icon) : undefined;
  const disabled = typeof raw.disabled === 'boolean' ? raw.disabled : undefined;
  const skill: Skill = { id, name };
  if (description !== undefined) skill.description = description;
  if (group !== undefined) skill.group = group;
  if (iconName !== undefined) skill.iconName = iconName;
  if (disabled !== undefined) skill.disabled = disabled;
  return skill;
}

function createTransport(
  config: TransportConfig,
  stdioFactory: StdioTransportFactory | null,
): AcpTransport {
  switch (config.type) {
    case 'stdio':
      if (!stdioFactory) {
        // No host stdio capability was injected (e.g. a web platform that cannot
        // spawn a process). Fail fast here rather than inside a baked-in spawn
        // — the host must provide `Platform.process.createStdioTransport`.
        throw new Error(
          'stdio transport requires a host-provided factory (Platform.process.createStdioTransport); none was injected.',
        );
      }
      return stdioFactory({ command: config.command, args: config.args, env: config.env });
    case 'http':
      return new HttpTransport({ url: config.url, headers: config.headers });
    case 'websocket':
      return new WebSocketTransport({ url: config.url });
    case 'custom':
      return config.transport;
    default:
      throw new Error(`Unsupported transport type: ${(config as TransportConfig).type}`);
  }
}

export class AcpClient {
  private negotiator: ProtocolNegotiator | null = null;
  private transport: AcpTransport | null = null;
  private _transportConfig: TransportConfig | null = null;
  private _status: ConnectionStatus = 'disconnected';
  private _agentInfo: Implementation | null = null;
  private _capabilities: AgentCapabilities | null = null;
  private _hasSession = false;
  private _clientInfo: Implementation | undefined = undefined;
  private _clientCapabilities: ClientCapabilities | undefined = undefined;

  private sessionUpdateHandlers = new Set<SessionUpdateHandler>();
  private permissionHandler: PermissionHandler | null = null;
  private statusHandlers = new Set<(status: ConnectionStatus) => void>();
  private closeHandlers = new Set<() => void>();
  private closeNotified = false;
  /**
   * Host-injected stdio transport factory (`Platform.process.createStdioTransport`).
   * Resolved by the React `AcpProvider` and injected before `connect()`. `null`
   * means the host cannot spawn a process — a `{ type: 'stdio' }` config then
   * throws in `createTransport`.
   */
  private stdioFactory: StdioTransportFactory | null = null;
  private terminalAuthFactory: TerminalAuthFactory | null = null;
  private authMethods: import('../types').AuthMethod[] = [];

  /**
   * Inject the host stdio transport factory. Called once by the provider before
   * connecting each agent; subsequent calls replace the previous factory (used
   * when the host swaps its `Platform` capability set at runtime).
   */
  setStdioTransportFactory(factory: StdioTransportFactory | null): void {
    this.stdioFactory = factory;
  }

  setTerminalAuthFactory(factory: TerminalAuthFactory | null): void {
    this.terminalAuthFactory = factory;
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  get agentInfo(): Implementation | null {
    return this._agentInfo;
  }

  get capabilities(): AgentCapabilities | null {
    return this._capabilities;
  }

  get hasSession(): boolean {
    return this._hasSession;
  }

  get protocolVersion(): AcpProtocolVersion | null {
    return this.negotiator?.version ?? null;
  }

  get signal(): AbortSignal | undefined {
    return this.negotiator?.signal;
  }

  private setStatus(status: ConnectionStatus): void {
    this._status = status;
    for (const h of this.statusHandlers) h(status);
  }

  private notifyClosed(): void {
    if (this.closeNotified) return;
    this.closeNotified = true;
    this.setStatus('disconnected');
    for (const h of this.closeHandlers) h();
    this.closeHandlers.clear();
  }

  onStatusChange(handler: (status: ConnectionStatus) => void): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  onClose(handler: () => void): () => void {
    this.closeHandlers.add(handler);
    return () => this.closeHandlers.delete(handler);
  }

  onSessionUpdate(handler: SessionUpdateHandler): () => void {
    this.sessionUpdateHandlers.add(handler);
    return () => this.sessionUpdateHandlers.delete(handler);
  }

  setPermissionHandler(handler: PermissionHandler): void {
    this.permissionHandler = handler;
  }

  async connect(config: TransportConfig): Promise<void> {
    if (this._status === 'connecting') {
      return;
    }
    if (this.transport || this.negotiator) {
      this.disconnect();
    }
    this._transportConfig = config;
    this.closeNotified = false;
    this.setStatus('connecting');

    const openTransport = async (): Promise<import('../protocol').AcpWireStream> => {
      // Protocol fallback is a new connection. This matters for stdio hosts:
      // an exited/initialized child cannot be reused for the second handshake.
      this.transport?.disconnect();
      const next = createTransport(config, this.stdioFactory);
      this.transport = next;
      next.onClose?.(() => {
        if (this.transport === next) this.notifyClosed();
      });
      next.onError?.((_err) => {
        if (this.transport === next) this.setStatus('error');
      });
      return next.connect();
    };

    this.negotiator = new ProtocolNegotiator({
      createStream: openTransport,
      onSessionUpdate: (notification) => {
        for (const h of this.sessionUpdateHandlers) h(notification);
      },
      onPermission: (request) => this.handlePermission(request),
      onClose: () => this.notifyClosed(),
    });
    try {
      await this.negotiator.connect();
    } catch (err) {
      this.setStatus('error');
      this.transport = null;
      this.negotiator = null;
      throw err;
    }
  }

  /**
   * Resolve a `session/request_permission` request. Delegates to the
   * permission handler if set; otherwise auto-selects the first option
   * (preserving the legacy behaviour).
   */
  private async handlePermission(params: NormalizedPermissionRequest): Promise<RequestPermissionResponse> {
    if (this.permissionHandler) {
      return this.permissionHandler(params);
    }
    return {
      outcome: { outcome: 'selected', optionId: params.options[0]?.optionId ?? '' },
    };
  }

  async initialize(clientInfo?: Implementation, clientCapabilities?: ClientCapabilities): Promise<InitializeResponse> {
    if (!this.negotiator) throw new Error('Not connected');

    this._clientInfo = clientInfo;
    const effectiveClientCapabilities = this.terminalAuthFactory && this._transportConfig?.type === 'stdio'
      ? {
        ...clientCapabilities,
        auth: { ...clientCapabilities?.auth, terminal: true },
      }
      : clientCapabilities;
    this._clientCapabilities = effectiveClientCapabilities;

    const res = await this.negotiator.initialize(clientInfo, effectiveClientCapabilities);
    this._agentInfo = res.agentInfo ?? null;
    this._capabilities = res.capabilities ?? null;
    this._hasSession = res.hasSession ?? !!res.capabilities?.sessionCapabilities?.list;
    this.authMethods = res.authMethods ?? [];
    this.setStatus('connected');
    return res.response;
  }

  async newSession(cwd: string, mcpServers: NewSessionRequest['mcpServers'] = []): Promise<NewSessionResponse> {
    return this.requireAdapter().newSession(cwd, mcpServers) as Promise<NewSessionResponse>;
  }

  async forkSession(sessionId: string, cwd: string, mcpServers: ForkSessionRequest['mcpServers'] = []): Promise<ForkSessionResponse> {
    return this.requireAdapter().forkSession(sessionId, cwd, mcpServers) as Promise<ForkSessionResponse>;
  }

  async prompt(sessionId: string, prompt: PromptRequest['prompt']): Promise<PromptResponse> {
    return this.requireAdapter().prompt(sessionId, prompt) as Promise<PromptResponse>;
  }

  async cancel(sessionId: string): Promise<void> {
    await this.requireAdapter().cancel(sessionId);
  }

  async listSessions(cursor?: string, cwd?: string): Promise<ListSessionsResponse> {
    return this.requireAdapter().listSessions(cursor, cwd) as Promise<ListSessionsResponse>;
  }

  async loadSession(sessionId: string, cwd: string, mcpServers: LoadSessionRequest['mcpServers'] = []): Promise<LoadSessionResponse> {
    return this.requireAdapter().resumeSession(sessionId, cwd, mcpServers, true) as Promise<LoadSessionResponse>;
  }

  async setSessionConfigOption(sessionId: string, configId: string, value: string | boolean): Promise<SetSessionConfigOptionResponse> {
    return this.requireAdapter().setSessionConfigOption(sessionId, configId, value) as Promise<SetSessionConfigOptionResponse>;
  }

  async closeSession(sessionId: string): Promise<CloseSessionResponse> {
    return this.requireAdapter().closeSession(sessionId) as Promise<CloseSessionResponse>;
  }

  async deleteSession(sessionId: string): Promise<DeleteSessionResponse> {
    return this.requireAdapter().deleteSession(sessionId) as Promise<DeleteSessionResponse>;
  }

  async authenticate(methodId: string): Promise<AuthenticateResponse> {
    const authMethod = this.authMethods.find((method) => method.id === methodId);
    if (this.protocolVersion === 2 && authMethod && 'type' in authMethod && authMethod.type === 'terminal') {
      if (this.protocolVersion !== 2) throw new Error('Terminal authentication is only available in ACP v2');
      if (!this.terminalAuthFactory) throw new Error('Terminal authentication requires a host process capability');
      const transport = this._transportConfig;
      if (!transport || transport.type !== 'stdio') {
        throw new Error('Terminal authentication requires a stdio agent transport');
      }
      const rawEnv = (authMethod as { env?: Record<string, string> | Array<{ name: string; value: string }> }).env;
      const methodEnv = Array.isArray(rawEnv)
        ? rawEnv.reduce<Record<string, string>>((result, item) => {
          result[item.name] = item.value;
          return result;
        }, {})
        : rawEnv ?? {};
      await this.terminalAuthFactory({
        command: transport.command,
        args: [...(transport.args ?? []), ...((authMethod as { args?: string[] }).args ?? [])],
        env: { ...transport.env, ...methodEnv },
      });
      return {} as AuthenticateResponse;
    }
    return this.requireAdapter().login(methodId) as Promise<AuthenticateResponse>;
  }

  async logout(): Promise<void> {
    await this.requireAdapter().logout();
  }

  async extMethod(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.requireAdapter().extMethod(method, params);
  }

  /**
   * Fetch the agent's skill catalog via the `_acp/skills/list` extension method.
   *
   * @param cwds Optional list of every workspace path the user currently has
   *   open. Forwarded to the agent so it can scope/filter the skills it reports
   *   (e.g. only return skills that apply to the open project roots). When
   *   provided, the agent is expected to return a per-cwd grouped array —
   *   `[{ cwd: "/a", skills: [...] }, ...]` — and each returned skill is
   *   stamped with the `cwd` of the entry it came from. Omit when the caller
   *   has no workspace context; the agent then returns a flat global catalog
   *   (no `cwd` on the skills). Unknown/optional fields are stripped before
   *   sending.
   */
  async listSkills(cwds?: string[]): Promise<Skill[]> {
    if (!this.negotiator) throw new Error('Not connected');
    const params: Record<string, unknown> = {};
    if (cwds && cwds.length > 0) params.cwds = cwds;
    const res = await this.extMethod('_acp/skills/list', params);
    const entries = extractSkillEntries(res);
    return entries.map(({ cwd, skill }) => {
      if (cwd !== undefined) skill.cwd = cwd;
      return skill;
    });
  }

  async extNotification(method: string, params: Record<string, unknown>): Promise<void> {
    await this.requireAdapter().extNotification(method, params);
  }

  disconnect(): void {
    const negotiator = this.negotiator;
    negotiator?.close();
    this.transport?.disconnect();
    this.transport = null;
    this.negotiator = null;
    if (!negotiator) this.notifyClosed();
  }

  private requireAdapter() {
    if (!this.negotiator) throw new Error('Not connected');
    return this.negotiator.current;
  }

  async reconnectWithEnv(additionalEnv: Record<string, string>): Promise<InitializeResponse> {
    if (!this._transportConfig) throw new Error('Not connected');
    this.disconnect();
    // Reset status so connect() allows reconnection
    this._status = 'disconnected';

    // Merge additional env vars into transport config
    const config = { ...this._transportConfig };
    if (config.type === 'stdio') {
      config.env = { ...config.env, ...additionalEnv };
    }
    this._transportConfig = config;

    await this.connect(config);
    return this.initialize(this._clientInfo, this._clientCapabilities);
  }
}
