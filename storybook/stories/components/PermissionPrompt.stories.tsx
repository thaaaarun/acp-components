import type { Meta, StoryObj } from '@storybook/react-vite';
import { PermissionPrompt } from '@acp-components/react';
import {
  STORY_SESSION_ID,
  conversationSeed,
  permissionRequest,
} from '../../support/fixtures';

const meta = {
  title: 'Components/Permission Prompt',
  component: PermissionPrompt,
  tags: ['autodocs'],
  parameters: {
    frame: 'centered',
    acp: {
      ...conversationSeed,
      sessions: {
        [STORY_SESSION_ID]: { permissions: [permissionRequest] },
      },
    },
  },
  args: { sessionId: STORY_SESSION_ID },
} satisfies Meta<typeof PermissionPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ApprovalRequired: Story = {};
export const NoPendingRequest: Story = {
  parameters: { acp: conversationSeed },
};
