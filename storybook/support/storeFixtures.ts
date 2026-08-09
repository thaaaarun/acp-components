import {
  acpStore,
  fileTreeStore,
  fileViewerStore,
  sessionStore,
  skillStore,
  type AgentConnection,
  type AvailableCommand,
  type FileTreeNode,
  type Message,
  type OpenFileEntry,
  type PermissionRequest,
  type PlanEntry,
  type QueuedMessage,
  type SessionConfigOption,
  type SessionMeta,
  type Skill,
  type ToolCallState,
  type UsageUpdate,
  type WorkspaceState,
} from '@acp-components/core';

export interface SessionFixture {
  messages?: Message[];
  isStreaming?: boolean;
  toolCalls?: ToolCallState[];
  permissions?: PermissionRequest[];
  plan?: PlanEntry[];
  usage?: UsageUpdate;
  configOptions?: SessionConfigOption[];
  availableCommands?: AvailableCommand[];
  queuedMessages?: QueuedMessage[];
}

export interface FileTreeFixture {
  cwd: string;
  files: FileTreeNode[];
  loading?: boolean;
  error?: string | null;
}

export interface StorySeed {
  agents?: AgentConnection[];
  workspaces?: Array<{
    cwd: string;
    label?: string;
    sessions?: SessionMeta[];
  }>;
  activeSessionId?: string | null;
  pendingAuthAgentId?: string;
  sessions?: Record<string, SessionFixture>;
  fileTrees?: FileTreeFixture[];
  openFiles?: OpenFileEntry[];
  activeFilePath?: string | null;
  skillsByAgent?: Record<string, Skill[]>;
}

export function resetStoryStores(): void {
  acpStore.setState({
    agents: new Map(),
    workspaces: new Map(),
    activeSessionId: null,
    pendingAuth: null,
  });
  sessionStore.setState({ sessions: new Map() });
  fileTreeStore.setState({ workspaces: new Map() });
  fileViewerStore.setState({
    openFiles: [],
    activeFilePath: null,
    revealLine: null,
    fileContentReader: null,
    fileOpenDelegate: null,
  });
  skillStore.setState({ skillsByAgent: new Map() });
}

export function seedStoryStores(seed: StorySeed = {}): void {
  const agents = new Map((seed.agents ?? []).map((agent) => [agent.id, agent]));
  const workspaces = new Map<string, WorkspaceState>();

  for (const workspace of seed.workspaces ?? []) {
    workspaces.set(workspace.cwd, {
      cwd: workspace.cwd,
      label: workspace.label,
      sessions: new Map((workspace.sessions ?? []).map((session) => [session.id, session])),
      sessionListCursors: new Map(),
    });
  }

  acpStore.setState({
    agents,
    workspaces,
    activeSessionId: seed.activeSessionId ?? null,
    pendingAuth: seed.pendingAuthAgentId ? { agentId: seed.pendingAuthAgentId } : null,
  });

  for (const [sessionId, fixture] of Object.entries(seed.sessions ?? {})) {
    const store = sessionStore.getState();
    store.ensureSession(sessionId);
    for (const message of fixture.messages ?? []) store.addMessage(sessionId, message);
    for (const toolCall of fixture.toolCalls ?? []) store.upsertToolCall(sessionId, toolCall);
    for (const permission of fixture.permissions ?? []) store.addPermissionRequest(sessionId, permission);
    for (const queued of fixture.queuedMessages ?? []) store.enqueueMessage(sessionId, queued);
    if (fixture.plan) store.setPlan(sessionId, fixture.plan);
    if (fixture.usage) store.setUsage(sessionId, fixture.usage);
    if (fixture.configOptions) store.setConfigOptions(sessionId, fixture.configOptions);
    if (fixture.availableCommands) store.setAvailableCommands(sessionId, fixture.availableCommands);
    if (fixture.isStreaming) store.setIsStreaming(sessionId, true);
  }

  for (const fixture of seed.fileTrees ?? []) {
    const store = fileTreeStore.getState();
    store.initWorkspace(fixture.cwd);
    store.setRootNodes(fixture.cwd, fixture.files);
    if (fixture.loading) store.setLoading(fixture.cwd, true);
    if (fixture.error) store.setError(fixture.cwd, fixture.error);
  }

  if (seed.openFiles) {
    fileViewerStore.setState({
      openFiles: seed.openFiles,
      activeFilePath: seed.activeFilePath ?? seed.openFiles[0]?.path ?? null,
    });
  }

  for (const [agentId, skills] of Object.entries(seed.skillsByAgent ?? {})) {
    skillStore.getState().setAgentSkills(agentId, skills);
  }
}
