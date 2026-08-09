import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlanView } from '@acp-components/react';
import { activePlan } from '../../support/fixtures';

const meta = {
  title: 'Components/Plan View',
  component: PlanView,
  tags: ['autodocs'],
  parameters: { frame: 'padded' },
  decorators: [(Story) => <div className="acp-story-component"><Story /></div>],
  args: { entries: activePlan, isStreaming: true },
} satisfies Meta<typeof PlanView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InProgress: Story = {};
export const Completed: Story = {
  args: {
    isStreaming: false,
    entries: activePlan.map((entry) => ({ ...entry, status: 'completed' as const })),
  },
};
export const Empty: Story = { args: { entries: [], isStreaming: false } };
