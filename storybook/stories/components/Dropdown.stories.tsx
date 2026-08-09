import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dropdown } from '@acp-components/react';

function DropdownExample() {
  return (
    <Dropdown placement="bottom-start">
      <Dropdown.Trigger asChild>
        <button className="acp-story-trigger">Open menu</button>
      </Dropdown.Trigger>
      <Dropdown.Content>
        <Dropdown.Section label="Session">
          <Dropdown.Item label="Rename" value="F2" />
          <Dropdown.Item label="Duplicate" />
          <Dropdown.Item label="Delete" disabled />
        </Dropdown.Section>
        <Dropdown.Submenu label="Move to workspace">
          <Dropdown.SubmenuItem label="acp-components" active />
          <Dropdown.SubmenuItem label="design-system" />
        </Dropdown.Submenu>
      </Dropdown.Content>
    </Dropdown>
  );
}

const meta = {
  title: 'Components/Dropdown',
  component: Dropdown,
  tags: ['autodocs'],
  parameters: { frame: 'centered' },
  render: () => <DropdownExample />,
  args: { children: null },
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Menu: Story = {};
