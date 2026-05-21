import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "../src/app/api/health/route";

test("health route returns a stable ok payload", async () => {
  const response = await GET();
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.data.status, "ok");
  assert.equal(payload.data.service, "reservee-tn");
});
