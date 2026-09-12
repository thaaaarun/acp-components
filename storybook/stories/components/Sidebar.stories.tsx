import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sidebar, type SidebarProps } from '@acp-components/react';
import { conversationSeed } from '../../support/fixtures';

const navItems = [
  { id: 'new-session', label: 'New session' },
  { id: 'skills', label: 'Skills' },
  { id: 'disabled', label: 'Unavailable view', disabled: true },
];

function ControlledSidebar(props: SidebarProps) {
  const [activeView, setActiveView] = useState(props.activeView);
  return <Sidebar {...props} activeView={activeView} onActiveViewChange={setActiveView} />;
}

const meta = {
  title: 'Layer 2 - Store Driven/Components/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  parameters: { frame: 'padded' },
  decorators: [(Story) => <div className="acp-story-sidebar-panel acp-story-sidebar-panel--tall"><Story /></div>],
  render: (args) => <ControlledSidebar {...args} />,
  args: {
    activeView: 'new-session',
    onActiveViewChange: () => {},
    navItems,
    onOpenSettings: () => {},
  },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Navigation: Story = {
  parameters: { acp: conversationSeed },
};
export const SessionListOnly: Story = {
  args: { navItems: [] },
  parameters: { acp: conversationSeed },
};
export const Empty: Story = {
  args: { navItems: [] },
  parameters: { acp: {} },
};
