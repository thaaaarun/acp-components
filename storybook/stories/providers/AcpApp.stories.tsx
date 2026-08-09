import type { Meta, StoryObj } from '@storybook/react-vite';
import { AcpApp } from '@acp-components/react';
import { createMockPlatform } from '../../support/createMockPlatform';

const meta = {
  title: 'Providers/Acp App',
  component: AcpApp,
  tags: ['autodocs'],
  parameters: { frame: 'centered' },
  args: {
    platform: createMockPlatform(),
    agents: [],
    children: <div className="acp-story-trigger">Application content</div>,
  },
} satisfies Meta<typeof AcpApp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ProviderStack: Story = {};
export const LightTheme: Story = { args: { theme: 'light' } };
