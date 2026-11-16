export interface ParsedReceiptDateTime {
  rawDateStr: string | null;
  rawTimeStr: string | null;
  rawDateTimeStr: string | null;
  date: Date | null;
  formattedDate: string | null;
  formattedTime: string | null;
  formattedDateTime: string | null;
  year: number | null;
  month: number | null;
  day: number | null;
  hours: number | null;
  minutes: number | null;
  seconds: number | null;
  hasTime: boolean;
  hasDate: boolean;
  confidence: number;
}

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export class ReceiptDateParser {
  /**
   * Cleans text from hidden Unicode marks (LTR, RTL, directional overrides, zero-width)
   */
  public static cleanText(text: string): string {
    return text.replace(/[\u200E\u200F\u202A-\u202E\uFEFF]/g, ' ')
               .replace(/\s+/g, ' ')
               .trim();
  }

  /**
   * Formats 24h hours, minutes, seconds into standard 12h representation:
   * e.g. 13:15:54 -> "01:15:54 PM"
   * e.g. 00:15:54 -> "12:15:54 AM"
   * e.g. 12:00:00 -> "12:00:00 PM"
   * e.g. 23:59:59 -> "11:59:59 PM"
   */
  public static formatTime12h(hours: number, minutes: number, seconds: number): string {
    const period = hours >= 12 ? 'PM' : 'AM';
    let h12 = hours % 12;
    if (h12 === 0) h12 = 12;
    return `${pad(h12)}:${pad(minutes)}:${pad(seconds)} ${period}`;
  }

  /**
   * Formats year, month, day into standard representation:
   * e.g. 2026, 11, 15 -> "15/11/2026"
   */
  public static formatDateStr(year: number, month: number, day: number): string {
    return `${pad(day)}/${pad(month)}/${year}`;
  }

  /**
   * Comprehensive parser that extracts Date and Time independently from raw OCR text
   */
  public static parse(rawText: string): ParsedReceiptDateTime {
    const cleanedFullText = this.cleanText(rawText);
    const lines = rawText.split('\n').map(l => this.cleanText(l)).filter(Boolean);

    let targetSection = '';

    // First search in lines mentioning date or time
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/تاريخ|زمن|التاريخ/i.test(line)) {
        targetSection += ' ' + line;
        if (i + 1 < lines.length) targetSection += ' ' + lines[i + 1];
      }
    }

    if (!targetSection) {
      targetSection = cleanedFullText;
    }

    let year: number | null = null;
    let month: number | null = null;
    let day: number | null = null;
    let rawDateStr: string | null = null;

    let hours: number | null = null;
    let minutes: number | null = null;
    let seconds: number | null = null;
    let rawTimeStr: string | null = null;

    // 1. Extract Date
    // Pattern A: DD-MMM-YYYY (e.g. 15-Nov-2026, 16-November-2026)
    const matchNamedMonth = targetSection.match(/\b(\d{1,2})[-/]([A-Za-z]{3,9})[-/](\d{4})\b/i) ||
                            cleanedFullText.match(/\b(\d{1,2})[-/]([A-Za-z]{3,9})[-/](\d{4})\b/i);
    if (matchNamedMonth) {
      const d = parseInt(matchNamedMonth[1], 10);
      const mStr = matchNamedMonth[2].toLowerCase();
      const y = parseInt(matchNamedMonth[3], 10);
      if (MONTH_MAP[mStr] && d >= 1 && d <= 31 && y >= 2000 && y <= 2100) {
        day = d;
        month = MONTH_MAP[mStr];
        year = y;
        rawDateStr = matchNamedMonth[0];
      }
    }

    // Pattern B: YYYY-MM-DD (e.g. 2026-11-15)
    if (!year) {
      const matchIso = targetSection.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/) ||
                       cleanedFullText.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
      if (matchIso) {
        const y = parseInt(matchIso[1], 10);
        const m = parseInt(matchIso[2], 10);
        const d = parseInt(matchIso[3], 10);
        if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          year = y;
          month = m;
          day = d;
          rawDateStr = matchIso[0];
        }
      }
    }

    // Pattern C: DD/MM/YYYY
    if (!year) {
      const matchSlash = targetSection.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/) ||
                         cleanedFullText.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
      if (matchSlash) {
        const d = parseInt(matchSlash[1], 10);
        const m = parseInt(matchSlash[2], 10);
        const y = parseInt(matchSlash[3], 10);
        if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          year = y;
          month = m;
          day = d;
          rawDateStr = matchSlash[0];
        }
      }
    }

    // 2. Extract Time
    // Pattern: HH:mm:ss or HH:mm (supports 24h and 12h AM/PM/ص/م)
    const timeMatch = targetSection.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm|ص|م)?\b/) ||
                      cleanedFullText.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm|ص|م)?\b/);

    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const min = parseInt(timeMatch[2], 10);
      const sec = timeMatch[3] !== undefined ? parseInt(timeMatch[3], 10) : 0;
      const period = timeMatch[4] ? timeMatch[4].toUpperCase() : null;

      if (period === 'PM' || period === 'م') {
        if (h < 12) h += 12;
      } else if (period === 'AM' || period === 'ص') {
        if (h === 12) h = 0;
      }

      if (h >= 0 && h <= 23 && min >= 0 && min <= 59 && sec >= 0 && sec <= 59) {
        hours = h;
        minutes = min;
        seconds = sec;
        rawTimeStr = timeMatch[0].trim();
      }
    }

    const hasDate = year !== null && month !== null && day !== null;
    const hasTime = hours !== null && minutes !== null && seconds !== null;

    let date: Date | null = null;
    let formattedDate: string | null = null;
    let formattedTime: string | null = null;
    let formattedDateTime: string | null = null;
    let rawDateTimeStr: string | null = null;

    if (hasDate) {
      formattedDate = this.formatDateStr(year!, month!, day!);
    }

    if (hasTime) {
      formattedTime = this.formatTime12h(hours!, minutes!, seconds!);
    }

    if (hasDate && hasTime) {
      // Construct UTC date to maintain exact numeric consistency everywhere
      date = new Date(Date.UTC(year!, month! - 1, day!, hours!, minutes!, seconds!));
      formattedDateTime = `${formattedDate} ${formattedTime}`;
      rawDateTimeStr = `${rawDateStr} ${rawTimeStr}`;
    } else if (hasDate && !hasTime) {
      // Date only: DO NOT fabricate time as 00:00:00! Keep date at noon UTC or flag
      date = new Date(Date.UTC(year!, month! - 1, day!, 12, 0, 0));
      formattedDateTime = formattedDate;
      rawDateTimeStr = rawDateStr;
    }

    let confidence = 0.0;
    if (hasDate && hasTime) confidence = 0.99;
    else if (hasDate) confidence = 0.70;
    else if (hasTime) confidence = 0.40;

    return {
      rawDateStr,
      rawTimeStr,
      rawDateTimeStr,
      date,
      formattedDate,
      formattedTime,
      formattedDateTime,
      year,
      month,
      day,
      hours,
      minutes,
      seconds,
      hasTime,
      hasDate,
      confidence
    };
  }
}
