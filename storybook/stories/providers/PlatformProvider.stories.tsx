import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlatformProvider } from '@acp-components/react';
import { createMockPlatform } from '../../support/createMockPlatform';

const meta = {
  title: 'Providers/Platform Provider',
  component: PlatformProvider,
  tags: ['autodocs'],
  parameters: { frame: 'centered' },
  args: {
    platform: createMockPlatform(),
    children: <div className="acp-story-trigger">Platform context child</div>,
  },
} satisfies Meta<typeof PlatformProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WebPlatform: Story = {};
