import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isAdminEmail } from "../lib/admin.ts";

test("recognises only the configured administrator email", () => {
  assert.equal(isAdminEmail("hrutujamane492@gmail.com"), true);
  assert.equal(isAdminEmail("HRUTUJAMANE492@GMAIL.COM"), true);
  assert.equal(isAdminEmail("student@example.com"), false);
});

test("admin account listing is protected and server-only", async () => {
  const route = await readFile(new URL("../app/api/admin/users/route.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../components/admin-page.tsx", import.meta.url), "utf8");
  const shell = await readFile(new URL("../components/app-shell.tsx", import.meta.url), "utf8");
  assert.match(route, /authenticateRequest/);
  assert.match(route, /isAdminEmail\(currentUser\.email\)/);
  assert.match(route, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(route, /auth\.admin\.listUsers/);
  assert.doesNotMatch(route, /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(page, /Demo accounts exist only in the current browser/);
  assert.match(shell, /isAdmin \? \[\.\.\.navItems/);
});
