import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  SETTINGS_SECTION_AGENTS,
  SETTINGS_SECTION_APPEARANCE,
  SettingsView,
} from '@acp-components/react';
import { conversationSeed } from '../../support/fixtures';

const meta = {
  title: 'Pages/Settings View',
  component: SettingsView,
  tags: ['autodocs'],
  parameters: {
    frame: 'fullscreen',
    acp: conversationSeed,
  },
} satisfies Meta<typeof SettingsView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Appearance: Story = {
  args: { activeSection: SETTINGS_SECTION_APPEARANCE },
};

export const Agents: Story = {
  args: { activeSection: SETTINGS_SECTION_AGENTS },
};

export const KeyboardShortcuts: Story = {
  args: { activeSection: 'shortcuts' },
};
