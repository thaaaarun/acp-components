import type { Meta, StoryObj } from '@storybook/react-vite';
import { CommandPalette } from '@acp-components/react';
import { availableCommands } from '../../support/fixtures';

const meta = {
  title: 'Layer 1 - Props & Context/Components/Command Palette',
  component: CommandPalette,
  tags: ['autodocs'],
  parameters: { frame: 'centered' },
  decorators: [(Story) => <div className="acp-story-command-palette"><Story /></div>],
  args: {
    commands: availableCommands,
    onSelect: () => {},
  },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Trigger: Story = {};

export const InlineOpen: Story = {
  args: {
    inline: true,
    open: true,
    query: '',
    activeIndex: 0,
  },
};

export const NoMatches: Story = {
  args: {
    inline: true,
    open: true,
    query: 'missing-command',
  },
};

export const Disabled: Story = { args: { disabled: true } };
