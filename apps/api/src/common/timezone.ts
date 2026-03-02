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
    const d = new Date(date);
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
    const peru = new Date(utcMs + PERU_OFFSET_HOURS * 3600000);
    peru.setHours(0, 0, 0, 0);
    return new Date(peru.getTime() - PERU_OFFSET_HOURS * 3600000);
}

/** Returns end of a specific date in Peru time, as a UTC Date */
export function dayEndPeru(date: Date | string): Date {
    const d = new Date(date);
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
    const peru = new Date(utcMs + PERU_OFFSET_HOURS * 3600000);
    peru.setHours(23, 59, 59, 999);
    return new Date(peru.getTime() - PERU_OFFSET_HOURS * 3600000);
}
