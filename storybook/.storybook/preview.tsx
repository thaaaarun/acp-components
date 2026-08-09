import type { Preview } from '@storybook/react-vite';
import '../../packages/react/src/styles.css';
import './monaco';
import './preview.scss';
import { StoryHarness, type StoryFrame } from '../support/StoryHarness';
import {
  resetStoryStores,
  seedStoryStores,
  type StorySeed,
} from '../support/storeFixtures';

interface StoryParameters {
  acp?: StorySeed;
  frame?: StoryFrame;
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'ACP component theme',
      toolbar: {
        icon: 'contrast',
        items: [
          { value: 'dark', title: 'Dark' },
          { value: 'light', title: 'Light' },
        ],
      },
    },
    locale: {
      description: 'Documentation locale',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'en-US', title: 'English' },
          { value: 'zh-CN', title: 'Chinese' },
        ],
      },
    },
  },
  initialGlobals: {
    theme: 'dark',
    locale: 'en-US',
  },
  loaders: [({ parameters }) => {
    const storyParameters = parameters as StoryParameters;
    resetStoryStores();
    seedStoryStores(storyParameters.acp);
    return {};
  }],
  decorators: [
    (Story, context) => {
      const parameters = context.parameters as StoryParameters;
      return (
        <StoryHarness
          key={context.id}
          frame={parameters.frame}
          locale={String(context.globals.locale ?? 'en-US')}
          seed={parameters.acp}
          theme={context.globals.theme === 'light' ? 'light' : 'dark'}
        >
          <Story />
        </StoryHarness>
      );
    },
  ],
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: ['Introduction', 'Foundations', 'Components', 'Providers', 'Patterns', 'Pages'],
      },
    },
    viewport: {
      options: {
        mobile: {
          name: 'Mobile (375px)',
          styles: { width: '375px', height: '812px' },
          type: 'mobile',
        },
        tablet: {
          name: 'Tablet (768px)',
          styles: { width: '768px', height: '1024px' },
          type: 'tablet',
        },
        desktop: {
          name: 'Desktop (1024px)',
          styles: { width: '1024px', height: '768px' },
          type: 'desktop',
        },
        wide: {
          name: 'Wide (1440px)',
          styles: { width: '1440px', height: '900px' },
          type: 'desktop',
        },
      },
    },
  },
};

export default preview;
