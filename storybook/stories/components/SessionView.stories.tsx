import type { Meta, StoryObj } from '@storybook/react-vite';
import { DiffView, SessionView } from '@acp-components/react';
import { STORY_SESSION_ID, conversationSeed } from '../../support/fixtures';

const diffTab = {
  id: 'changes',
  label: 'Changes',
  content: (
    <DiffView diffs={[{
      path: 'storybook/stories/components/SessionView.stories.tsx',
      newText: 'export const Conversation = {}',
    }]} />
  ),
};

const meta = {
  title: 'Layer 2 - Store Driven/Components/Session View',
  component: SessionView,
  tags: ['autodocs'],
  parameters: {
    frame: 'fullscreen',
    acp: conversationSeed,
  },
  args: {
    sessionId: STORY_SESSION_ID,
    tabs: [diffTab],
    showFilesTab: true,
  },
} satisfies Meta<typeof SessionView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ConversationAndFiles: Story = {};
export const CustomPanel: Story = { args: { activeTabId: 'changes' } };
export const PanelClosed: Story = { args: { panelOpen: false } };
export const NoSession: Story = {
  args: { sessionId: null, tabs: [], showFilesTab: false },
  parameters: { acp: {} },
};
