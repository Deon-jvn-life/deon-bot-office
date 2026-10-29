const SVG = {
  clipboard: '<svg viewBox="0 0 16 20"><rect x="2" y="3" width="12" height="16" rx="1.5" fill="#f4f1ea" stroke="#8a6a48" stroke-width="1"/><rect x="5" y="1" width="6" height="3" rx="1" fill="#c4a574"/><path d="M4 8h8M4 11h8M4 14h5" stroke="#9aa3ad" stroke-width="1"/></svg>',
  calculator: '<svg viewBox="0 0 16 20"><rect x="1" y="1" width="14" height="18" rx="2" fill="#3a4148"/><rect x="3" y="3" width="10" height="4" rx="1" fill="#b7e3c0"/><g fill="#d5dbe2"><rect x="3" y="9" width="3" height="2"/><rect x="7" y="9" width="3" height="2"/><rect x="11" y="9" width="2" height="2"/><rect x="3" y="13" width="3" height="2"/><rect x="7" y="13" width="3" height="2"/><rect x="11" y="13" width="2" height="4"/></g></svg>',
  binoculars: '<svg viewBox="0 0 20 14"><circle cx="5" cy="8" r="4" fill="#2c3138"/><circle cx="15" cy="8" r="4" fill="#2c3138"/><rect x="7" y="6" width="6" height="3" rx="1" fill="#3a4148"/><circle cx="5" cy="8" r="2" fill="#9ec4d8"/><circle cx="15" cy="8" r="2" fill="#9ec4d8"/></svg>',
  plug: '<svg viewBox="0 0 16 18"><rect x="3" y="7" width="10" height="8" rx="2" fill="#f2f4f6" stroke="#2c3138"/><rect x="5" y="1" width="2" height="7" rx="1" fill="#d0d5dc"/><rect x="9" y="1" width="2" height="7" rx="1" fill="#d0d5dc"/><path d="M8 15v3" stroke="#2c3138" stroke-width="1.4"/></svg>',
  book: '<svg viewBox="0 0 16 18"><path d="M2 2h6v14H3a2 2 0 0 1-1-1.7z" fill="#8b4b45"/><path d="M8 2h6v12.3a2 2 0 0 1-1 1.7H8z" fill="#c45a50"/><path d="M8 2v14" stroke="#f4efe6"/></svg>',
  bottle: '<svg viewBox="0 0 12 20"><rect x="4" y="1" width="4" height="3" rx="1" fill="#d0d5dc"/><rect x="2" y="4" width="8" height="14" rx="3" fill="#7ec8e3"/><rect x="3" y="8" width="6" height="6" fill="#e8f6fb" opacity=".7"/></svg>',
  gamepad: '<svg viewBox="0 0 20 14"><rect x="1" y="3" width="18" height="8" rx="4" fill="#2c3138"/><circle cx="6" cy="7" r="1.3" fill="#d5dbe2"/><circle cx="14" cy="6" r="1" fill="#e06a6a"/><circle cx="16" cy="8" r="1" fill="#6ec07a"/></svg>',
  envelope: '<svg viewBox="0 0 18 14"><rect x="1" y="2" width="16" height="10" rx="1" fill="#f7f4ea" stroke="#c4b49a"/><path d="M1 3l8 6 8-6" fill="none" stroke="#d7c7a4"/></svg>',
  passport: '<svg viewBox="0 0 14 18"><rect x="1" y="1" width="12" height="16" rx="1.5" fill="#1e3a5f"/><circle cx="7" cy="8" r="3" fill="none" stroke="#d4b46a"/><path d="M4 13h6" stroke="#d4b46a"/></svg>',
  briefcase: '<svg viewBox="0 0 18 14"><rect x="1" y="4" width="16" height="9" rx="1.5" fill="#5a4030"/><path d="M6 4V3a3 3 0 0 1 6 0v1" fill="none" stroke="#3d2a1e"/><rect x="7" y="7" width="4" height="2" fill="#c4a574"/></svg>',
  bag: '<svg viewBox="0 0 16 16"><path d="M3 6h10l-1 9H4z" fill="#e7d3b0"/><path d="M6 6V4a2 2 0 0 1 4 0v2" fill="none" stroke="#b08968"/></svg>',
  coin: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#e6c35c" stroke="#a8842a"/><circle cx="8" cy="8" r="4" fill="none" stroke="#a8842a"/><path d="M8 4.5v7M6.2 6.2c.6-1 3-.9 3.6.4.5 1.1-.4 1.6-1.8 1.8-1.4.2-2.3.6-1.8 1.7.6 1.2 2.8 1.1 3.4.2" fill="none" stroke="#8a6a22" stroke-width="1"/></svg>',
  paintbrush: '<svg viewBox="0 0 8 20"><rect x="2.5" y="1" width="3" height="11" rx="1" fill="#a56a3a"/><rect x="2" y="11" width="4" height="3" fill="#d5dbe0"/><path d="M2 14l2 5 2-5z" fill="#3d8fd4"/></svg>',
  laptop: '<svg viewBox="0 0 20 14"><rect x="4" y="1" width="12" height="8" rx="1" fill="#2c3138"/><rect x="5" y="2" width="10" height="6" fill="#8fd0ea"/><path d="M1 11h18l-2 2H3z" fill="#d9dde2"/></svg>',
};

const KIND = {
  '8ab7d38a-8b50-4d19-abb0-aa40a5ae686b': 'clipboard',
  '494e6a0b-f66d-46b6-9c45-05b43f727e23': 'clipboard',
  'c7e14019-a299-4198-a4c6-d878a787c23e': 'calculator',
  '4de86d3f-f8a8-4859-84a2-884b8031ef1c': 'binoculars',
  '9333ecc7-45be-4392-a622-6957398653db': 'plug',
  '5b53350b-0b86-44df-b07b-3fa591306f66': 'book',
  'd6c82145-5a65-4faa-a9d3-441c60493abf': 'bottle',
  '109831fb-78b0-4a9f-aca9-77c6e1409cc6': 'gamepad',
  'ae91fc3d-620b-4171-a606-2e2e85be812e': 'envelope',
  '7b2cd5b6-987e-497f-997f-82a80e00e536': 'passport',
  'ddee92a4-84b0-4e8d-83af-faf742ce5fec': 'briefcase',
  '68813f6b-9092-41fb-a5d1-d80fbcbb9066': 'bag',
  'c5678fef-5ebd-40d8-9a1a-d6a35a84cf0b': 'coin',
  '0b8a07e0-8948-4ca1-a332-8fde70805e8d': 'paintbrush',
  'coding-helper': 'laptop',
};

export function propSvg(bot) {
  const kind = bot && KIND[bot.id];
  if (!kind) return '';
  return `<span class="prop">${SVG[kind]}</span>`;
}
