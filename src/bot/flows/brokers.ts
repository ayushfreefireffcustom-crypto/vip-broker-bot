// The supported brokers and how each identifies a client. Exness keys the
// affiliate on the account email; Vantage and XM use a numeric UID/account number.
export type IdType = 'uid' | 'email';

export interface BrokerDef {
  key: BrokerKey;
  label: string;
  idType: IdType;
}

export const BROKERS = {
  vantage: { key: 'vantage', label: 'Vantage', idType: 'uid' },
  exness: { key: 'exness', label: 'Exness', idType: 'email' },
  xm: { key: 'xm', label: 'XM', idType: 'uid' },
} as const satisfies Record<string, BrokerDef>;

export type BrokerKey = 'vantage' | 'exness' | 'xm';

export const BROKER_KEYS = Object.keys(BROKERS) as BrokerKey[];

export function isBrokerKey(x: string): x is BrokerKey {
  return x in BROKERS;
}

export function brokerLabel(key: string): string {
  return isBrokerKey(key) ? BROKERS[key].label : key;
}
