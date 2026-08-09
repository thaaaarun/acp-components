import type { Platform, PlatformStorage } from '@acp-components/react';

function createMemoryStorage(values: Map<string, string>): PlatformStorage {
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
    removeItem: async (key) => {
      values.delete(key);
    },
    getItemSync: (key) => values.get(key) ?? null,
  };
}

export function createMockPlatform(locale = 'en-US'): Platform {
  const namespaces = new Map<string, PlatformStorage>();

  const storage = (name = '') => {
    let instance = namespaces.get(name);
    if (!instance) {
      instance = createMemoryStorage(new Map());
      namespaces.set(name, instance);
    }
    return instance;
  };

  return {
    platform: 'web',
    os: 'windows',
    storage,
    fs: {
      readDirectory: async () => [],
      readFileContent: async (path) => `// Mock content for ${path}\n`,
    },
    dialogs: {
      openLink: () => {},
      openFilePicker: async () => '/workspace/acp-components',
      notify: async () => {},
    },
    clipboard: {
      writeText: async () => {},
      readText: async () => '',
    },
    system: {
      getLocale: () => locale,
    },
  };
}
