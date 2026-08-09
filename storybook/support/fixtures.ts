import type {
  AgentConnection,
  AvailableCommand,
  FileTreeNode,
  Message,
  PermissionRequest,
  PlanEntry,
  SessionConfigOption,
  SessionMeta,
  Skill,
  ToolCallState,
} from '@acp-components/core';
import type { StorySeed } from './storeFixtures';

export const STORY_AGENT_ID = 'storybook-agent';
export const STORY_SESSION_ID = 'storybook-session';
export const STORY_CWD = '/workspace/acp-components';

export const connectedAgent: AgentConnection = {
  id: STORY_AGENT_ID,
  name: 'Codex Agent',
  status: 'connected',
  agentInfo: { name: 'codex', title: 'Codex Agent', version: '1.0.0' },
  capabilities: {
    loadSession: true,
    promptCapabilities: {
      image: true,
      audio: false,
      embeddedContext: true,
    },
    mcpCapabilities: {
      http: true,
      sse: true,
    },
    sessionCapabilities: {
      list: {},
      fork: {},
      resume: {},
      delete: {},
    },
  },
  authMethods: [],
};

export const storySession: SessionMeta = {
  id: STORY_SESSION_ID,
  title: 'Introduce Storybook documentation',
  cwd: STORY_CWD,
  updatedAt: new Date(Date.now() - 8 * 60_000).toISOString(),
  agentId: STORY_AGENT_ID,
  loaded: true,
};

const text = (value: string) => ({
  type: 'text' as const,
  text: value,
  annotations: null,
  _meta: null,
});

export const completedToolCall: ToolCallState = {
  toolCallId: 'tool-read-package',
  title: 'Read package configuration',
  kind: 'read',
  status: 'completed',
  locations: [{ path: `${STORY_CWD}/packages/react/package.json`, line: 1 }],
  content: [],
  rawInput: null,
  rawOutput: null,
};

export const conversationMessages: Message[] = [
  {
    id: 'message-user-1',
    role: 'user',
    timestamp: Date.now() - 120_000,
    parts: [{ type: 'content', content: [text('Add Storybook documentation without coupling it to the React package.')] }],
  },
  {
    id: 'message-agent-1',
    role: 'agent',
    timestamp: Date.now() - 90_000,
    parts: [
      {
        type: 'thought',
        expanded: false,
        thought: [text('I will inspect the workspace boundaries and keep the documentation app isolated.')],
      },
      { type: 'tool_calls', toolCalls: [completedToolCall] },
      {
        type: 'content',
        content: [text([
          'The Storybook app now lives in a top-level private workspace.',
          '',
          '- Stories import components from `@acp-components/react`.',
          '- ACP state is supplied by deterministic fixtures.',
          '- Theme and locale are available from the toolbar.',
        ].join('\n'))],
      },
    ],
  },
];

export const activePlan: PlanEntry[] = [
  { content: 'Configure the Storybook workspace', priority: 'high', status: 'completed' },
  { content: 'Document interactive components', priority: 'high', status: 'in_progress' },
  { content: 'Publish the static documentation', priority: 'medium', status: 'pending' },
];

export const availableCommands: AvailableCommand[] = [
  { name: 'plan', description: 'Create an implementation plan', input: null },
  { name: 'review', description: 'Review the current changes', input: null },
  { name: 'test', description: 'Run focused verification', input: null },
];

export const configOptions: SessionConfigOption[] = [
  {
    id: 'model',
    type: 'select',
    name: 'Model',
    category: 'model',
    currentValue: 'gpt-5',
    options: [
      { value: 'gpt-5', name: 'GPT-5' },
      { value: 'gpt-5-mini', name: 'GPT-5 mini' },
    ],
  },
  {
    id: 'planning',
    type: 'boolean',
    name: 'Planning',
    currentValue: true,
  },
];

export const permissionRequest: PermissionRequest = {
  id: 'permission-1',
  sessionId: STORY_SESSION_ID,
  toolCall: {
    toolCallId: 'tool-install',
    title: 'Install Storybook dependencies',
    rawInput: { command: 'pnpm install' },
  },
  options: [
    { optionId: 'allow-once', name: 'Allow once', kind: 'allow_once' },
    { optionId: 'reject-once', name: 'Deny', kind: 'reject_once' },
  ],
  resolve: () => {},
  reject: () => {},
};

export const sampleFileTree: FileTreeNode[] = [
  {
    name: 'packages',
    path: `${STORY_CWD}/packages`,
    kind: 'directory',
    expanded: true,
    loaded: true,
    children: [
      {
        name: 'react',
        path: `${STORY_CWD}/packages/react`,
        kind: 'directory',
        expanded: true,
        loaded: true,
        children: [
          { name: 'package.json', path: `${STORY_CWD}/packages/react/package.json`, kind: 'file' },
          { name: 'src', path: `${STORY_CWD}/packages/react/src`, kind: 'directory' },
        ],
      },
    ],
  },
  { name: 'pnpm-workspace.yaml', path: `${STORY_CWD}/pnpm-workspace.yaml`, kind: 'file' },
  { name: 'README.md', path: `${STORY_CWD}/README.md`, kind: 'file' },
];

export const sampleSkills: Skill[] = [
  { id: 'docs', name: 'Documentation', description: 'Write component documentation', group: 'Built in' },
  { id: 'review', name: 'Code review', description: 'Review changes for regressions', group: 'Built in' },
  { id: 'storybook', name: 'Storybook', description: 'Build and verify component stories', cwd: STORY_CWD },
];

export const conversationSeed: StorySeed = {
  agents: [connectedAgent],
  workspaces: [{ cwd: STORY_CWD, sessions: [storySession] }],
  activeSessionId: STORY_SESSION_ID,
  sessions: {
    [STORY_SESSION_ID]: {
      messages: conversationMessages,
      usage: { size: 128_000, used: 42_600, cost: { amount: 0.18, currency: '$' } },
      configOptions,
      availableCommands,
    },
  },
  fileTrees: [{ cwd: STORY_CWD, files: sampleFileTree }],
  skillsByAgent: { [STORY_AGENT_ID]: sampleSkills },
};
