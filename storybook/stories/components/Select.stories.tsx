import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select, type SelectProps } from '@acp-components/react';

const options = [
  { label: 'Recommended', options: [
    { value: 'gpt-5', label: 'GPT-5' },
    { value: 'gpt-5-mini', label: 'GPT-5 mini' },
  ] },
  { label: 'Other', options: [{ value: 'custom', label: 'Custom model' }] },
];

function ControlledSelect(props: SelectProps) {
  const [value, setValue] = useState(props.value);
  return <Select {...props} value={value} onChange={setValue} />;
}

const meta = {
  title: 'Layer 1 - Props & Context/Components/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: { frame: 'centered' },
  render: (args) => <ControlledSelect {...args} />,
  args: {
    options,
    value: 'gpt-5',
    onChange: () => {},
    'aria-label': 'Model',
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Grouped: Story = {};
export const Placeholder: Story = { args: { value: '', placeholder: 'Choose a model' } };
export const Disabled: Story = { args: { disabled: true } };
export const Borderless: Story = { args: { borderless: true } };
