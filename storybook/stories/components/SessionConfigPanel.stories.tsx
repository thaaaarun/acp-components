import type { Meta, StoryObj } from '@storybook/react-vite';
import { SessionConfigPanel } from '@acp-components/react';
import { STORY_SESSION_ID, configOptions, conversationSeed } from '../../support/fixtures';

const meta = {
  title: 'Layer 2 - Store Driven/Components/Session Config Panel',
  component: SessionConfigPanel,
  tags: ['autodocs'],
  parameters: {
    frame: 'centered',
    acp: conversationSeed,
  },
  decorators: [(Story) => <div className="acp-story-config-bar"><Story /></div>],
  args: { sessionId: STORY_SESSION_ID },
} satisfies Meta<typeof SessionConfigPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Configured: Story = {};
export const BooleanOnly: Story = {
  parameters: {
    acp: {
      ...conversationSeed,
      sessions: {
        [STORY_SESSION_ID]: { configOptions: [configOptions[1]] },
      },
    },
  },
};
export const NoOptions: Story = {
  parameters: {
    acp: {
      ...conversationSeed,
      sessions: { [STORY_SESSION_ID]: { configOptions: [] } },
    },
  },
};
