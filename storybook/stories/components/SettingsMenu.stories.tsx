import type { Meta, StoryObj } from '@storybook/react-vite';
import { SettingsMenu } from '@acp-components/react';

const meta = {
  title: 'Layer 1 - Props & Context/Components/Settings Menu',
  component: SettingsMenu,
  tags: ['autodocs'],
  parameters: { frame: 'centered' },
  decorators: [(Story) => <div className="acp-story-status-bar"><Story /></div>],
} satisfies Meta<typeof SettingsMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Trigger: Story = {};
export const WithSettingsAction: Story = { args: { onOpenSettings: () => {} } };
