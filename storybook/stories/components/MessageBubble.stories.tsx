import type { Meta, StoryObj } from '@storybook/react-vite';
import { MessageBubble } from '@acp-components/react';
import { conversationMessages } from '../../support/fixtures';

const agentMessages = conversationMessages.filter((message) => message.role === 'agent');

const meta = {
  title: 'Components/Message Bubble',
  component: MessageBubble,
  tags: ['autodocs'],
  parameters: { frame: 'padded' },
  decorators: [(Story) => <div className="acp-story-component"><Story /></div>],
  args: {
    sessionId: null,
    messages: agentMessages,
  },
} satisfies Meta<typeof MessageBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AgentResponse: Story = {};
export const Streaming: Story = { args: { isStreaming: true } };
export const Empty: Story = { args: { messages: [] } };
