import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Run against a built app with a production Clerk publishable key and no session.
const base = process.argv[2] ?? "http://127.0.0.1:3000";
const paper = JSON.parse(await readFile(new URL("../data/papers/01.json", import.meta.url), "utf8"));
const request = (path) => fetch(new URL(path, base), { redirect: "manual", headers: { Accept: process.env.CHECK_HTTP_ACCEPT ?? "text/html" } });
const assertPrivate = (body) => {
  assert(!body.includes("body_md"), "Model answer payload leaked");
  assert(!body.includes("has_image"), "Question payload leaked");
  for (const question of paper.questions) assert(!body.includes(question.title), `Question leaked: ${question.title}`);
};
for (const path of ["/", "/sign-in", "/sign-up", "/privacy"]) {
  const response = await request(path);
  const body = await response.text();
  assert.equal(response.status, 200, `${path} must be public`);
  assertPrivate(body);
  if (path === "/") {
    assert(body.includes("Big exam."), "Landing page is missing");
    assert(body.includes('href="/sign-in"'), "Sign in must be visible in server HTML");
    assert(!body.includes('href="/papers/01"'), "Paper library must not appear before sign-in");
  }
  console.log(`PASS public ${path}`);
}
for (const path of ["/chat", "/library", "/papers/01", "/papers/01/mock", "/learn", "/learn/i-basic-sciences", "/topics", "/topics/gi-hepatobiliary", "/search", "/bookmarks"]) {
  const response = await request(path);
  const body = await response.text();
  assert([303, 307, 308].includes(response.status) || body.includes("NEXT_REDIRECT"), `${path} must redirect`);
  assert((response.headers.get("location") ?? body).includes("/sign-in"), `${path} must lead to sign-in`);
  assertPrivate(body);
  console.log(`PASS gated ${path}`);
}
for (const path of ["/api/ai/chat", "/api/papers/01", "/api/search", "/api/sync", "/assets/img/01/q01.webp", "/assets/figures/cloaca.svg"]) {
  const response = await request(path);
  assert.equal(response.status, 401, `${path} must require authentication`);
  console.log(`PASS private data ${path}`);
}
for (const [path, method] of [["/api/ai/chat", "POST"], ["/api/ai/chat", "DELETE"], ["/api/ai/explain", "POST"]]) {
  const response = await fetch(new URL(path,base), { method, redirect:"manual", headers: { "Content-Type":"application/json", Origin:base }, body:"{}" });
  assert.equal(response.status,401,`${method} ${path} must require authentication`);
  console.log(`PASS private mutation ${method} ${path}`);
}
assert.equal((await request("/search-index.json")).status, 404, "Legacy public question index must be removed");
console.log("All signed-out access checks passed.");
