import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileViewer } from '@acp-components/react';
import { STORY_CWD } from '../../support/fixtures';

const sourcePath = `${STORY_CWD}/packages/react/src/index.ts`;

const meta = {
  title: 'Layer 2 - Store Driven/Components/File Viewer',
  component: FileViewer,
  tags: ['autodocs'],
  parameters: {
    frame: 'fullscreen',
    acp: {
      openFiles: [
        {
          path: sourcePath,
          language: 'typescript',
          loading: false,
          error: null,
          content: [
            "export { AcpApp } from './components/AcpApp';",
            "export { ChatView } from './components/chat-view';",
            "export { FileTree } from './components/file-tree';",
          ].join('\n'),
        },
        {
          path: `${STORY_CWD}/README.md`,
          language: 'markdown',
          loading: false,
          error: null,
          content: '# ACP Components\n\nReact components for Agent Client Protocol hosts.',
        },
      ],
      activeFilePath: sourcePath,
    },
  },
  decorators: [(Story) => <div style={{ height: '100%' }}><Story /></div>],
} satisfies Meta<typeof FileViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TypeScriptFile: Story = {};

export const Loading: Story = {
  parameters: {
    acp: {
      openFiles: [{
        path: sourcePath,
        language: 'typescript',
        content: '',
        loading: true,
        error: null,
      }],
      activeFilePath: sourcePath,
    },
  },
};

export const Error: Story = {
  parameters: {
    acp: {
      openFiles: [{
        path: sourcePath,
        language: 'typescript',
        content: '',
        loading: false,
        error: 'The file is no longer available.',
      }],
      activeFilePath: sourcePath,
    },
  },
};
