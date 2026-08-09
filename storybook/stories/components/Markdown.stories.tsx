import type { Meta, StoryObj } from '@storybook/react-vite';
import { Markdown } from '@acp-components/react';

const content = `# ACP response

Storybook renders **the same Markdown component** used by agent messages.

- GitHub-flavored lists
- [External links](https://agentclientprotocol.com/)
- Tables and fenced code

| Package | Responsibility |
| --- | --- |
| \`core\` | ACP state and transports |
| \`react\` | Components and hooks |

\`\`\`tsx
import { ChatView } from '@acp-components/react';

export function Session({ id }: { id: string }) {
  return <ChatView sessionId={id} />;
}
\`\`\`
`;

const meta = {
  title: 'Components/Markdown',
  component: Markdown,
  tags: ['autodocs'],
  parameters: { frame: 'padded' },
  args: { children: content },
  decorators: [(Story) => <div className="acp-story-surface"><Story /></div>],
} satisfies Meta<typeof Markdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RichContent: Story = {};
