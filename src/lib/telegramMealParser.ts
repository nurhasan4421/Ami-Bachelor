export interface ParsedMealEntry {
  type: 'meal';
  dateStr: string; // YYYY-MM-DD
  displayDate: string; // "Sunday, November 5, 2026"
  meals: Record<string, number>;
  totalMeals: number;
}

export interface ParsedDepositEntry {
  type: 'deposit';
  dateStr: string;
  displayDate: string;
  deposits: Record<string, number>;
  totalAmount: number;
}

export type ParsedTelegramEntry = ParsedMealEntry | ParsedDepositEntry;

// Month names in English and Bangla transliteration
const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

/**
 * Normalizes text: lowercases, converts Bangla digits to English digits
 */
export function normalizeText(text: string): string {
  const banglaDigits: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return text
    .replace(/[০-৯]/g, (d) => banglaDigits[d] || d)
    .trim();
}

/**
 * Format a Date object into "Sunday, November 5, 2026"
 */
export function formatDisplayDate(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Extract target date from text. Defaults to today.
 * Supports:
 * - "meal 5-", "5 tarikh", "5 traikh", "5th", "5 tarik", "date 5"
 * - "today", "ajke", "ajker"
 * - "yesterday", "kal", "kalke", "kaler", "gothokal"
 * - "2026-11-05"
 */
export function extractDateFromText(text: string, referenceDate: Date = new Date()): { date: Date; textWithoutDate: string } {
  const normalized = normalizeText(text);
  const now = new Date(referenceDate);

  // Check today / yesterday
  if (/\b(yesterday|kal|kalke|kaler|gothokal|goto\s*kal)\b/i.test(normalized)) {
    const yDay = new Date(now);
    yDay.setDate(yDay.getDate() - 1);
    const cleaned = normalized.replace(/\b(yesterday|kal|kalke|kaler|gothokal|goto\s*kal)\b/gi, ' ');
    return { date: yDay, textWithoutDate: cleaned };
  }

  if (/\b(today|aj|ajke|ajker)\b/i.test(normalized)) {
    const cleaned = normalized.replace(/\b(today|aj|ajke|ajker)\b/gi, ' ');
    return { date: now, textWithoutDate: cleaned };
  }

  // Check explicit ISO YYYY-MM-DD
  const isoMatch = normalized.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const parsed = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    const cleaned = normalized.replace(isoMatch[0], ' ');
    return { date: parsed, textWithoutDate: cleaned };
  }

  // Check day of month: "meal 5", "5 tarikh", "5 traikh", "5th", "tarikh 5", "date 5"
  const dayPatterns = [
    /(?:meal|mil|tarikh|traikh|tarik|date)?\s*(\d{1,2})\s*(?:tarikh|traikh|tarik|th|st|nd|rd)?\s*[:-]/i,
    /(\d{1,2})\s*(?:tarikh|traikh|tarik|th|st|nd|rd)/i,
    /(?:meal|mil|date|tarikh)\s*(\d{1,2})\b/i,
  ];

  for (const pat of dayPatterns) {
    const match = normalized.match(pat);
    if (match && match[1]) {
      const dayNum = parseInt(match[1], 10);
      if (dayNum >= 1 && dayNum <= 31) {
        const target = new Date(now.getFullYear(), now.getMonth(), dayNum);
        const cleaned = normalized.replace(match[0], ' ');
        return { date: target, textWithoutDate: cleaned };
      }
    }
  }

  return { date: now, textWithoutDate: normalized };
}

/**
 * Fuzzy matches a raw name token against the registered roommate names in the hostel
 */
export function matchRoommateName(rawToken: string, registeredNames: string[]): string | null {
  const cleanToken = rawToken.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!cleanToken) return null;

  // 1. Exact match
  for (const name of registeredNames) {
    if (name.toLowerCase() === cleanToken) return name;
  }

  // 2. Starts with / prefix match
  for (const name of registeredNames) {
    const normName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normName.startsWith(cleanToken) || cleanToken.startsWith(normName)) {
      return name;
    }
  }

  // 3. Substring match
  for (const name of registeredNames) {
    const normName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normName.includes(cleanToken) || cleanToken.includes(normName)) {
      return name;
    }
  }

  return null;
}

/**
 * Parses a free-form message for meal updates.
 * Examples:
 * - "meal 5- nur 1, ajmain 1 , tanvir 2"
 * - "5 traikh nur 1 meal,ajmain 2 ,tanvir 1 meal,baki sobai 0"
 * - "ajker meal: Nur 2, Siam 1, Tanvir 0"
 * - "nur 1, rakib 2, siam 1, baki 0"
 */
export function parseMealMessage(
  rawText: string,
  knownRoommates: string[],
  referenceDate: Date = new Date()
): ParsedMealEntry | null {
  const { date, textWithoutDate } = extractDateFromText(rawText, referenceDate);

  // Remove common filler words
  let cleaned = textWithoutDate
    .replace(/\b(meal|meals|mil|er|khabar|kheyeche|khelo)\b/gi, ' ')
    .replace(/[:\-_]/g, ' ')
    .replace(/,/g, ' , ')
    .replace(/\s+/g, ' ')
    .trim();

  // Check if "baki sobai 0" or "others 0" is specified
  const isBakiZero = /\b(baki|sobai|others|rest)\s*(sobai|all)?\s*([0-9]+)?\b/i.test(cleaned);

  const mealMap: Record<string, number> = {};

  // If "baki sobai 0" is present, set all roommates to 0 by default
  if (isBakiZero) {
    for (const r of knownRoommates) {
      mealMap[r] = 0;
    }
  }

  // Remove "baki sobai 0" pattern from text to not confuse name matcher
  cleaned = cleaned.replace(/\b(baki|sobai|others|rest)\s*(sobai|all)?\s*([0-9]+)?\b/gi, ' ');

  // Look for Name + Number pairs
  // e.g. "nur 1", "ajmain 2", "tanvir 1.5", "1 nur"
  const tokens = cleaned.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);

  for (const token of tokens) {
    // sub-split by spaces
    const subParts = token.split(/\s+/).filter(Boolean);
    for (let i = 0; i < subParts.length; i++) {
      const part = subParts[i];
      // Check if current part is a name and next part is a number: "nur 1" or "nur 1.5"
      const matched = matchRoommateName(part, knownRoommates);
      if (matched && i + 1 < subParts.length) {
        const nextPart = subParts[i + 1];
        const num = parseFloat(nextPart);
        if (!isNaN(num) && num >= 0 && num <= 10) {
          mealMap[matched] = num;
          i++; // skip number
          continue;
        }
      }

      // Check reverse: number first then name: "1 nur"
      const asNum = parseFloat(part);
      if (!isNaN(asNum) && asNum >= 0 && asNum <= 10 && i + 1 < subParts.length) {
        const revMatched = matchRoommateName(subParts[i + 1], knownRoommates);
        if (revMatched) {
          mealMap[revMatched] = asNum;
          i++; // skip name
          continue;
        }
      }
    }
  }

  // Also check single un-tokenized string in case commas were omitted: "nur 1 ajmain 2 tanvir 1"
  if (Object.keys(mealMap).length === 0) {
    const words = cleaned.split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length - 1; i++) {
      const matched = matchRoommateName(words[i], knownRoommates);
      if (matched) {
        const num = parseFloat(words[i + 1]);
        if (!isNaN(num) && num >= 0 && num <= 10) {
          mealMap[matched] = num;
          i++;
        }
      }
    }
  }

  if (Object.keys(mealMap).length === 0) {
    return null;
  }

  const totalMeals = Object.values(mealMap).reduce((sum, val) => sum + val, 0);

  return {
    type: 'meal',
    dateStr: formatDateISO(date),
    displayDate: formatDisplayDate(date),
    meals: mealMap,
    totalMeals
  };
}

/**
 * Parses deposit messages.
 * Examples:
 * - "deposit nur 1500, ajmain 2000"
 * - "joma 5 tarik nur 2000"
 */
export function parseDepositMessage(
  rawText: string,
  knownRoommates: string[],
  referenceDate: Date = new Date()
): ParsedDepositEntry | null {
  const isDeposit = /\b(deposit|joma|payment|taka|tk|fund)\b/i.test(rawText);
  if (!isDeposit) return null;

  const { date, textWithoutDate } = extractDateFromText(rawText, referenceDate);
  const cleaned = textWithoutDate
    .replace(/\b(deposit|joma|payment|taka|tk|fund|dilo|dise)\b/gi, ' ')
    .replace(/[:\-_]/g, ' ')
    .replace(/,/g, ' , ')
    .replace(/\s+/g, ' ')
    .trim();

  const depositMap: Record<string, number> = {};
  const words = cleaned.split(/\s+/).filter(Boolean);

  for (let i = 0; i < words.length - 1; i++) {
    const matched = matchRoommateName(words[i], knownRoommates);
    if (matched) {
      const num = parseFloat(words[i + 1]);
      if (!isNaN(num) && num > 0) {
        depositMap[matched] = num;
        i++;
      }
    } else {
      // number then name: "1500 nur"
      const asNum = parseFloat(words[i]);
      if (!isNaN(asNum) && asNum > 0) {
        const revMatched = matchRoommateName(words[i + 1], knownRoommates);
        if (revMatched) {
          depositMap[revMatched] = asNum;
          i++;
        }
      }
    }
  }

  if (Object.keys(depositMap).length === 0) return null;

  const totalAmount = Object.values(depositMap).reduce((sum, val) => sum + val, 0);

  return {
    type: 'deposit',
    dateStr: formatDateISO(date),
    displayDate: formatDisplayDate(date),
    deposits: depositMap,
    totalAmount
  };
}
