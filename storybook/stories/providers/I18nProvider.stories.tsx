import type { Meta, StoryObj } from '@storybook/react-vite';
import { I18nProvider } from '@acp-components/react';

const meta = {
  title: 'Providers/I18n Provider',
  component: I18nProvider,
  tags: ['autodocs'],
  parameters: { frame: 'centered' },
  args: {
    defaultLocale: 'en-US',
    children: <div className="acp-story-trigger">Localized child</div>,
  },
} satisfies Meta<typeof I18nProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const English: Story = {};
export const Chinese: Story = { args: { defaultLocale: 'zh-CN' } };
