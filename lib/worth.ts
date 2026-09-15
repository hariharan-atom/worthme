export type Answers = {
  name: string;
  age: number;
  profession: string;
  income: string;
  location: string;
  goal: string;
};

export type PublicResult = {
  slug: string;
  name: string;
  score: number;
  valuation: string;
  humanType: string;
  verdict: string;
  valueGap: string;
  upgrade: string;
  scores: { label: string; value: number }[];
  createdAt: string;
};

const types = ["The Intentional Builder", "The Curious Operator", "The Calm Overachiever", "The Quiet Catalyst", "The Unstoppable Experimenter"];
const gaps = ["Consistency", "Focus", "Rest", "Follow-through", "Saying no"];
const upgrades: Record<string, string> = {
  Consistency: "Finish one important task before opening social media.",
  Focus: "Block a distraction-free 25-minute sprint for your top goal.",
  Rest: "Protect one proper wind-down ritual this week.",
  "Follow-through": "Write the next tiny action before you end today.",
  "Saying no": "Keep one hour this week for work only you can do.",
};

function hash(value: string) {
  return [...value].reduce((n, char) => (n * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
}

export function makeResult(input: Answers, slug = crypto.randomUUID().replaceAll("-", "").slice(0, 10)): PublicResult {
  const seed = hash(`${input.name}|${input.profession}|${input.goal}|${input.location}`);
  const score = 64 + (seed % 33);
  const gap = gaps[seed % gaps.length];
  const scores = [
    ["Brain power", Math.min(99, score + ((seed >> 2) % 9) - 4)],
    ["Career value", Math.min(99, score + ((seed >> 5) % 13) - 6)],
    ["Potential", Math.min(99, score + 4 + ((seed >> 8) % 6))],
    ["People value", Math.min(99, score + ((seed >> 11) % 11) - 5)],
    ["Common sense", Math.max(55, score - 8 + ((seed >> 14) % 10))],
  ].map(([label, value]) => ({ label: String(label), value: Number(value) }));
  const amount = 1250000 + score * 217000 + (seed % 700000);
  const valuation = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
  return {
    slug,
    name: input.name.trim().slice(0, 28),
    score,
    valuation,
    humanType: types[seed % types.length],
    verdict: `${input.name.trim()}, you have the energy of someone who can make ${input.goal.trim().slice(0, 48)} happen — once your calendar stops accepting every random invitation. Serious momentum, selectively deployed.`,
    valueGap: gap,
    upgrade: upgrades[gap],
    scores,
    createdAt: new Date().toISOString(),
  };
}

export function isValidAnswers(value: unknown): value is Answers {
  const a = value as Answers;
  return Boolean(a && typeof a.name === "string" && a.name.trim().length >= 2 && Number.isInteger(a.age) && a.age >= 18 && a.age <= 120 && typeof a.profession === "string" && a.profession.trim().length >= 2 && typeof a.income === "string" && typeof a.location === "string" && a.location.trim().length >= 2 && typeof a.goal === "string" && a.goal.trim().length >= 3);
}
