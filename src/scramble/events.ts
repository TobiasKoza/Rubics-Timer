/** WCA eventy podporované aplikací. `id` odpovídá WCA ID i ID v cubing.js. */
export interface CubeEvent {
  id: EventId;
  /** Krátký název do selectu. */
  name: string;
  /** ID puzzle pro <twisty-player>. */
  puzzle: string;
}

export type EventId =
  | '333'
  | '222'
  | '444'
  | '555'
  | '666'
  | '777'
  | '333bf'
  | '444bf'
  | '555bf'
  | '333oh'
  | '333fm'
  | 'pyram'
  | 'minx'
  | 'skewb'
  | 'sq1'
  | 'clock';

export const EVENTS: readonly CubeEvent[] = [
  { id: '333', name: '3x3x3', puzzle: '3x3x3' },
  { id: '222', name: '2x2x2', puzzle: '2x2x2' },
  { id: '444', name: '4x4x4', puzzle: '4x4x4' },
  { id: '555', name: '5x5x5', puzzle: '5x5x5' },
  { id: '666', name: '6x6x6', puzzle: '6x6x6' },
  { id: '777', name: '7x7x7', puzzle: '7x7x7' },
  { id: '333bf', name: '3x3 naslepo', puzzle: '3x3x3' },
  { id: '444bf', name: '4x4 naslepo', puzzle: '4x4x4' },
  { id: '555bf', name: '5x5 naslepo', puzzle: '5x5x5' },
  { id: '333oh', name: '3x3 jednou rukou', puzzle: '3x3x3' },
  { id: '333fm', name: 'Fewest moves', puzzle: '3x3x3' },
  { id: 'pyram', name: 'Pyraminx', puzzle: 'pyraminx' },
  { id: 'minx', name: 'Megaminx', puzzle: 'megaminx' },
  { id: 'skewb', name: 'Skewb', puzzle: 'skewb' },
  { id: 'sq1', name: 'Square-1', puzzle: 'square1' },
  { id: 'clock', name: 'Clock', puzzle: 'clock' },
];

const byId = new Map(EVENTS.map((e) => [e.id, e]));

export function getEvent(id: string): CubeEvent {
  return byId.get(id as EventId) ?? EVENTS[0];
}

export function isEventId(id: string): id is EventId {
  return byId.has(id as EventId);
}

/** Blind eventy – WCA inspekce se u nich nepoužívá. */
export function isBlindEvent(id: EventId): boolean {
  return id.endsWith('bf');
}
