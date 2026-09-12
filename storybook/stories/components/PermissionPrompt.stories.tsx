import type { Meta, StoryObj } from '@storybook/react-vite';
import { PermissionPrompt } from '@acp-components/react';
import {
  STORY_SESSION_ID,
  conversationSeed,
  permissionRequest,
} from '../../support/fixtures';

const meta = {
  title: 'Layer 2 - Store Driven/Components/Permission Prompt',
  component: PermissionPrompt,
  tags: ['autodocs'],
  parameters: { frame: 'centered' },
  args: { sessionId: STORY_SESSION_ID },
} satisfies Meta<typeof PermissionPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ApprovalRequired: Story = {
  parameters: {
    acp: {
      ...conversationSeed,
      sessions: {
        [STORY_SESSION_ID]: { permissions: [permissionRequest] },
      },
    },
  },
};
export const NoPendingRequest: Story = {
  parameters: { acp: conversationSeed },
};
