import type { Meta, StoryObj } from '@storybook/react-vite';
import { UsageBar } from '@acp-components/react';
import { STORY_SESSION_ID, conversationSeed } from '../../support/fixtures';

const meta = {
  title: 'Layer 2 - Store Driven/Components/Usage Bar',
  component: UsageBar,
  tags: ['autodocs'],
  parameters: { frame: 'centered' },
  decorators: [(Story) => <div className="acp-story-status-bar"><Story /></div>],
  args: { sessionId: STORY_SESSION_ID },
} satisfies Meta<typeof UsageBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {
  parameters: { acp: conversationSeed },
};
export const NearLimit: Story = {
  parameters: {
    acp: {
      ...conversationSeed,
      sessions: {
        [STORY_SESSION_ID]: { usage: { size: 128_000, used: 113_000 } },
      },
    },
  },
};
export const NoUsage: Story = {
  parameters: {
    acp: {
      ...conversationSeed,
      sessions: { [STORY_SESSION_ID]: {} },
    },
  },
};
