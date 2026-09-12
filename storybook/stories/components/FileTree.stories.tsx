import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileTree, type FileTreeNode, type FileTreeProps } from '@acp-components/react';
import { sampleFileTree } from '../../support/fixtures';

function InteractiveTree(props: FileTreeProps) {
  const [files, setFiles] = useState(props.files);
  const update = (nodes: FileTreeNode[], path: string, expanded: boolean): FileTreeNode[] =>
    nodes.map((node) => node.path === path
      ? { ...node, expanded }
      : { ...node, children: node.children ? update(node.children, path, expanded) : undefined });
  return (
    <FileTree
      {...props}
      files={files}
      onExpand={(path) => setFiles((current) => update(current, path, true))}
      onCollapse={(path) => setFiles((current) => update(current, path, false))}
    />
  );
}

const meta = {
  title: 'Layer 1 - Props & Context/Components/File Tree',
  component: FileTree,
  tags: ['autodocs'],
  parameters: { frame: 'padded' },
  args: { files: sampleFileTree },
  decorators: [(Story) => <div className="acp-story-sidebar-panel"><Story /></div>],
  render: (args) => <InteractiveTree {...args} />,
} satisfies Meta<typeof FileTree>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ProjectFiles: Story = {};
export const Empty: Story = { args: { files: [] } };
