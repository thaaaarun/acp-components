import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoginDialog } from '@acp-components/react';
import { connectedAgent, STORY_AGENT_ID } from '../../support/fixtures';

const authAgent = {
  ...connectedAgent,
  authMethods: [
    {
      id: 'browser-login',
      name: 'Continue in browser',
      description: 'Authenticate through the agent provider.',
    },
    {
      id: 'terminal-login',
      name: 'Authenticate in terminal',
      description: 'Open an interactive terminal authentication flow.',
      type: 'terminal' as const,
    },
    {
      id: 'api-key',
      name: 'Use an API key',
      description: 'Provide credentials through environment variables.',
      type: 'env_var' as const,
      vars: [
        { name: 'API_KEY', label: 'API key', secret: true },
        { name: 'API_BASE_URL', label: 'Base URL', secret: false, optional: true },
      ],
    },
  ],
};

const meta = {
  title: 'Components/Login Dialog',
  component: LoginDialog,
  tags: ['autodocs'],
  parameters: {
    frame: 'fullscreen',
    acp: {
      agents: [authAgent],
      pendingAuthAgentId: STORY_AGENT_ID,
    },
  },
} satisfies Meta<typeof LoginDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AuthenticationRequired: Story = {};
export const HiddenWithoutRequest: Story = {
  parameters: { acp: { agents: [authAgent] } },
};
