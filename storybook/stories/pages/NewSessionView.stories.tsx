import type { Meta, StoryObj } from '@storybook/react-vite';
import { NewSessionView } from '@acp-components/react';
import {
  STORY_CWD,
  configOptions,
  connectedAgent,
  conversationSeed,
} from '../../support/fixtures';

const meta = {
  title: 'Pages/New Session View',
  component: NewSessionView,
  tags: ['autodocs'],
  parameters: {
    frame: 'fullscreen',
    acp: {
      ...conversationSeed,
      agents: [{ ...connectedAgent, configOptions }],
      activeSessionId: null,
      workspaces: [{ cwd: STORY_CWD, sessions: [] }],
      sessions: {},
    },
  },
} satisfies Meta<typeof NewSessionView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const NoAgents: Story = {
  parameters: {
    acp: {
      workspaces: [{ cwd: STORY_CWD, sessions: [] }],
    },
  },
};
