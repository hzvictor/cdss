import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { config } from "dotenv";
import {
  chat as chatTable,
  message as messageTable,
  user as userTable,
} from "@/lib/db/schema";
import { generateUUID } from "@/lib/utils";

config({ path: ".env.local" });

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (_db) return _db;
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "POSTGRES_URL not set — required for chat-seed e2e tests"
    );
  }
  _client = postgres(url, { max: 1 });
  _db = drizzle(_client);
  return _db;
}

export async function getUserIdByEmail(email: string): Promise<string> {
  const db = getDb();
  const [row] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);
  if (!row) {
    throw new Error(`user not found: ${email}`);
  }
  return row.id;
}

type AssessmentBundle = {
  assessment: Record<string, unknown>;
  advice: Record<string, unknown>[];
  evidence: Record<string, unknown>[];
  totalRulesChecked: number;
};

/**
 * Seed a chat row + a user message + an assistant message whose `parts`
 * include a `tool-assessSideEffect` part in `output-available` state. This
 * exercises the chat → AssessmentCard render path in `components/chat/
 * message.tsx:225-249` without hitting a live LLM.
 *
 * Returns the chat id you can `goto(/chat/{id})`.
 */
export async function seedChatWithToolResult(
  userId: string,
  inputText: string,
  bundle: AssessmentBundle
): Promise<string> {
  const db = getDb();
  const chatId = generateUUID();
  const userMessageId = generateUUID();
  const assistantMessageId = generateUUID();
  const toolCallId = generateUUID();

  await db.insert(chatTable).values({
    id: chatId,
    userId,
    title: inputText.slice(0, 40),
    visibility: "private",
    createdAt: new Date(),
  });

  await db.insert(messageTable).values([
    {
      id: userMessageId,
      chatId,
      role: "user",
      parts: [{ type: "text", text: inputText }],
      attachments: [],
      createdAt: new Date(Date.now() - 1000),
    },
    {
      id: assistantMessageId,
      chatId,
      role: "assistant",
      parts: [
        {
          type: "tool-assessSideEffect",
          toolCallId,
          state: "output-available",
          input: { description: inputText },
          output: bundle,
        },
      ],
      attachments: [],
      createdAt: new Date(),
    },
  ]);

  return chatId;
}

export async function disposeDb(): Promise<void> {
  if (_client) {
    await _client.end({ timeout: 1 });
    _client = null;
    _db = null;
  }
}
