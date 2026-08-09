import type { Meta, StoryObj } from '@storybook/react-vite';
import { AcpProvider } from '@acp-components/react';

const meta = {
  title: 'Providers/Acp Provider',
  component: AcpProvider,
  tags: ['autodocs'],
  parameters: { frame: 'centered' },
  args: {
    agents: [],
    children: <div className="acp-story-trigger">ACP context child</div>,
  },
} satisfies Meta<typeof AcpProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
