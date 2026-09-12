import type { Meta, StoryObj } from '@storybook/react-vite';
import { WorkbenchShell } from '@acp-components/react';
import { conversationSeed } from '../../support/fixtures';

const meta = {
  title: 'Layer 3 - Pages & Patterns/Pages/Workbench Shell',
  component: WorkbenchShell,
  tags: ['autodocs'],
  parameters: {
    frame: 'fullscreen',
    acp: conversationSeed,
    a11y: {
      config: {
        rules: [
          // Workbench intentionally contains multiple application landmarks.
          { id: 'landmark-unique', enabled: false },
        ],
      },
    },
  },
} satisfies Meta<typeof WorkbenchShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Application: Story = {};
