import type { Meta, StoryObj } from '@storybook/react-vite';
import { ResizeHandle } from '@acp-components/react';

const meta = {
  title: 'Layer 1 - Props & Context/Components/Resize Handle',
  component: ResizeHandle,
  tags: ['autodocs'],
  parameters: { frame: 'centered' },
  decorators: [(Story) => (
    <div className="acp-story-resize-demo">
      <div className="acp-story-resize-demo__pane">Sidebar</div>
      <Story />
      <div className="acp-story-resize-demo__main">Main content</div>
    </div>
  )],
  args: {
    onPointerDown: () => {},
    onDoubleClick: () => {},
    onKeyDown: () => {},
    'aria-label': 'Resize sidebar',
    'aria-valuenow': 220,
    'aria-valuemin': 180,
    'aria-valuemax': 480,
  },
} satisfies Meta<typeof ResizeHandle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};
export const Resizing: Story = { args: { isResizing: true } };
