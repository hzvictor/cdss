import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  integer,
  json,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
  name: text("name"),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  isAnonymous: boolean("isAnonymous").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
  })
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.createdAt] }),
  })
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

// ============================================================
// CDSS — 乳腺癌副作用评估智能体
// ============================================================

const RISK_LEVELS = ["high", "medium", "low"] as const;

export const assessment = pgTable("Assessment", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  inputText: text("inputText").notNull(),
  riskLevel: varchar("riskLevel", { enum: RISK_LEVELS }).notNull(),
  summary: text("summary").notNull(),
  shouldContactTeam: boolean("shouldContactTeam").notNull(),
  ruleVersion: varchar("ruleVersion", { length: 16 }).notNull(),
  modelId: varchar("modelId", { length: 64 }).notNull(),
  modelVersion: varchar("modelVersion", { length: 32 }).notNull(),
  status: varchar("status", { enum: ["open", "closed"] })
    .notNull()
    .default("open"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  closedAt: timestamp("closedAt"),
});

export type Assessment = InferSelectModel<typeof assessment>;

export const advice = pgTable("Advice", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  assessmentId: uuid("assessmentId")
    .notNull()
    .references(() => assessment.id, { onDelete: "cascade" }),
  type: varchar("type", {
    enum: ["immediate_care", "contact_team", "monitor", "record"],
  }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: integer("priority").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type Advice = InferSelectModel<typeof advice>;

export const ruleSource = pgTable(
  "RuleSource",
  {
    id: varchar("id", { length: 16 }).notNull(),
    version: varchar("version", { length: 16 }).notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    keywords: json("keywords").notNull(),
    severity: varchar("severity", { enum: RISK_LEVELS }).notNull(),
    adviceTemplate: text("adviceTemplate").notNull(),
    effectiveFrom: timestamp("effectiveFrom").notNull().defaultNow(),
    effectiveTo: timestamp("effectiveTo"),
    isActive: boolean("isActive").notNull().default(true),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.version] }),
  })
);

export type RuleSource = InferSelectModel<typeof ruleSource>;

export const evidence = pgTable(
  "Evidence",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    assessmentId: uuid("assessmentId")
      .notNull()
      .references(() => assessment.id, { onDelete: "cascade" }),
    ruleId: varchar("ruleId", { length: 16 }).notNull(),
    ruleVersion: varchar("ruleVersion", { length: 16 }).notNull(),
    matchedText: text("matchedText").notNull(),
    matchedKeywords: json("matchedKeywords").notNull(),
    severity: varchar("severity", { enum: RISK_LEVELS }).notNull(),
    source: varchar("source", { enum: ["rule", "llm"] }).notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    ruleRef: foreignKey({
      columns: [table.ruleId, table.ruleVersion],
      foreignColumns: [ruleSource.id, ruleSource.version],
    }),
  })
);

export type Evidence = InferSelectModel<typeof evidence>;

export const contactRequest = pgTable("ContactRequest", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  assessmentId: uuid("assessmentId")
    .notNull()
    .references(() => assessment.id, { onDelete: "cascade" }),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  channel: varchar("channel", { enum: ["team", "emergency"] }).notNull(),
  status: varchar("status", {
    enum: ["suggested", "created", "accepted", "closed"],
  })
    .notNull()
    .default("suggested"),
  note: text("note"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type ContactRequest = InferSelectModel<typeof contactRequest>;

export const eventLog = pgTable("EventLog", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId").references(() => user.id),
  assessmentId: uuid("assessmentId").references(() => assessment.id, {
    onDelete: "set null",
  }),
  eventName: varchar("eventName", { length: 64 }).notNull(),
  payload: json("payload").notNull(),
  userAgent: text("userAgent"),
  ipHash: varchar("ipHash", { length: 64 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type EventLog = InferSelectModel<typeof eventLog>;
