const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { createServer } = require("../server");

let server;
let origin;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("health endpoint reports service version", async () => {
  const response = await fetch(`${origin}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", version: "1.0.0" });
});

test("tool endpoint lists built-in tools", async () => {
  const response = await fetch(`${origin}/api/tools`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { tools: ["web-search", "mail-shortcuts", "url-check"] });
});

test("server serves the dashboard and rejects unknown paths and methods", async () => {
  assert.match(await (await fetch(origin)).text(), /一体化工作台/);
  assert.equal((await fetch(`${origin}/favicon.ico`)).status, 204);
  assert.equal((await fetch(`${origin}/not-a-file`)).status, 404);
  assert.equal((await fetch(`${origin}/api/health`, { method: "POST" })).status, 405);
});
