import React from 'react';
import {
  FileTextOutlined,
  EditOutlined,
  DeleteOutlined,
  InboxOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  GlobalOutlined,
  SyncOutlined,
  ToolOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { ToolCallState, SessionId } from '@acp-components/core';
import type { ToolCallLocation } from '@acp-components/core';
import { DiffView } from '../diff-view';
import { useSessionTerminals } from '../../hooks/useSession';
import styles from './tool-call.module.scss';

export interface ToolCallCardProps {
  sessionId: SessionId | null;
  toolCall: ToolCallState;
  onNavigate?: (path: string, line?: number | null) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

const statusClass: Record<string, string> = {
  pending: styles.acpToolCallStatusPending,
  in_progress: styles.acpToolCallStatusInProgress,
  completed: styles.acpToolCallStatusCompleted,
  failed: styles.acpToolCallStatusFailed,
};

const kindIcon: Record<string, React.ReactNode> = {
  read: <FileTextOutlined />,
  edit: <EditOutlined />,
  delete: <DeleteOutlined />,
  move: <InboxOutlined />,
  search: <SearchOutlined />,
  execute: <ThunderboltOutlined />,
  think: <BulbOutlined />,
  fetch: <GlobalOutlined />,
  switch_mode: <SyncOutlined />,
};

function LocationChip({ loc, onNavigate }: { loc: ToolCallLocation; onNavigate?: ToolCallCardProps['onNavigate'] }) {
  const basename = loc.path.replace(/\\/g, '/').split('/').pop() || loc.path;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate?.(loc.path, loc.line);
  };

  const content = (
    <>
      <span className={styles.acpToolCallLocationIcon}><FileTextOutlined /></span>
      <span className={styles.acpToolCallLocationPath}>
        {basename}
        {loc.line != null && <span className={styles.acpToolCallLocationLine}>:{loc.line}</span>}
      </span>
    </>
  );

  if (!onNavigate) {
    return (
      <span
        className={`${styles.acpToolCallLocation} ${styles.acpToolCallLocationStatic}`}
        title={`${loc.path}${loc.line != null ? `:${loc.line}` : ''}`}
      >
        {content}
      </span>
    );
  }

  return (
    <span
      className={styles.acpToolCallLocation}
      onClick={handleClick}
      title={`${loc.path}${loc.line != null ? `:${loc.line}` : ''}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onNavigate?.(loc.path, loc.line);
        }
      }}
    >
      {content}
    </span>
  );
}

export const ToolCallCard = React.memo(function ToolCallCard({ sessionId, toolCall, onNavigate, expanded, onExpandedChange }: ToolCallCardProps) {
  const hasContent = toolCall.content && toolCall.content.length > 0;
  const hasLocations = toolCall.locations && toolCall.locations.length > 0;
  const terminals = useSessionTerminals(sessionId);

  return (
    <div className={styles.acpToolCall}>
      <button
        className={styles.acpToolCallHeader}
        onClick={() => onExpandedChange(!expanded)}
        aria-expanded={expanded}
      >
        <span className={`${styles.acpToolCallStatus} ${statusClass[String(toolCall.status)] || ''}`} />
        {toolCall.kind && (
          <span className={styles.acpToolCallKind} title={toolCall.kind}>
            {kindIcon[toolCall.kind] || <ToolOutlined />}
          </span>
        )}
        <span className={styles.acpToolCallName}>{toolCall.title}</span>
        <span className={`${styles.acpToolCallChevron}${expanded ? ` ${styles.acpToolCallChevronOpen}` : ''}`}>
          <RightOutlined />
        </span>
      </button>
      {expanded && hasLocations && (
        <div className={styles.acpToolCallLocations}>
          {toolCall.locations!.map((loc, i) => (
            <LocationChip key={`${loc.path}:${loc.line ?? ''}-${i}`} loc={loc} onNavigate={onNavigate} />
          ))}
        </div>
      )}
      {expanded && hasContent && (
        <div className={styles.acpToolCallBody}>
          {toolCall.content!.map((item, i) => {
            switch (item.type) {
              case 'content': {
                const c = item as unknown as { content: { type: string; text?: string } };
                return <pre key={i} className={styles.acpToolCallContentText}>{c.content.text}</pre>;
              }
              case 'diff': {
                const d = item as unknown as {
                  path?: string;
                  oldText?: string | null;
                  newText?: string;
                  changes?: Array<{ path?: string; oldPath?: string; fileType?: string }>;
                  patch?: { text?: string } | null;
                };
                type DiffItem = {
                  path: string;
                  oldText?: string;
                  newText: string;
                  fileType?: string;
                };
                const changes = d.changes ?? [];
                // Keep the v1 text shape working while accepting the v2
                // structured change/patch shape on the same UI surface.
                const diffItems: DiffItem[] = changes.length > 0
                  ? changes.map((change) => ({
                    path: change.path ?? change.oldPath ?? 'unknown path',
                    newText: '',
                    fileType: change.fileType,
                  }))
                  : d.path
                    ? [{ path: d.path, oldText: d.oldText ?? undefined, newText: d.newText ?? '' }]
                    : [{ path: 'diff', newText: '' }];
                return (
                  <DiffView
                    key={i}
                    diffs={diffItems.map((change, changeIndex) => ({
                      path: change.path,
                      oldText: 'oldText' in change ? change.oldText : undefined,
                      newText: change.newText,
                      // A patch can cover several structured changes; show it
                      // once instead of duplicating the complete patch.
                      patchText: changeIndex === 0 ? d.patch?.text : undefined,
                      fileType: change.fileType,
                    }))}
                  />
                );
              }
              case 'terminal': {
                const terminalId = (item as unknown as { terminalId: string }).terminalId;
                const terminal = terminals.find((entry) => entry.terminalId === terminalId);
                const output = terminal?.outputBytes
                  ? new TextDecoder().decode(terminal.outputBytes)
                  : (terminal?.outputChunks ?? []).join('');
                return (
                  <pre key={i} className={styles.acpToolCallContentText} data-terminal-id={terminalId}>
                    {output}
                  </pre>
                );
              }
              default:
                return null;
            }
          })}
        </div>
      )}
    </div>
  );
});
