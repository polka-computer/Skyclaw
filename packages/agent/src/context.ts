/**
 * Conversation Context Manager — maintains recent turn history per user.
 *
 * In-memory for POC. Could be backed by DS or SQLite later.
 */

interface ConversationTurn {
  userMessage: string;
  assistantResponse: string;
  timestamp: number;
}

const MAX_TURNS = 10;

const conversations = new Map<string, ConversationTurn[]>();

export class ContextManager {
  addTurn(
    userId: string,
    userMessage: string,
    assistantResponse: string,
  ): void {
    if (!conversations.has(userId)) {
      conversations.set(userId, []);
    }

    const history = conversations.get(userId)!;
    history.push({ userMessage, assistantResponse, timestamp: Date.now() });

    if (history.length > MAX_TURNS) {
      history.shift();
    }
  }

  getHistory(userId: string): ConversationTurn[] {
    return conversations.get(userId) ?? [];
  }

  formatHistory(userId: string): string {
    const history = this.getHistory(userId);
    if (history.length === 0) return "";

    const formatted = history
      .map(
        (turn, i) =>
          `### Turn ${i + 1}\nUser: ${turn.userMessage}\nAssistant: ${turn.assistantResponse}`,
      )
      .join("\n\n");

    return `## Recent Conversation History\n\n${formatted}`;
  }

  clearHistory(userId: string): void {
    conversations.delete(userId);
  }
}

let instance: ContextManager | null = null;

export function getContextManager(): ContextManager {
  if (!instance) {
    instance = new ContextManager();
  }
  return instance;
}
