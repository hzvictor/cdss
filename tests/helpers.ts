import { generateId } from "ai";

export function generateRandomTestUser() {
  // Combine ms timestamp with a short random tag so two users created in
  // the same beforeAll get distinct emails.
  const tag = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `test-${tag}@playwright.com`;
  const password = generateId();

  return {
    email,
    password,
  };
}

export function generateTestMessage() {
  return `Test message ${Date.now()}`;
}
