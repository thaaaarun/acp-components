import type { Meta, StoryObj } from '@storybook/react-vite';
import { StreamingIndicator } from '@acp-components/react';

const meta = {
  title: 'Layer 1 - Props & Context/Components/Streaming Indicator',
  component: StreamingIndicator,
  tags: ['autodocs'],
  parameters: { frame: 'centered' },
} satisfies Meta<typeof StreamingIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Generating: Story = {};
