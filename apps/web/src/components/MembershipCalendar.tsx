import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    format, addMonths, subMonths, startOfMonth, startOfWeek,
    endOfWeek, endOfMonth, eachDayOfInterval, isSameMonth,
    isSameDay, addDays, isAfter, startOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';

interface MembershipCalendarProps {
    startDate?: Date | string;  // Optional currently selected start date (support string to avoid outer components parsing it wrongly)
    endDate?: Date | string;    // Override the duration mathematics with an absolute end date
    durationDays?: number;      // How many days the plan covers (e.g. 30) if no endDate
    readOnly?: boolean;         // If true, the user cannot pick a new date (used in Profile view)
    onChange?: (date: Date) => void; // Callback when a new start date is picked
    memberships?: any[];        // Optional array of memberships to render multiple overlapping plans
}

export default function MembershipCalendar({
    startDate,
    endDate: absoluteEndDate,
    durationDays = 0,
    readOnly = false,
    onChange,
    memberships = [] // For displaying multiple read-only memberships
}: MembershipCalendarProps) {
    const today = startOfDay(new Date());

    // Safely parse Date or String
    const parseSafeDate = (d: Date | string | undefined): Date => {
        if (!d) return today;
        if (typeof d === 'string') {
            // "2026-03-05" -> append time to force local parsing rather than UTC shift
            return startOfDay(new Date(d.includes('T') ? d : `${d}T00:00:00`));
        }
        return startOfDay(d);
    };

    // Fallback to today if no date provided, otherwise use provided start date
    const initialBase = startDate ? parseSafeDate(startDate) : today;

    // Track the currently viewed month in the UI
    const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(initialBase));

    // Internal active selection state
    const [activeStart, setActiveStart] = useState<Date>(initialBase);

    // Sync external props back into state if they change from above (e.g resetting forms)
    useEffect(() => {
        if (startDate) {
            const parsed = parseSafeDate(startDate);
            setActiveStart(parsed);
            setCurrentMonth(startOfMonth(parsed));
        }
    }, [startDate]);

    // Calculate the end date strictly based on activeStart + durationDays, or literal prop
    const endDate = useMemo(() => {
        if (absoluteEndDate) {
            return parseSafeDate(absoluteEndDate);
        }
        if (!durationDays || durationDays <= 0) return null;
        // The last day is activeStart + duration - 1
        return addDays(activeStart, durationDays - 1);
    }, [activeStart, durationDays, absoluteEndDate]);

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    // Generate calendar grid
    const daysInGrid = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }); // Monday
        const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    const handleDayClick = (day: Date) => {
        if (readOnly) return;
        // Optional: Block dates in the distant past? For now allow any.
        setActiveStart(day);
        if (onChange) onChange(day);
    };

    // Helper checks for styling rendering
    const isDayActive = (day: Date) => {
        if (memberships.length > 0) {
            return memberships.some(m => {
                const s = parseSafeDate(m.startDate);
                const e = parseSafeDate(m.endDate);
                return (isAfter(day, s) || isSameDay(day, s)) && (isAfter(e, day) || isSameDay(day, e));
            });
        }

        if (!endDate) return false;
        return (isAfter(day, activeStart) || isSameDay(day, activeStart)) &&
            (isAfter(endDate, day) || isSameDay(day, endDate));
    };

    const isStart = (day: Date) => {
        if (memberships.length > 0) return memberships.some(m => isSameDay(day, parseSafeDate(m.startDate)));
        return isSameDay(day, activeStart);
    };

    const isEnd = (day: Date) => {
        if (memberships.length > 0) return memberships.some(m => isSameDay(day, parseSafeDate(m.endDate)));
        return !!endDate && isSameDay(day, endDate);
    };

    // Style resolver for multiple overlapping plans
    const getMembershipStyle = (day: Date) => {
        if (!readOnly || memberships.length === 0) {
            return { bg: 'rgba(124, 58, 237, 0.15)', color: 'var(--color-primary-light)' };
        }

        const activeMems = memberships.filter(m => {
            const s = parseSafeDate(m.startDate);
            const e = parseSafeDate(m.endDate);
            return (isAfter(day, s) || isSameDay(day, s)) && (isAfter(e, day) || isSameDay(day, e));
        });

        if (activeMems.length === 0) return {};

        // Differentiate colors if it's the current active vs queued vs expired
        const m = activeMems[0];
        if (m.status === 'EXPIRED') return { bg: 'rgba(255, 255, 255, 0.05)', color: 'var(--color-text-muted)' };
        if (m.status === 'ACTIVE' && isAfter(parseSafeDate(m.startDate), today)) return { bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }; // Queued (orangeish)
        return { bg: 'rgba(124, 58, 237, 0.15)', color: 'var(--color-primary-light)' }; // Active (purple)
    };

    return (
        <div style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            {/* Calendar Header Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <button type="button" onClick={prevMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                    <ChevronLeft size={18} />
                </button>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text)', textTransform: 'capitalize' }}>
                    {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </div>
                <button type="button" onClick={nextMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* Weekdays Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
                {['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'].map(day => (
                    <div key={day} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {daysInGrid.map((day, idx) => {
                    const isCurrentMth = isSameMonth(day, currentMonth);
                    const isToday = isSameDay(day, today);
                    const isStartDay = isStart(day);
                    const isEndDay = isEnd(day);
                    const isActive = isDayActive(day);

                    // Base Colors
                    let bgColor = 'transparent';
                    let textColor = isCurrentMth ? 'var(--color-text)' : 'var(--color-text-muted)';
                    let fontWeight = 500;

                    const isConsumed = isActive && readOnly && isAfter(today, day) && !isToday; // Day is in the past
                    const memStyle = getMembershipStyle(day);

                    if (isStartDay || isEndDay) {
                        bgColor = isConsumed ? 'var(--color-border)' : (memStyle.color || 'var(--color-primary)');
                        textColor = isConsumed ? 'var(--color-text-muted)' : 'white';
                        fontWeight = 700;
                    } else if (isActive) {
                        bgColor = isConsumed ? 'var(--color-surface-1)' : (memStyle.bg || 'rgba(124, 58, 237, 0.15)');
                        textColor = isConsumed ? 'var(--color-text-muted)' : (memStyle.color || 'var(--color-primary-light)');
                    }

                    const isInteractive = !readOnly && isCurrentMth;

                    return (
                        <div key={idx}
                            onClick={() => isInteractive ? handleDayClick(day) : undefined}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                height: '32px', fontSize: '12px', fontWeight,
                                color: textColor,
                                background: bgColor,
                                borderRadius: isStartDay ? '8px 0 0 8px' : isEndDay ? '0 8px 8px 0' : isActive ? '0' : '8px',
                                opacity: isCurrentMth ? 1 : 0.3,
                                cursor: isInteractive ? 'pointer' : 'default',
                                border: isToday && !isActive ? '1px solid var(--color-border)' : isToday && isActive ? `2px solid ${memStyle.color || 'var(--color-primary)'}` : '1px solid transparent',
                                transition: 'all 0.1s'
                            }}>
                            {format(day, 'd')}
                        </div>
                    );
                })}
            </div>

            {/* Summary Legend below calendar */}
            {durationDays > 0 && (
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        <strong style={{ color: 'var(--color-text)' }}>{durationDays} días</strong> plan de entrenamiento
                    </div>
                    {endDate && (
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            Vence: <strong style={{ color: 'var(--color-warning)' }}>{format(endDate, 'dd/MM/yyyy')}</strong>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
