import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChatComposer, type ChatComposerProps } from '@acp-components/react';
import { availableCommands } from '../../support/fixtures';

function ComposerExample(props: ChatComposerProps) {
  const [value, setValue] = useState(props.value);
  return <ChatComposer {...props} value={value} onChange={setValue} onSend={() => setValue('')} />;
}

const meta = {
  title: 'Layer 1 - Props & Context/Components/Chat Composer',
  component: ChatComposer,
  tags: ['autodocs'],
  parameters: { frame: 'centered' },
  decorators: [(Story) => <div className="acp-story-composer"><Story /></div>],
  render: (args) => <ComposerExample {...args} />,
  args: {
    value: '',
    onChange: () => {},
    onSend: () => {},
    isStreaming: false,
    availableCommands,
    placeholder: 'Ask the agent to make a change',
  },
} satisfies Meta<typeof ChatComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
export const WithDraft: Story = { args: { value: 'Document the public components' } };
export const Streaming: Story = { args: { isStreaming: true } };
export const Disabled: Story = { args: { disabled: true } };
