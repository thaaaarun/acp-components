import {
  AcpClient,
  sessionStore,
  type SessionConfigOption,
  type Skill,
} from '@acp-components/core';

export interface MockAcpClientOptions {
  skills?: Skill[];
}

let nextSession = 1;

export function createMockAcpClient({ skills = [] }: MockAcpClientOptions = {}): AcpClient {
  const client = new AcpClient();

  client.newSession = async () => ({
    sessionId: `storybook-session-${nextSession++}`,
    configOptions: null,
  });
  client.forkSession = async () => ({
    sessionId: `storybook-fork-${nextSession++}`,
    configOptions: null,
  });
  client.prompt = async () => ({ stopReason: 'end_turn', usage: null });
  client.cancel = async () => {};
  client.listSessions = async () => ({ sessions: [], nextCursor: null });
  client.loadSession = async () => ({ configOptions: null });
  client.closeSession = async () => ({});
  client.deleteSession = async () => ({});
  client.authenticate = async () => ({});
  client.listSkills = async () => skills;
  client.setSessionConfigOption = async (sessionId, configId, value) => {
    const current = sessionStore.getState().sessions.get(sessionId)?.configOptions ?? [];
    const configOptions = current.map((option): SessionConfigOption =>
      option.id === configId ? { ...option, currentValue: value } as SessionConfigOption : option,
    );
    return { configOptions };
  };

  return client;
}
