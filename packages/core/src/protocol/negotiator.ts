import type { ClientCapabilities, Implementation } from '@agentclientprotocol/sdk';
import { V1Adapter } from './v1/adapter';
import { V2Adapter } from './v2/adapter';
import type { AcpProtocolVersion, NormalizedInitializeResult, PermissionHandler, ProtocolAdapter, SessionUpdateHandler } from './types';
import type { AcpWireStream } from './types';

export interface ProtocolNegotiatorOptions {
  createStream: () => Promise<AcpWireStream>;
  onSessionUpdate: SessionUpdateHandler;
  onPermission: PermissionHandler;
  onClose?: () => void;
}

function isProtocolMismatch(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return /(?:protocol\s+version|version\s+\d+.*(?:support|accept)|unsupported\s+protocol|invalid\s+protocol|unknown\s+protocol)/i.test(message);
}

export class ProtocolNegotiator {
  private readonly options: ProtocolNegotiatorOptions;
  private adapter: ProtocolAdapter | null = null;
  private stream: AcpWireStream | null = null;
  private suppressClose = false;

  constructor(options: ProtocolNegotiatorOptions) {
    this.options = options;
  }

  get version(): AcpProtocolVersion | null {
    return this.adapter?.version ?? null;
  }

  get signal(): AbortSignal | undefined {
    return this.adapter?.signal;
  }

  async connect(): Promise<void> {
    this.stream = await this.options.createStream();
    this.setAdapter(new V1Adapter({
      stream: this.stream as never,
      onSessionUpdate: this.options.onSessionUpdate,
      onPermission: this.options.onPermission,
    }));
  }

  private setAdapter(adapter: ProtocolAdapter): void {
    this.adapter = adapter;
    adapter.signal.addEventListener('abort', () => {
      if (!this.suppressClose && this.adapter === adapter) this.options.onClose?.();
    }, { once: true });
  }

  async initialize(clientInfo?: Implementation, clientCapabilities?: ClientCapabilities): Promise<NormalizedInitializeResult> {
    if (!this.adapter) throw new Error('Not connected');
    try {
      return await this.adapter.initialize(clientInfo, clientCapabilities);
    } catch (error) {
      if (!isProtocolMismatch(error)) throw error;
      this.suppressClose = true;
      this.adapter.close();
      this.stream = await this.options.createStream();
      this.setAdapter(new V2Adapter({
        stream: this.stream as never,
        onSessionUpdate: this.options.onSessionUpdate,
        onPermission: this.options.onPermission,
      }));
      this.suppressClose = false;
      return this.adapter.initialize(clientInfo, clientCapabilities);
    }
  }

  get current(): ProtocolAdapter {
    if (!this.adapter) throw new Error('Not connected');
    return this.adapter;
  }

  close(): void {
    this.suppressClose = false;
    this.adapter?.close();
    this.adapter = null;
    this.stream = null;
  }
}
