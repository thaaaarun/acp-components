import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConnectionStatus } from '@acp-components/react';
import { connectedAgent } from '../../support/fixtures';

const meta = {
  title: 'Components/Connection Status',
  component: ConnectionStatus,
  tags: ['autodocs'],
  parameters: { frame: 'centered' },
  decorators: [(Story) => <div className="acp-story-status-bar"><Story /></div>],
} satisfies Meta<typeof ConnectionStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Connected: Story = {
  parameters: { acp: { agents: [connectedAgent] } },
};

export const MultipleAgents: Story = {
  parameters: {
    acp: {
      agents: [
        connectedAgent,
        { ...connectedAgent, id: 'review-agent', name: 'Review Agent', status: 'connecting' },
        { ...connectedAgent, id: 'offline-agent', name: 'Offline Agent', status: 'error' },
      ],
    },
  },
};

export const Disconnected: Story = { parameters: { acp: {} } };
