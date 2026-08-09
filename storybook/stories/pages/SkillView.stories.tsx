import type { Meta, StoryObj } from '@storybook/react-vite';
import { SkillView } from '@acp-components/react';
import { conversationSeed } from '../../support/fixtures';

const meta = {
  title: 'Pages/Skill View',
  component: SkillView,
  tags: ['autodocs'],
  parameters: {
    frame: 'fullscreen',
    acp: conversationSeed,
  },
} satisfies Meta<typeof SkillView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Catalog: Story = {};

export const Empty: Story = {
  parameters: { acp: {} },
};
