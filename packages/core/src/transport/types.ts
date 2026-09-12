import type { AcpWireStream } from '../protocol';

export interface AcpTransport {
  connect(): Promise<AcpWireStream>;
  disconnect(): void;
  onClose?: (handler: () => void) => () => void;
  onError?: (handler: (err: Error) => void) => () => void;
}

export type { AcpWireStream };
