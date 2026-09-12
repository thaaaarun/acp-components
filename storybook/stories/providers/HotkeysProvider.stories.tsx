import type { Meta, StoryObj } from '@storybook/react-vite';
import { HotkeysProvider } from '@acp-components/react';

const meta = {
  title: 'Layer 1 - Props & Context/Providers/Hotkeys Provider',
  component: HotkeysProvider,
  tags: ['autodocs'],
  parameters: { frame: 'centered' },
  args: {
    children: <div className="acp-story-trigger">Hotkey context child</div>,
  },
} satisfies Meta<typeof HotkeysProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
