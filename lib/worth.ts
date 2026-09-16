export type Answers = {
  name: string; age: number; profession: string; income: string; location: string; goal: string; profileImage?: string;
};
export type PublicResult = {
  slug: string; name: string; score: number; valuation: string; humanType: string; verdict: string; valueGap: string;
  upgrade: string; scores: { label: string; value: number }[]; createdAt: string; profileImage?: string;
};
export const INCOME_RANGES = ["Below ₹2 lakh", "₹2 lakh – ₹4 lakh", "₹4 lakh – ₹8 lakh", "₹8 lakh – ₹15 lakh", "₹15 lakh – ₹30 lakh", "Above ₹30 lakh", "Prefer not to say"];
export const MAX_PROFILE_DATA_URL_BYTES = 100 * 1024;
export function isProfileImage(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_PROFILE_DATA_URL_BYTES &&
    /^data:image\/(?:jpeg|webp);base64,(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(value) &&
    value.split(",")[1].length > 0;
}
function text(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.trim().length >= min && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
}
export function answerErrors(value: Answers): Partial<Record<keyof Answers, string>> {
  const errors: Partial<Record<keyof Answers, string>> = {};
  if (!text(value.name, 2, 28)) errors.name = "Use a name between 2 and 28 characters.";
  if (!Number.isInteger(value.age) || value.age < 18 || value.age > 120) errors.age = "Enter a whole-number age from 18 to 120.";
  if (!text(value.profession, 2, 60)) errors.profession = "Add your profession (2–60 characters).";
  if (!INCOME_RANGES.includes(value.income)) errors.income = "Choose an annual income range.";
  if (!text(value.location, 2, 60)) errors.location = "Add your city (2–60 characters).";
  if (!text(value.goal, 3, 120)) errors.goal = "Describe a goal in 3–120 characters.";
  if (value.profileImage !== undefined && !isProfileImage(value.profileImage)) errors.profileImage = "Choose a valid photo under 100 KB.";
  return errors;
}
export function isValidAnswers(value: unknown): value is Answers {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(answerErrors(value as Answers)).length === 0;
}
export function isPublicResult(value: unknown): value is PublicResult {
  if (!value || typeof value !== "object") return false;
  const r = value as PublicResult;
  return typeof r.slug === "string" && /^[a-z0-9]{10}$/.test(r.slug) && text(r.name, 2, 28) &&
    Number.isInteger(r.score) && r.score >= 0 && r.score <= 100 && text(r.valuation, 1, 40) &&
    text(r.humanType, 1, 80) && text(r.verdict, 1, 500) && text(r.valueGap, 1, 50) && text(r.upgrade, 1, 250) &&
    typeof r.createdAt === "string" && Number.isFinite(Date.parse(r.createdAt)) &&
    Array.isArray(r.scores) && r.scores.length === 5 && r.scores.every(s => s && text(s.label, 1, 40) && Number.isInteger(s.value) && s.value >= 0 && s.value <= 100) &&
    (r.profileImage === undefined || isProfileImage(r.profileImage));
}
const types = ["The Intentional Builder", "The Curious Operator", "The Calm Overachiever", "The Quiet Catalyst", "The Unstoppable Experimenter"];
const gaps = ["Consistency", "Focus", "Rest", "Follow-through", "Saying no"];
const upgrades = [
  "Finish one important task before opening social media.",
  "Block a distraction-free 25-minute sprint for your top goal.",
  "Protect one proper wind-down ritual this week.",
  "Write the next tiny action before you end today.",
  "Keep one hour this week for work only you can do.",
];
const openings = [
  "Big-picture thinker. Surprisingly resourceful. Your next good idea probably arrived while you were doing something else.",
  "You bring calm to the chaos and a plan to the group chat. That combination deserves more credit.",
  "Curiosity is your unfair advantage. You ask the question everyone else was quietly wondering about.",
  "You have the energy of a fresh notebook: lots of possibility, a little ambition, and room for an excellent plot twist.",
];
const endings = [
  "A little consistency could turn that spark into a very good streak.",
  "Give one good idea your full attention. The others can wait their turn.",
  "Your next upgrade might be a proper break. Even brilliant batteries need charging.",
  "The finishing touch is your secret weapon. Take one project all the way.",
  "Protect a little space for your own plans. Your calendar will thank you.",
];
// 5 archetypes × 5 upgrade themes × 4 verdicts = 100 prewritten result combinations.
export const RESULT_CATALOG = Array.from({ length: 100 }, (_, index) => {
  const theme = Math.floor(index / 5) % 5;
  return { humanType: types[index % 5], valueGap: gaps[theme], upgrade: upgrades[theme], verdict: openings[Math.floor(index / 25)] + " " + endings[theme] };
});
function hash(value: string) { return [...value].reduce((n, c) => (n * 31 + c.codePointAt(0)!) >>> 0, 2166136261); }
export function makeResult(input: Answers, slug = crypto.randomUUID().replaceAll("-", "").slice(0, 10)): PublicResult {
  const seed = hash([input.name.trim().toLowerCase(), input.age, input.profession.trim().toLowerCase(), input.income, input.location.trim().toLowerCase(), input.goal.trim().toLowerCase()].join("|"));
  const score = 64 + seed % 33;
  const values = [score + (seed >>> 2) % 9 - 4, score + (seed >>> 5) % 13 - 6, score + 4 + (seed >>> 8) % 6, score + (seed >>> 11) % 11 - 5, score - 8 + (seed >>> 14) % 10];
  return {
    slug, name: input.name.trim(), score,
    valuation: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(1250000 + score * 217000 + seed % 700000),
    ...RESULT_CATALOG[seed % 100],
    scores: ["Brain power", "Career value", "Potential", "People value", "Common sense"].map((label, i) => ({ label, value: Math.max(0, Math.min(99, values[i])) })),
    createdAt: new Date().toISOString(), profileImage: input.profileImage,
  };
}