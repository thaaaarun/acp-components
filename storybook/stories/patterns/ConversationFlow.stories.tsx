import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChatView, ConnectionStatus } from '@acp-components/react';
import { STORY_SESSION_ID, conversationSeed } from '../../support/fixtures';

function ConversationFlow() {
  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateRows: '36px minmax(0, 1fr)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 16px', borderBottom: '1px solid var(--acp-color-border-subtle)' }}>
        <ConnectionStatus />
      </header>
      <ChatView sessionId={STORY_SESSION_ID} />
    </div>
  );
}

const meta = {
  title: 'Patterns/Conversation Flow',
  component: ConversationFlow,
  parameters: { frame: 'fullscreen', acp: conversationSeed },
} satisfies Meta<typeof ConversationFlow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadyConversation: Story = {};
