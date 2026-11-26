// Accepted keys for POST /api/usage `bots`. Matching ignores case and extra spaces.
// Each list is one bot. The first name is the preferred push name.
export const USAGE_ALIASES = [
  { id: '8ab7d38a-8b50-4d19-abb0-aa40a5ae686b', names: ["Deon's Master Chief", 'Master Chief', 'Chief'] },
  { id: '494e6a0b-f66d-46b6-9c45-05b43f727e23', names: ['Adjutant'] },
  { id: 'c7e14019-a299-4198-a4c6-d878a787c23e', names: ['Accountant'] },
  { id: '4de86d3f-f8a8-4859-84a2-884b8031ef1c', names: ['Overwatch'] },
  { id: '9333ecc7-45be-4392-a622-6957398653db', names: ['Connection Manager', 'Connect'] },
  { id: '5b53350b-0b86-44df-b07b-3fa591306f66', names: ['Vector'] },
  { id: 'd6c82145-5a65-4faa-a9d3-441c60493abf', names: ['Norseman'] },
  { id: '109831fb-78b0-4a9f-aca9-77c6e1409cc6', names: ['Tech and Gaming Support', 'Tech'] },
  { id: 'ae91fc3d-620b-4171-a606-2e2e85be812e', names: ['Correspondence', 'Mail'] },
  { id: '7b2cd5b6-987e-497f-997f-82a80e00e536', names: ['Refugee (USRAP) Bot', 'Refugee (USRAP)', 'Refugee', 'USRAP'] },
  { id: 'ddee92a4-84b0-4e8d-83af-faf742ce5fec', names: ['Job Hunter', 'Jobs'] },
  { id: '68813f6b-9092-41fb-a5d1-d80fbcbb9066', names: ['Commercial Bot', 'Commercial'] },
  { id: 'c5678fef-5ebd-40d8-9a1a-d6a35a84cf0b', names: ['Mogul'] },
  { id: '0b8a07e0-8948-4ca1-a332-8fde70805e8d', names: ['Creative Bot', 'Creative'] },
  { id: 'coding-helper', names: ['Coding Helper', 'Coder'] },
];

export const ACCEPTED_USAGE_NAMES = USAGE_ALIASES.flatMap((bot) => bot.names);

function normName(value) {
  return String(value).trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
}

const aliasToId = new Map();
for (const bot of USAGE_ALIASES) {
  for (const name of bot.names) {
    const key = normName(name);
    if (aliasToId.has(key)) throw new Error(`duplicate usage alias: ${name}`);
    aliasToId.set(key, bot.id);
  }
}

// Turns a display-name map into { botId: percent }, or null when bots was omitted.
export function resolveUsageBots(input) {
  if (input == null) return { ok: true, bots: null };
  if (typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, status: 400, error: 'bots must be an object of name to percent', accepted: ACCEPTED_USAGE_NAMES };
  }
  const bots = {};
  const seen = new Map();
  for (const [name, value] of Object.entries(input)) {
    const id = aliasToId.get(normName(name));
    if (!id) return { ok: false, status: 400, error: `unknown bot name: ${name}`, accepted: ACCEPTED_USAGE_NAMES };
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
      return { ok: false, status: 400, error: `bots.${name} must be a number from 0 to 100` };
    }
    if (seen.has(id)) return { ok: false, status: 400, error: `${name} and ${seen.get(id)} are the same bot` };
    seen.set(id, name);
    bots[id] = Math.round(value * 10) / 10;
  }
  return { ok: true, bots };
}
