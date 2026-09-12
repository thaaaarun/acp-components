import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThoughtView, type ThoughtViewProps } from '@acp-components/react';

const thought = [{
  type: 'text' as const,
  text: 'The package entry point defines the public component contract, so stories should follow those exports.',
  annotations: null,
  _meta: null,
}];

function ControlledThought(props: ThoughtViewProps) {
  const [expanded, setExpanded] = useState(props.expanded);
  return <ThoughtView {...props} expanded={expanded} onExpandedChange={setExpanded} />;
}

const meta = {
  title: 'Layer 1 - Props & Context/Components/Thought View',
  component: ThoughtView,
  tags: ['autodocs'],
  parameters: { frame: 'padded' },
  decorators: [(Story) => <div className="acp-story-component"><Story /></div>],
  render: (args) => <ControlledThought {...args} />,
  args: {
    thought,
    isStreaming: false,
    expanded: true,
    onExpandedChange: () => {},
  },
} satisfies Meta<typeof ThoughtView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Expanded: Story = {};
export const Collapsed: Story = { args: { expanded: false } };
export const Streaming: Story = { args: { isStreaming: true } };
export const StreamingWithoutContent: Story = { args: { thought: [], isStreaming: true } };
