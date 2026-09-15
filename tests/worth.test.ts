import assert from "node:assert/strict";
import { isProfileImage, makeResult, MAX_PROFILE_DATA_URL_BYTES } from "../lib/worth.ts";

const input = { name: "Hari", age: 25, profession: "Designer", income: "Growing steadily", location: "Chennai", goal: "Building a useful product" };
const first = makeResult(input, "abc123def4");
const second = makeResult(input, "abc123def4");

assert.equal(first.score, second.score);
assert.ok(first.score >= 64 && first.score <= 96);
assert.equal(first.scores.length, 5);
assert.match(first.valuation, /^₹/);
assert.ok(isProfileImage("data:image/webp;base64,AA=="));
assert.equal(isProfileImage(`data:image/webp;base64,${"A".repeat(MAX_PROFILE_DATA_URL_BYTES)}`), false);