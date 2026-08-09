import type { Meta, StoryObj } from '@storybook/react-vite';
import { Workbench } from '@acp-components/react';

const meta = {
  title: 'Pages/Workbench',
  component: Workbench,
  tags: ['autodocs'],
  parameters: { frame: 'fullscreen' },
  args: {
    sidebar: <div className="acp-story-workbench-region">Sidebar content</div>,
    main: <div className="acp-story-workbench-region">Main content</div>,
  },
} satisfies Meta<typeof Workbench>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoPaneLayout: Story = {};
export const NarrowSidebar: Story = { args: { sidebarWidth: 180 } };
