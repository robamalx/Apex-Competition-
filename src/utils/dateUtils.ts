/**
 * Apex Football Competitions — Centralized Date & EAT Formatting Utility
 * Prevents "Invalid Date" under all circumstances and formats times to EAT (Africa/Addis_Ababa, UTC+3).
 */

export function parseSafeDate(dateInput: any): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return d;
}

export function formatDateEAT(dateInput: any, fallback = 'TBD'): string {
  const d = parseSafeDate(dateInput);
  if (!d) return fallback;
  try {
    const day = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Addis_Ababa' }).toUpperCase();
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Addis_Ababa' });
    return `${day}, ${time} EAT`;
  } catch {
    return fallback;
  }
}

export function formatShortDateEAT(dateInput: any, fallback = 'TBD'): string {
  const d = parseSafeDate(dateInput);
  if (!d) return fallback;
  try {
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'Africa/Addis_Ababa'
    });
  } catch {
    return fallback;
  }
}

export function formatTimeEAT(dateInput: any, fallback = 'TBD'): string {
  const d = parseSafeDate(dateInput);
  if (!d) return fallback;
  try {
    return d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Africa/Addis_Ababa'
    }) + ' EAT';
  } catch {
    return fallback;
  }
}

export function resolveFixtureKickoff(f: any): string | null {
  if (!f || typeof f !== 'object') return null;

  if (f.kickoffUtc) {
    const val = String(f.kickoffUtc).trim();
    if (val && val.toUpperCase() !== 'TBD' && val.toUpperCase() !== 'TBA' && val.toUpperCase() !== 'UNDEFINED' && val.toUpperCase() !== 'NULL') {
      const parsedMs = Date.parse(val);
      if (!isNaN(parsedMs)) {
        return new Date(parsedMs).toISOString();
      }
    }
  }

  // List of fields to check in descending priority order
  const fields = [
    'utcDate',
    'kickoffTimeUtc',
    'kickoffTime',
    'kickoff',
    'kickoffAt',
    'startTime',
    'scheduledAt',
    'matchDate',
    'date'
  ];

  for (const field of fields) {
    const val = f[field];
    if (val === undefined || val === null) continue;
    const str = String(val).trim();
    if (!str || str.toUpperCase() === 'TBD' || str.toUpperCase() === 'TBA' || str.toUpperCase() === 'UNDEFINED' || str.toUpperCase() === 'NULL') continue;

    const hasDatePart = /\d{4}[-/]\d{2}[-/]\d{2}/.test(str) || /[A-Za-z]{3}\s+\d{1,2}/.test(str) || /\d{1,2}\s+[A-Za-z]{3}/.test(str);
    
    let parsedMs = NaN;

    if (hasDatePart) {
      if (str.toUpperCase().includes('EAT')) {
        const cleaned = str.replace(/\s+EAT/gi, '').replace(/T/gi, ' ');
        const match = cleaned.match(/(\d{4})[-/](\d{2})[-/](\d{2})\s+(\d{2}):(\d{2})/);
        if (match) {
          const [_, y, m, d, hh, mm] = match;
          const utcMs = Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(hh), parseInt(mm));
          parsedMs = utcMs - 3 * 60 * 60 * 1000;
        } else {
          const normalMs = Date.parse(cleaned);
          if (!isNaN(normalMs)) {
            parsedMs = normalMs;
          }
        }
      } else {
        parsedMs = Date.parse(str);
      }
    } else {
      // It is a time-only string (like "18:00" or "18:00 EAT"), find a date in other fields
      const dateFields = ['matchDate', 'date', 'utcDate', 'kickoffTimeUtc', 'kickoffAt', 'startTime', 'scheduledAt'];
      let datePart = '';
      for (const df of dateFields) {
        if (df === field) continue;
        const dVal = f[df];
        if (dVal) {
          const dStr = String(dVal).trim();
          if (dStr && dStr.toUpperCase() !== 'TBD' && dStr.toUpperCase() !== 'TBA') {
            const dMatch = dStr.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
            if (dMatch) {
              datePart = dMatch[0];
              break;
            }
          }
        }
      }

      if (datePart) {
        const cleanTime = str.replace(/\s+EAT/gi, '');
        const timeMatch = cleanTime.match(/(\d{2}):(\d{2})/);
        if (timeMatch) {
          const [_, hh, mm] = timeMatch;
          const y = datePart.substring(0, 4);
          const m = datePart.substring(5, 7);
          const d = datePart.substring(8, 10);
          if (str.toUpperCase().includes('EAT')) {
            const utcMs = Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(hh), parseInt(mm));
            parsedMs = utcMs - 3 * 60 * 60 * 1000;
          } else {
            parsedMs = Date.parse(`${datePart}T${hh}:${mm}:00Z`);
          }
        }
      }
    }

    if (!isNaN(parsedMs)) {
      return new Date(parsedMs).toISOString();
    }
  }

  return null;
}

export function getFixtureKickoffDisplay(fixture: any): {
  kickoff: string | null;
  dateLabel: string;
  timeLabel: string;
  available: boolean;
} {
  const kickoff = resolveFixtureKickoff(fixture);
  if (!kickoff) {
    return {
      kickoff: null,
      dateLabel: 'Kickoff time unavailable',
      timeLabel: 'Unavailable',
      available: false
    };
  }
  
  return {
    kickoff,
    dateLabel: formatShortDateEAT(kickoff, 'Kickoff time unavailable'),
    timeLabel: formatTimeEAT(kickoff, 'Unavailable'),
    available: true
  };
}
