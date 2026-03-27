export interface GS1Data {
  gtin?: string;
  batch?: string;
  expiryDate?: string;
  serial?: string;
}

const FIXED_LENGTH_AIS: Record<string, number> = {
  "01": 14,
  "17": 6,
};

const VARIABLE_AIS = new Set(["10", "21"]);
const KNOWN_AIS = new Set(["01", "10", "17", "21"]);

const parseParenthesized = (raw: string): GS1Data => {
  const data: GS1Data = {};
  const regex = /\((01|10|17|21)\)([^()\u001d]+)/g;

  for (const match of raw.matchAll(regex)) {
    const [, ai, value] = match;
    const normalized = value.trim();
    if (ai === "01") {
      data.gtin = normalized;
    } else if (ai === "10") {
      data.batch = normalized;
    } else if (ai === "17") {
      data.expiryDate = normalized;
    } else if (ai === "21") {
      data.serial = normalized;
    }
  }

  return data;
};

const findNextAiIndex = (value: string, start: number): number => {
  for (let i = start; i < value.length - 1; i += 1) {
    if (KNOWN_AIS.has(value.slice(i, i + 2))) {
      return i;
    }
  }
  return value.length;
};

const parseRawAiString = (raw: string): GS1Data => {
  const compact = raw.replace(/[()]/g, "").replace(/\u001d/g, "");
  const data: GS1Data = {};

  let index = 0;
  while (index < compact.length - 1) {
    const ai = compact.slice(index, index + 2);
    if (!KNOWN_AIS.has(ai)) {
      index += 1;
      continue;
    }

    index += 2;
    if (ai in FIXED_LENGTH_AIS) {
      const length = FIXED_LENGTH_AIS[ai]!;
      const value = compact.slice(index, index + length);
      index += length;
      if (ai === "01") {
        data.gtin = value;
      }
      if (ai === "17") {
        data.expiryDate = value;
      }
      continue;
    }

    if (VARIABLE_AIS.has(ai)) {
      const end = findNextAiIndex(compact, index);
      const value = compact.slice(index, end);
      index = end;
      if (ai === "10") {
        data.batch = value;
      }
      if (ai === "21") {
        data.serial = value;
      }
    }
  }

  return data;
};

export function parseGS1(raw: string): GS1Data {
  if (!raw.trim()) {
    return {};
  }

  const fromParenthesized = parseParenthesized(raw);
  if (Object.keys(fromParenthesized).length > 0) {
    return fromParenthesized;
  }

  return parseRawAiString(raw);
}
