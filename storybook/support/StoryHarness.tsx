import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  acpStore,
  type AcpClient,
  type AgentConfig,
} from '@acp-components/core';
import {
  AcpContext,
  HotkeysProvider,
  I18nProvider,
  PlatformContext,
  useAcpStore,
  type AcpContextValue,
} from '@acp-components/react';
import { SettingsContext } from '../../packages/react/src/context/SettingsContext';
import { createMockAcpClient } from './createMockAcpClient';
import { createMockPlatform } from './createMockPlatform';
import type { StorySeed } from './storeFixtures';

export type StoryFrame = 'padded' | 'centered' | 'fullscreen';

export interface StoryHarnessProps {
  children: ReactNode;
  frame?: StoryFrame;
  locale: string;
  seed?: StorySeed;
  theme: 'dark' | 'light';
}

export function StoryHarness({
  children,
  frame = 'padded',
  locale,
  seed,
  theme: initialTheme,
}: StoryHarnessProps) {
  const [theme, setTheme] = useState(initialTheme);
  const platform = useMemo(() => createMockPlatform(locale), [locale]);
  const agentsMap = useAcpStore((state) => state.agents);
  const clientsRef = useRef(new Map<string, AcpClient>());

  useEffect(() => setTheme(initialTheme), [initialTheme]);
  useEffect(() => {
    document.documentElement.setAttribute('data-acp-theme', theme);
    document.body.setAttribute('data-acp-theme', theme);
  }, [theme]);

  for (const agentId of agentsMap.keys()) {
    if (!clientsRef.current.has(agentId)) {
      clientsRef.current.set(agentId, createMockAcpClient({
        skills: seed?.skillsByAgent?.[agentId] ?? [],
      }));
    }
  }

  const getClient = useCallback((agentId: string) => clientsRef.current.get(agentId) ?? null, []);
  const addAgent = useCallback(async (config: AgentConfig) => {
    clientsRef.current.set(config.id, createMockAcpClient());
    acpStore.getState().addAgent({
      id: config.id,
      name: config.name,
      status: 'connected',
      agentInfo: null,
      capabilities: null,
      authMethods: [],
    });
  }, []);
  const removeAgent = useCallback(async (agentId: string) => {
    clientsRef.current.delete(agentId);
    acpStore.getState().removeAgent(agentId);
  }, []);

  const agents = useMemo(() => Array.from(agentsMap.values()), [agentsMap]);
  const acpValue = useMemo<AcpContextValue>(() => ({
    getClient,
    agents,
    addAgent,
    removeAgent,
    builtinAgentIds: new Set(seed?.agents?.map((agent) => agent.id) ?? []),
    isReady: true,
  }), [addAgent, agents, getClient, removeAgent, seed?.agents]);

  return (
    <PlatformContext.Provider value={platform}>
      <HotkeysProvider>
        <I18nProvider defaultLocale={locale}>
          <SettingsContext.Provider value={{ theme, setTheme }}>
            <AcpContext.Provider value={acpValue}>
              <div className={`acp-story-frame acp-story-frame--${frame}`} data-acp-theme={theme}>
                {children}
              </div>
            </AcpContext.Provider>
          </SettingsContext.Provider>
        </I18nProvider>
      </HotkeysProvider>
    </PlatformContext.Provider>
  );
}
