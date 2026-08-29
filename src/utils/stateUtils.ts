export interface StateOption {
  code: string;
  name: string;
  shortName: string;
}

export const US_STATES: StateOption[] = [
  { code: 'AL', name: 'Alabama', shortName: 'AL' },
  { code: 'AK', name: 'Alaska', shortName: 'AK' },
  { code: 'AZ', name: 'Arizona', shortName: 'AZ' },
  { code: 'AR', name: 'Arkansas', shortName: 'AR' },
  { code: 'CA', name: 'California', shortName: 'CA' },
  { code: 'CO', name: 'Colorado', shortName: 'CO' },
  { code: 'CT', name: 'Connecticut', shortName: 'CT' },
  { code: 'DE', name: 'Delaware', shortName: 'DE' },
  { code: 'FL', name: 'Florida', shortName: 'FL' },
  { code: 'GA', name: 'Georgia', shortName: 'GA' },
  { code: 'HI', name: 'Hawaii', shortName: 'HI' },
  { code: 'ID', name: 'Idaho', shortName: 'ID' },
  { code: 'IL', name: 'Illinois', shortName: 'IL' },
  { code: 'IN', name: 'Indiana', shortName: 'IN' },
  { code: 'IA', name: 'Iowa', shortName: 'IA' },
  { code: 'KS', name: 'Kansas', shortName: 'KS' },
  { code: 'KY', name: 'Kentucky', shortName: 'KY' },
  { code: 'LA', name: 'Louisiana', shortName: 'LA' },
  { code: 'ME', name: 'Maine', shortName: 'ME' },
  { code: 'MD', name: 'Maryland', shortName: 'MD' },
  { code: 'MA', name: 'Massachusetts', shortName: 'MA' },
  { code: 'MI', name: 'Michigan', shortName: 'MI' },
  { code: 'MN', name: 'Minnesota', shortName: 'MN' },
  { code: 'MS', name: 'Mississippi', shortName: 'MS' },
  { code: 'MO', name: 'Missouri', shortName: 'MO' },
  { code: 'MT', name: 'Montana', shortName: 'MT' },
  { code: 'NE', name: 'Nebraska', shortName: 'NE' },
  { code: 'NV', name: 'Nevada', shortName: 'NV' },
  { code: 'NH', name: 'New Hampshire', shortName: 'NH' },
  { code: 'NJ', name: 'New Jersey', shortName: 'NJ' },
  { code: 'NM', name: 'New Mexico', shortName: 'NM' },
  { code: 'NY', name: 'New York', shortName: 'NY' },
  { code: 'NC', name: 'North Carolina', shortName: 'NC' },
  { code: 'ND', name: 'North Dakota', shortName: 'ND' },
  { code: 'OH', name: 'Ohio', shortName: 'OH' },
  { code: 'OK', name: 'Oklahoma', shortName: 'OK' },
  { code: 'OR', name: 'Oregon', shortName: 'OR' },
  { code: 'PA', name: 'Pennsylvania', shortName: 'PA' },
  { code: 'RI', name: 'Rhode Island', shortName: 'RI' },
  { code: 'SC', name: 'South Carolina', shortName: 'SC' },
  { code: 'SD', name: 'South Dakota', shortName: 'SD' },
  { code: 'TN', name: 'Tennessee', shortName: 'TN' },
  { code: 'TX', name: 'Texas', shortName: 'TX' },
  { code: 'UT', name: 'Utah', shortName: 'UT' },
  { code: 'VT', name: 'Vermont', shortName: 'VT' },
  { code: 'VA', name: 'Virginia', shortName: 'VA' },
  { code: 'WA', name: 'Washington', shortName: 'WA' },
  { code: 'WV', name: 'West Virginia', shortName: 'WV' },
  { code: 'WI', name: 'Wisconsin', shortName: 'WI' },
  { code: 'WY', name: 'Wyoming', shortName: 'WY' },
  { code: 'DC', name: 'District of Columbia', shortName: 'DC' },
  { code: 'ON', name: 'Ontario', shortName: 'ON' },
  { code: 'BC', name: 'British Columbia', shortName: 'BC' },
  { code: 'QC', name: 'Quebec', shortName: 'QC' },
  { code: 'AB', name: 'Alberta', shortName: 'AB' },
  { code: 'INTL', name: 'International / Other', shortName: 'INTL' },
];

const STATE_MAP = new Map<string, StateOption>();
US_STATES.forEach((s) => {
  STATE_MAP.set(s.code.toUpperCase(), s);
  STATE_MAP.set(s.name.toUpperCase(), s);
});

export function getStateName(codeOrName?: string): string {
  if (!codeOrName) return '';
  const clean = codeOrName.toUpperCase().trim();
  const match = STATE_MAP.get(clean);
  return match ? `${match.name} (${match.code})` : clean;
}

export function getStateCode(codeOrName?: string): string {
  if (!codeOrName) return '';
  const clean = codeOrName.toUpperCase().trim();
  const match = STATE_MAP.get(clean);
  return match ? match.code : clean;
}

/**
 * Smartly parse a search query string to see if the user typed both a plate and a state
 * Examples:
 *  - "7XYZ999 CA" -> { plate: "7XYZ999", state: "CA" }
 *  - "CA 7XYZ999" -> { plate: "7XYZ999", state: "CA" }
 *  - "California: 7XYZ999" -> { plate: "7XYZ999", state: "CA" }
 *  - "GT3-992 Texas" -> { plate: "GT3-992", state: "TX" }
 *  - "7XYZ999" -> { plate: "7XYZ999", state: null }
 */
export function parsePlateAndStateQuery(rawQuery: string): {
  plate: string;
  state: string | null;
  hasStateMatch: boolean;
} {
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    return { plate: '', state: null, hasStateMatch: false };
  }

  // Check prefix or suffix tokens
  const parts = trimmed.split(/[\s,:\-_|]+/);

  if (parts.length >= 2) {
    const first = parts[0].toUpperCase();
    const last = parts[parts.length - 1].toUpperCase();

    // Check if first token is a state
    if (STATE_MAP.has(first)) {
      const stateObj = STATE_MAP.get(first)!;
      const remainingPlate = parts.slice(1).join(' ');
      return {
        plate: remainingPlate,
        state: stateObj.code,
        hasStateMatch: true,
      };
    }

    // Check if last token is a state
    if (STATE_MAP.has(last)) {
      const stateObj = STATE_MAP.get(last)!;
      const remainingPlate = parts.slice(0, -1).join(' ');
      return {
        plate: remainingPlate,
        state: stateObj.code,
        hasStateMatch: true,
      };
    }
  }

  return {
    plate: trimmed,
    state: null,
    hasStateMatch: false,
  };
}
