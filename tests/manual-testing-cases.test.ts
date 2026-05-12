import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";

// Derive repo root from this file (…/tests/manual-testing-cases.test.ts → project root). Avoids broken
// paths when Vitest transforms `__dirname`. Fallback: cwd when tests run from package root.
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_FROM_FILE = path.resolve(TEST_DIR, "..");
const CASES_FROM_FILE = path.join(ROOT_FROM_FILE, "testing", "cases");
const CASES_FROM_CWD = path.join(process.cwd(), "testing", "cases");
const CASES_DIR = fs.existsSync(CASES_FROM_FILE) ? CASES_FROM_FILE : CASES_FROM_CWD;

const EXPECTED_CASE_FILES = [
  "01-auth-and-session.md",
  "02-landing-rooms.md",
  "03-whiteboard-tools-and-ui.md",
  "04-realtime-socket-collaboration.md",
  "05-room-moderation.md",
  "06-supabase-and-data.md",
] as const;

const CASE_ID_PATTERN = /\b[A-Z]{2,6}-\d{3}\b/g;

describe("manual testing/cases markdown suite", () => {
  it("contains every planned case file", () => {
    for (const name of EXPECTED_CASE_FILES) {
      const full = path.join(CASES_DIR, name);
      expect(fs.existsSync(full), `missing ${name}`).toBe(true);
    }
  });

  it.each([...EXPECTED_CASE_FILES])("%s is non-empty and structured", (filename) => {
    const full = path.join(CASES_DIR, filename);
    const content = fs.readFileSync(full, "utf8");
    expect(content.trim().length).toBeGreaterThan(50);
    expect(content).toMatch(/\*\*ID\*\*/);
    expect(content).toMatch(/\*\*Preconditions\*\*/);
    expect(content).toMatch(/\*\*Steps\*\*/);
    expect(content).toMatch(/\*\*Expected\*\*/);
  });

  it("defines at least one case ID per file", () => {
    for (const name of EXPECTED_CASE_FILES) {
      const content = fs.readFileSync(path.join(CASES_DIR, name), "utf8");
      const ids = content.match(CASE_ID_PATTERN) ?? [];
      expect(ids.length, `${name} should list case IDs like AUTH-001`).toBeGreaterThan(0);
    }
  });
});
