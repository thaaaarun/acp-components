import { useState } from 'react';
import type { ToolCallState } from '@acp-components/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToolCallCard, type ToolCallCardProps } from '@acp-components/react';
import { completedToolCall } from '../../support/fixtures';

function ControlledToolCall(props: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(props.expanded);
  return <ToolCallCard {...props} expanded={expanded} onExpandedChange={setExpanded} />;
}

const changedFile: ToolCallState = {
  ...completedToolCall,
  title: 'Update Storybook stories',
  kind: 'edit',
  content: [{
    type: 'diff',
    path: 'storybook/stories/components/ToolCallCard.stories.tsx',
    oldText: '',
    newText: 'export const Completed = {}',
  }],
};

const meta = {
  title: 'Layer 1 - Props & Context/Components/Tool Call Card',
  component: ToolCallCard,
  tags: ['autodocs'],
  parameters: { frame: 'padded' },
  decorators: [(Story) => <div className="acp-story-component"><Story /></div>],
  render: (args) => <ControlledToolCall {...args} />,
  args: {
    sessionId: null,
    toolCall: completedToolCall,
    expanded: true,
    onExpandedChange: () => {},
  },
} satisfies Meta<typeof ToolCallCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Completed: Story = {};
export const WithDiff: Story = { args: { toolCall: changedFile } };
export const InProgress: Story = {
  args: { toolCall: { ...completedToolCall, status: 'in_progress', title: 'Read component exports' } },
};
export const Failed: Story = {
  args: { toolCall: { ...completedToolCall, status: 'failed', title: 'Build Storybook' } },
};
export const Collapsed: Story = { args: { expanded: false } };
