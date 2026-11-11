// Scripted "brain" for the prototype. Nothing here talks to Rentesy services:
// replies are picked with simple keyword rules so the demo feels responsive.
// Replace `createScript().reply` with a real API call when Super is wired up.
import { clock } from './time';
import type { Receipt, RequestSummary, SuperReply, UserInput } from './types';

export const PROPERTY = { name: 'Blue Heavens', unit: 'A-302' } as const;

type Trade = { role: string; person: string; responds: string };

const TRADES = {
  plumbing: { role: 'Plumber', person: 'Ravi Kumar', responds: 'usually responds in 20 min' },
  electrical: { role: 'Electrician', person: 'Suresh Patil', responds: 'usually responds in 30 min' },
  cooling: { role: 'AC technician', person: 'Imran Shaikh', responds: 'usually responds in 1 hr' },
  carpentry: { role: 'Carpenter', person: 'Anil Verma', responds: 'usually responds in 2 hr' },
} satisfies Record<string, Trade>;

// First matching word becomes the issue label on the receipt.
const ISSUE_RULES: { trade: keyof typeof TRADES; words: Record<string, string> }[] = [
  { trade: 'plumbing', words: { sink: 'Kitchen sink', tap: 'Tap', pipe: 'Pipe', drain: 'Drain', toilet: 'Toilet', flush: 'Flush', geyser: 'Geyser', shower: 'Shower', leak: 'Water leak', leaking: 'Water leak' } },
  { trade: 'electrical', words: { light: 'Light', lights: 'Lights', switch: 'Switch', socket: 'Socket', fan: 'Ceiling fan', power: 'Power', wiring: 'Wiring', fuse: 'Fuse' } },
  { trade: 'cooling', words: { ac: 'AC', 'air conditioner': 'AC', cooling: 'AC', fridge: 'Fridge' } },
  { trade: 'carpentry', words: { door: 'Door', window: 'Window', cupboard: 'Cupboard', wardrobe: 'Wardrobe', lock: 'Lock', hinge: 'Hinge' } },
];

const has = (text: string, pattern: RegExp) => pattern.test(text.toLowerCase());

function findIssue(text: string) {
  const lower = ` ${text.toLowerCase().replace(/[^a-z\s]/g, ' ')} `;
  for (const rule of ISSUE_RULES) {
    for (const [word, label] of Object.entries(rule.words)) {
      if (lower.includes(` ${word} `)) return { trade: TRADES[rule.trade], label };
    }
  }
  return null;
}

type Request = { ticket: string; trade: Trade; label: string; loggedAt: string; photos: number };

const receiptFor = (request: Request, status: Receipt['status']): Receipt => ({
  title: status === 'SENT' ? `${request.trade.role} notified` : `${request.trade.role} updated`,
  subtitle: `${request.trade.person} · ${request.trade.responds}`,
  status,
  detail: `${PROPERTY.unit} · ${request.label}`,
  ticket: request.ticket,
});

const summaryFor = (request: Request): RequestSummary => ({
  ticket: request.ticket,
  issue: request.label,
  status: 'OPEN',
  rows: [
    { label: 'Assigned to', value: `${request.trade.person} · ${request.trade.role}` },
    { label: 'Status', value: 'Waiting for a visit time' },
    { label: 'Logged', value: `Today, ${request.loggedAt}` },
    ...(request.photos ? [{ label: 'Photos', value: `${request.photos} attached` }] : []),
  ],
});

/** The opening exchange that plays when the screen loads. */
export const INTRO_MESSAGE = 'There’s water leaking under the kitchen sink in A-302. Can you get someone to check it?';

export function createScript() {
  let nextTicket = 2048;
  let latest: Request | null = null;

  const openRequest = (trade: Trade, label: string): Request => {
    latest = { ticket: `#MT-${nextTicket++}`, trade, label, loggedAt: clock(), photos: 0 };
    return latest;
  };

  function thinkingLabel(input: UserInput): string {
    if (input.kind === 'photo') return latest ? `Adding photo to ${latest.ticket}…` : 'Looking at your photo…';
    if (input.kind === 'view-request') return 'Pulling up the request…';
    return findIssue(input.text) ? 'Checking your property…' : 'Thinking…';
  }

  function reply(input: UserInput): SuperReply {
    if (input.kind === 'photo') {
      if (!latest) return { lead: 'Thanks for the photo. Tell me what needs fixing and I’ll log a request with it.' };
      latest.photos += 1;
      return {
        lead: `Got it. I’ve added the photo to ${latest.ticket} so ${latest.trade.person.split(' ')[0]} can see the problem before the visit.`,
        receipt: receiptFor(latest, 'UPDATED'),
      };
    }

    if (input.kind === 'view-request') {
      if (!latest) return { lead: 'There are no open requests for A-302 right now.' };
      return { lead: `Here’s where ${latest.ticket} stands:`, summary: summaryFor(latest), follow: 'I’ll update you here as soon as a visit time is confirmed.' };
    }

    const text = input.text.trim();
    const issue = findIssue(text);
    if (issue) {
      const request = openRequest(issue.trade, issue.label);
      return {
        lead: `I’ve logged this as a maintenance request and found your usual ${issue.trade.role.toLowerCase()}.`,
        receipt: receiptFor(request, 'SENT'),
        follow: `I’ll let you know when ${issue.trade.person.split(' ')[0]} confirms a visit.`,
      };
    }

    const who = latest?.trade.person.split(' ')[0];
    if (has(text, /\b(when|time|eta|how long|arrive|today)\b/) && latest) {
      return { lead: `${who} ${latest.trade.responds.replace('usually responds', 'usually replies')}. I’ll message you as soon as a visit time is confirmed for ${latest.ticket}.` };
    }
    if (has(text, /\b(cost|price|charge|charges|fee|rupees|rs|₹)\b/) && latest) {
      return { lead: `I’ll ask ${who} for a quote and share it with you before any work starts on ${latest.ticket}.` };
    }
    if (has(text, /\b(cancel|stop|never mind|nevermind)\b/) && latest) {
      return { lead: `Do you want me to cancel ${latest.ticket}? I’ll let ${who} know right away.` };
    }
    if (has(text, /\b(photo|picture|image|pic)\b/)) {
      return { lead: 'Sure, tap ＋ to attach a photo and I’ll add it to the request.' };
    }
    if (has(text, /\b(thanks|thank you|thx|great|perfect|ok|okay)\b/)) {
      return { lead: latest ? `You’re welcome! I’ll keep you posted on ${latest.ticket}.` : 'You’re welcome!' };
    }
    if (latest) return { lead: `Noted. I’ve added that to ${latest.ticket} and shared it with ${who}.` };
    return { lead: 'Tell me what needs fixing at A-302 and I’ll find the right person for it.' };
  }

  return { thinkingLabel, reply };
}
