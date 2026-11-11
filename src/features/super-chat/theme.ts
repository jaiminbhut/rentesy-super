// Provisional palette: no brand kit from the client yet.
export const colors = {
  canvas: '#F8F8F5',
  surface: '#FFFFFF',
  ink: '#14231F',
  body: '#25362F',
  muted: '#7B8983',
  faint: '#A3ADA6',
  brand: '#176B52',
  brandSoft: '#E7F1E9',
  mint: '#35A778',
  mintSoft: '#E5F3E9',
  border: '#EAEEE9',
  rule: '#E6E9E3',
  icon: '#5E7165',
  recording: '#D9534F',
} as const;

// Shared spring presets so every element moves with the same "feel".
export const springs = {
  bubble: { friction: 8, tension: 68 },
  reply: { friction: 8, tension: 62 },
  pop: { friction: 5, tension: 120 },
  soft: { friction: 9, tension: 55 },
} as const;
