export interface ParsedMealEntry {
  type: 'meal';
  dateStr: string; // YYYY-MM-DD
  displayDate: string; // "Sunday, November 5, 2026"
  meals: Record<string, number>;
  totalMeals: number;
}

export interface ParsedExpenseEntry {
  type: 'expense';
  dateStr: string;
  displayDate: string;
  category: 'Account' | 'Meal' | 'Grocery';
  paidBy: string;
  amount: number;
  calculatedAmount: number;
  description: string;
  isAmountMismatch: boolean;
  statedAmount: number;
}

export type ParsedTelegramEntry = ParsedMealEntry | ParsedExpenseEntry;

export function normalizeText(text: string): string {
  const banglaDigits: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return text
    .replace(/[০-৯]/g, (d) => banglaDigits[d] || d)
    .trim();
}

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

export function extractDateFromText(text: string, referenceDate: Date = new Date()): { date: Date; textWithoutDate: string } {
  const normalized = normalizeText(text);
  const now = new Date(referenceDate);

  // Check yesterday
  if (/\b(yesterday|kal|kalke|kaler|gothokal|goto\s*kal)\b/i.test(normalized)) {
    const yDay = new Date(now);
    yDay.setDate(yDay.getDate() - 1);
    const cleaned = normalized.replace(/\b(yesterday|kal|kalke|kaler|gothokal|goto\s*kal)\b/gi, ' ');
    return { date: yDay, textWithoutDate: cleaned };
  }

  // Check today
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

export function parseMealMessage(
  rawText: string,
  knownRoommates: string[],
  referenceDate: Date = new Date()
): ParsedMealEntry | null {
  const { date, textWithoutDate } = extractDateFromText(rawText, referenceDate);

  let cleaned = textWithoutDate
    .replace(/\b(meal|meals|mil|er|khabar|kheyeche|khelo)\b/gi, ' ')
    .replace(/[:\-_]/g, ' ')
    .replace(/,/g, ' , ')
    .replace(/\s+/g, ' ')
    .trim();

  const isBakiZero = /\b(baki|sobai|others|rest)\s*(sobai|all)?\s*([0-9]+)?\b/i.test(cleaned);

  const mealMap: Record<string, number> = {};

  if (isBakiZero) {
    for (const r of knownRoommates) {
      mealMap[r] = 0;
    }
  }

  cleaned = cleaned.replace(/\b(baki|sobai|others|rest)\s*(sobai|all)?\s*([0-9]+)?\b/gi, ' ');

  const tokens = cleaned.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);

  for (const token of tokens) {
    const subParts = token.split(/\s+/).filter(Boolean);
    for (let i = 0; i < subParts.length; i++) {
      const part = subParts[i];
      const matched = matchRoommateName(part, knownRoommates);
      if (matched && i + 1 < subParts.length) {
        const nextPart = subParts[i + 1];
        const num = parseFloat(nextPart);
        if (!isNaN(num) && num >= 0 && num <= 10) {
          mealMap[matched] = num;
          i++;
          continue;
        }
      }

      const asNum = parseFloat(part);
      if (!isNaN(asNum) && asNum >= 0 && asNum <= 10 && i + 1 < subParts.length) {
        const revMatched = matchRoommateName(subParts[i + 1], knownRoommates);
        if (revMatched) {
          mealMap[revMatched] = asNum;
          i++;
          continue;
        }
      }
    }
  }

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
 * Parses multi-line or single-line deposit / expense messages (like bazar list)
 * Format example:
 * ajmain - Sim 70
 * Begun 45
 * Alu 50
 * Sosa:25
 * Gajor:50
 * Morich :20
 * Mach 1790
 * Mangsho 1020
 * Dim 270
 * 
 * Total 3340
 */
export function parseBazarExpenseMessage(
  rawText: string,
  knownRoommates: string[],
  selectedCategory: 'Account' | 'Meal' | 'Grocery' = 'Grocery',
  referenceDate: Date = new Date()
): ParsedExpenseEntry | null {
  const normText = normalizeText(rawText);
  const lines = normText.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const { date } = extractDateFromText(normText, referenceDate);

  // 1. Detect Payer (e.g. from first line "ajmain - Sim 70" or "nur 1500" or anywhere)
  let detectedPayer: string | null = null;

  // If category is Grocery, "Meal" is also an allowed payer
  const allowedPayers = selectedCategory === 'Grocery' ? [...knownRoommates, 'Meal'] : knownRoommates;

  // Check top line for "name - item amount" or "name : item amount"
  const firstLine = lines[0];
  const firstDash = firstLine.split(/[-:]/);
  if (firstDash.length > 1) {
    const candidate = matchRoommateName(firstDash[0].trim(), allowedPayers);
    if (candidate) {
      detectedPayer = candidate;
    }
  }

  // If not found in dash split, check first line words
  if (!detectedPayer) {
    const firstWords = firstLine.split(/\s+/);
    for (const w of firstWords) {
      const candidate = matchRoommateName(w, allowedPayers);
      if (candidate) {
        detectedPayer = candidate;
        break;
      }
    }
  }

  // If still not found, search through any line for roommate names
  if (!detectedPayer) {
    for (const line of lines) {
      for (const w of line.split(/[\s\-:]+/)) {
        const candidate = matchRoommateName(w, allowedPayers);
        if (candidate) {
          detectedPayer = candidate;
          break;
        }
      }
      if (detectedPayer) break;
    }
  }

  // Default to first roommate if not found or if user didn't specify
  if (!detectedPayer) {
    detectedPayer = knownRoommates[0] || 'Manager';
  }

  // 2. Parse items and amounts, and look for stated Total
  let calculatedSum = 0;
  let statedTotal: number | null = null;
  const itemLines: string[] = [];

  for (const line of lines) {
    // Check if line is "Total 3340" or "মোট ৩৩৪০"
    const totalMatch = line.match(/\b(total|mot|subtotal|all)\s*[:=\-]?\s*(\d+(?:\.\d+)?)/i);
    if (totalMatch) {
      statedTotal = parseFloat(totalMatch[2]);
      continue;
    }

    // Try to find numbers in this line: e.g. "Begun 45", "Sosa:25", "Mach 1790"
    // Extract last number on the line as amount
    const numMatches = [...line.matchAll(/\b(\d+(?:\.\d+)?)\b/g)];
    if (numMatches.length > 0) {
      const lastMatch = numMatches[numMatches.length - 1];
      const amt = parseFloat(lastMatch[1]);
      if (!isNaN(amt) && amt > 0) {
        calculatedSum += amt;
      }
    }
    itemLines.push(line);
  }

  const finalAmount = statedTotal !== null ? statedTotal : calculatedSum;
  if (finalAmount <= 0) return null;

  const isAmountMismatch = statedTotal !== null && Math.abs(statedTotal - calculatedSum) > 0.01;

  // The full text as description
  const description = rawText.trim();

  return {
    type: 'expense',
    dateStr: formatDateISO(date),
    displayDate: formatDisplayDate(date),
    category: selectedCategory,
    paidBy: detectedPayer,
    amount: finalAmount,
    calculatedAmount: calculatedSum,
    statedAmount: statedTotal !== null ? statedTotal : calculatedSum,
    isAmountMismatch,
    description
  };
}
