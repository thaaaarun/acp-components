import type { Meta, StoryObj } from '@storybook/react-vite';
import { DiffView } from '@acp-components/react';

const meta = {
  title: 'Layer 1 - Props & Context/Components/Diff View',
  component: DiffView,
  tags: ['autodocs'],
  parameters: { frame: 'padded' },
  decorators: [(Story) => <div className="acp-story-diff"><Story /></div>],
  args: {
    diffs: [{
      path: 'packages/react/package.json',
      oldText: '"node": ">=18"',
      newText: '"node": ">=20"',
    }],
  },
} satisfies Meta<typeof DiffView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ChangedFile: Story = {};
export const NewFile: Story = {
  args: { diffs: [{ path: 'storybook/package.json', newText: '"private": true' }] },
};
export const Empty: Story = { args: { diffs: [] } };
