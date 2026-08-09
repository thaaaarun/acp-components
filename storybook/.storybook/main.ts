import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

const fromConfig = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const config: StorybookConfig = {
  stories: [
    '../docs/**/*.mdx',
    '../stories/**/*.stories.@(ts|tsx)',
  ],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  async viteFinal(baseConfig) {
    return mergeConfig(baseConfig, {
      resolve: {
        alias: {
          '@acp-components/core': fromConfig('../../packages/core/src/index.ts'),
          '@acp-components/react': fromConfig('../../packages/react/src/index.ts'),
        },
        dedupe: ['react', 'react-dom'],
      },
      css: {
        modules: {
          localsConvention: 'camelCaseOnly',
        },
      },
      worker: {
        format: 'es',
      },
      optimizeDeps: {
        exclude: ['monaco-editor'],
      },
    });
  },
};

export default config;
