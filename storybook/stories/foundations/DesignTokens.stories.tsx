import type { Meta, StoryObj } from '@storybook/react-vite';

const groups = [
  {
    title: 'Surfaces',
    tokens: [
      ['Primary', '--acp-color-bg-primary'],
      ['Secondary', '--acp-color-bg-secondary'],
      ['Tertiary', '--acp-color-bg-tertiary'],
      ['Hover', '--acp-color-bg-hover'],
    ],
  },
  {
    title: 'Semantic',
    tokens: [
      ['Accent', '--acp-color-accent'],
      ['Success', '--acp-color-success'],
      ['Warning', '--acp-color-warning'],
      ['Error', '--acp-color-error'],
    ],
  },
  {
    title: 'Text',
    tokens: [
      ['Primary', '--acp-color-text-primary'],
      ['Secondary', '--acp-color-text-secondary'],
      ['Muted', '--acp-color-text-muted'],
      ['Link', '--acp-color-accent-text'],
    ],
  },
];

function DesignTokens() {
  return (
    <div className="acp-story-surface">
      <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Theme tokens</h2>
      <p style={{ margin: '0 0 28px', color: 'var(--acp-color-text-secondary)' }}>
        Components consume role-based custom properties. Switch the toolbar theme to inspect both contracts.
      </p>
      <div style={{ display: 'grid', gap: 28 }}>
        {groups.map((group) => (
          <section key={group.title}>
            <h3 style={{ margin: '0 0 12px', fontSize: 13 }}>{group.title}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
              {group.tokens.map(([label, token]) => (
                <div key={token} style={{ border: '1px solid var(--acp-color-border-subtle)', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ height: 64, background: `var(${token})` }} />
                  <div style={{ padding: 10, background: 'var(--acp-color-bg-secondary)' }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
                    <code style={{ fontSize: 10, color: 'var(--acp-color-text-muted)' }}>{token}</code>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

const meta = {
  title: 'Foundations/Design Tokens',
  component: DesignTokens,
  parameters: { frame: 'padded' },
} satisfies Meta<typeof DesignTokens>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Palette: Story = {};
