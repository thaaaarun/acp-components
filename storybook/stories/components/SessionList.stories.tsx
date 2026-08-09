import type { Meta, StoryObj } from '@storybook/react-vite';
import { SessionList } from '@acp-components/react';
import { permissionRequest, STORY_SESSION_ID, conversationSeed } from '../../support/fixtures';

const meta = {
  title: 'Components/Session List',
  component: SessionList,
  tags: ['autodocs'],
  parameters: {
    frame: 'padded',
    acp: conversationSeed,
  },
  decorators: [(Story) => <div className="acp-story-sidebar-panel acp-story-sidebar-panel--tall"><Story /></div>],
} satisfies Meta<typeof SessionList>;

export default meta;
type Story = StoryObj;

export const Sessions: Story = {};
export const NeedsAttention: Story = {
  parameters: {
    acp: {
      ...conversationSeed,
      sessions: {
        [STORY_SESSION_ID]: { permissions: [permissionRequest] },
      },
    },
  },
};
export const Empty: Story = { parameters: { acp: {} } };
