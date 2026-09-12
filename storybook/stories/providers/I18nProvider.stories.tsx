import type { Meta, StoryObj } from '@storybook/react-vite';
import { I18nProvider, useI18n } from '@acp-components/react';

function LocalizedChild() {
  const { t } = useI18n();
  return <div className="acp-story-trigger">{t('settingsView.title')}</div>;
}

const meta = {
  title: 'Layer 1 - Props & Context/Providers/I18n Provider',
  component: I18nProvider,
  tags: ['autodocs'],
  parameters: { frame: 'centered' },
  args: {
    defaultLocale: 'en-US',
    children: <LocalizedChild />,
  },
} satisfies Meta<typeof I18nProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const English: Story = {};
export const Chinese: Story = {
  args: { defaultLocale: 'zh-CN' },
  globals: { locale: 'zh-CN' },
};
