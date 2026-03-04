/**
 * Timezone utility for Peru (America/Lima, UTC-5).
 * Railway servers run in UTC, so we need to offset date calculations.
 */

const PERU_OFFSET_HOURS = -5;

/** Returns the current date/time adjusted to Peru timezone */
export function nowPeru(): Date {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utcMs + PERU_OFFSET_HOURS * 3600000);
}

/** Returns today's start (midnight) in Peru time, as a UTC Date for DB queries */
export function todayStartPeru(): Date {
    const peru = nowPeru();
    peru.setHours(0, 0, 0, 0);
    // Convert back to UTC for DB comparison
    return new Date(peru.getTime() - PERU_OFFSET_HOURS * 3600000);
}

/** Returns today's end (23:59:59.999) in Peru time, as a UTC Date for DB queries */
export function todayEndPeru(): Date {
    const peru = nowPeru();
    peru.setHours(23, 59, 59, 999);
    return new Date(peru.getTime() - PERU_OFFSET_HOURS * 3600000);
}

/** Returns start of a specific date in Peru time, as a UTC Date */
export function dayStartPeru(date: Date | string): Date {
    let y, m, d;
    if (typeof date === 'string') {
        const parts = date.split('T')[0].split('-');
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        d = parseInt(parts[2], 10);
    } else {
        const peruDate = new Date(date.getTime() - (-PERU_OFFSET_HOURS) * 3600000);
        y = peruDate.getUTCFullYear();
        m = peruDate.getUTCMonth();
        d = peruDate.getUTCDate();
    }
    // Force to Peru start of day (00:00:00) using UTC constructor offset
    return new Date(Date.UTC(y, m, d, -PERU_OFFSET_HOURS, 0, 0, 0)); // 05:00 UTC = 00:00 Peru
}

/** Returns end of a specific date in Peru time, as a UTC Date */
export function dayEndPeru(date: Date | string): Date {
    let y, m, d;
    if (typeof date === 'string') {
        const parts = date.split('T')[0].split('-');
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
        d = parseInt(parts[2], 10);
    } else {
        const peruDate = new Date(date.getTime() - (-PERU_OFFSET_HOURS) * 3600000);
        y = peruDate.getUTCFullYear();
        m = peruDate.getUTCMonth();
        d = peruDate.getUTCDate();
    }
    // Force to Peru end of day (23:59:59.999) using UTC constructor offset
    // Instead of forcing mathematical Peru time boundaries (which leaks +5 hours into the next UTC day like "2026-03-09T04:59Z"),
    // We intentionally store the end of the current UTC calendar day ("2026-03-08T23:59:59Z").
    // This allows the Frontend to simply split('T')[0] yielding "2026-03-08" correctly.
    return new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
}
