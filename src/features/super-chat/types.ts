export type Receipt = {
  /** e.g. "Plumber notified" */
  title: string;
  /** e.g. "Ravi Kumar · usually responds in 20 min" */
  subtitle: string;
  status: 'SENT' | 'UPDATED';
  /** e.g. "A-302 · Kitchen sink" */
  detail: string;
  ticket: string;
};

/** Read-only status of an existing request (the "View request" answer). */
export type RequestSummary = {
  ticket: string;
  /** e.g. "AC" */
  issue: string;
  status: 'OPEN';
  rows: { label: string; value: string }[];
};

export type SuperReply = {
  lead: string;
  /** Something Super just did (dispatched or updated a request). */
  receipt?: Receipt;
  /** Status of a request, with no new action. */
  summary?: RequestSummary;
  follow?: string;
};

/** `sample`: a sample voice message played because the mic wasn't available (see sampleVoice.ts). */
export type UserText = { id: string; from: 'user'; kind: 'text' | 'voice'; text: string; time: string; sample?: boolean };
export type UserPhoto = { id: string; from: 'user'; kind: 'photo'; uri: string; aspectRatio: number; time: string };
export type UserMessage = UserText | UserPhoto;

export type SuperTurn = {
  id: string;
  from: 'super';
  status: 'thinking' | 'done';
  /** Shown next to the thinking dots, e.g. "Checking your property…" */
  thinkingLabel: string;
  reply?: SuperReply;
  time: string;
};

export type ChatItem = UserMessage | SuperTurn;

/** What the landlord can send from the composer. */
export type UserInput =
  | { kind: 'text' | 'voice'; text: string; sample?: boolean }
  | { kind: 'photo'; uri: string; aspectRatio: number }
  | { kind: 'view-request' };
