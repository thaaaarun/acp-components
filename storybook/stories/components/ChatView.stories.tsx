import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChatView } from '@acp-components/react';
import {
  STORY_SESSION_ID,
  activePlan,
  conversationSeed,
  permissionRequest,
} from '../../support/fixtures';

const meta = {
  title: 'Layer 2 - Store Driven/Components/Chat View',
  component: ChatView,
  tags: ['autodocs'],
  parameters: {
    frame: 'fullscreen',
    acp: conversationSeed,
  },
  args: {
    sessionId: STORY_SESSION_ID,
  },
  decorators: [(Story) => <div style={{ height: '100%' }}><Story /></div>],
} satisfies Meta<typeof ChatView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Conversation: Story = {};

export const StreamingWithPlan: Story = {
  parameters: {
    acp: {
      ...conversationSeed,
      sessions: {
        [STORY_SESSION_ID]: {
          ...conversationSeed.sessions?.[STORY_SESSION_ID],
          isStreaming: true,
          plan: activePlan,
        },
      },
    },
  },
};

export const PermissionRequired: Story = {
  parameters: {
    acp: {
      ...conversationSeed,
      sessions: {
        [STORY_SESSION_ID]: {
          ...conversationSeed.sessions?.[STORY_SESSION_ID],
          permissions: [permissionRequest],
        },
      },
    },
  },
};

export const NoSession: Story = {
  args: { sessionId: null },
  parameters: { acp: {} },
};
