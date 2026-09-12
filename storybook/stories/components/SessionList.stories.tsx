import type { Meta, StoryObj } from '@storybook/react-vite';
import { SessionList } from '@acp-components/react';
import { permissionRequest, STORY_SESSION_ID, conversationSeed } from '../../support/fixtures';

const meta = {
  title: 'Layer 2 - Store Driven/Components/Session List',
  component: SessionList,
  tags: ['autodocs'],
  parameters: {
    frame: 'padded',
    layout: 'fullscreen',
    // Inline Docs stories share the module-level Zustand stores, so the Empty
    // story would clear the fixtures used by every SessionList on the page.
    docs: { story: { inline: false, height: '680px' } },
  },
  decorators: [(Story) => <div className="acp-story-sidebar-panel acp-story-sidebar-panel--tall"><Story /></div>],
} satisfies Meta<typeof SessionList>;

export default meta;
type Story = StoryObj;

export const Sessions: Story = {
  parameters: { acp: conversationSeed },
};
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
