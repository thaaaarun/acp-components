import type { Meta, StoryObj } from '@storybook/react-vite';
import { NewSessionView } from '@acp-components/react';
import {
  STORY_CWD,
  configOptions,
  connectedAgent,
  conversationSeed,
} from '../../support/fixtures';

const meta = {
  title: 'Layer 3 - Pages & Patterns/Pages/New Session View',
  component: NewSessionView,
  tags: ['autodocs'],
  parameters: { frame: 'fullscreen' },
} satisfies Meta<typeof NewSessionView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  parameters: {
    acp: {
      ...conversationSeed,
      agents: [{ ...connectedAgent, configOptions }],
      activeSessionId: null,
      workspaces: [{ cwd: STORY_CWD, sessions: [] }],
      sessions: {},
    },
  },
};

export const NoAgents: Story = {
  parameters: {
    acp: {
      workspaces: [{ cwd: STORY_CWD, sessions: [] }],
    },
  },
};
