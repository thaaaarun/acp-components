import { describe, expect, it } from 'vitest';
import type { ContentBlock } from '@agentclientprotocol/sdk';
import { toLegacyConfigOptions, toV2Content, toV2McpServers } from './adapter';

describe('v2 adapter normalization', () => {
  it('preserves protocol content blocks when sending a prompt', () => {
    const blocks: ContentBlock[] = [
      { type: 'text', text: 'hello', _meta: { source: 'test' }, annotations: null },
      { type: 'resource_link', name: 'file', uri: 'file:///tmp/file', _meta: null, annotations: null },
    ];

    expect(toV2Content(blocks)).toEqual(blocks);
  });

  it('adds the v2 stdio discriminator and converts legacy env maps', () => {
    expect(toV2McpServers([{
      name: 'local',
      command: '/bin/mcp',
      args: ['serve'],
      env: { TOKEN: 'secret' },
    }])).toEqual([{
      type: 'stdio',
      name: 'local',
      command: '/bin/mcp',
      args: ['serve'],
      env: [{ name: 'TOKEN', value: 'secret' }],
    }]);
  });

  it('rejects removed SSE and malformed known MCP transports', () => {
    expect(() => toV2McpServers([{ type: 'sse', name: 'old', url: 'http://x', headers: [] }])).toThrow(/SSE/);
    expect(() => toV2McpServers([{ type: 'http', name: 'broken' }])).toThrow(/name and url/);
  });

  it('preserves unknown MCP variants for forward compatibility', () => {
    const custom = { type: '_custom', endpoint: 'opaque' };
    expect(toV2McpServers([custom])).toEqual([custom]);
  });

  it('projects v2 config and group ids into the legacy UI shape', () => {
    expect(toLegacyConfigOptions([{
      configId: 'model',
      type: 'select',
      name: 'Model',
      currentValue: 'fast',
      options: [{ groupId: 'speed', name: 'Speed', options: [] }],
    }])).toEqual([{
      id: 'model',
      type: 'select',
      name: 'Model',
      currentValue: 'fast',
      options: [{ group: 'speed', name: 'Speed', options: [] }],
    }]);
  });
});
