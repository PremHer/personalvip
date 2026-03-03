import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    format, addMonths, subMonths, startOfMonth, startOfWeek,
    endOfWeek, endOfMonth, eachDayOfInterval, isSameMonth,
    isSameDay, addDays, isAfter, startOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';

interface MembershipCalendarProps {
    startDate?: Date;           // Optional currently selected start date
    durationDays?: number;      // How many days the plan covers (e.g. 30)
    readOnly?: boolean;         // If true, the user cannot pick a new date (used in Profile view)
    onChange?: (date: Date) => void; // Callback when a new start date is picked
}

export default function MembershipCalendar({
    startDate,
    durationDays = 0,
    readOnly = false,
    onChange
}: MembershipCalendarProps) {
    const today = startOfDay(new Date());

    // Fallback to today if no date provided, otherwise use provided start date
    const initialBase = startDate ? startOfDay(startDate) : today;

    // Track the currently viewed month in the UI
    const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(initialBase));

    // Internal active selection state
    const [activeStart, setActiveStart] = useState<Date>(initialBase);

    // Sync external props back into state if they change from above (e.g resetting forms)
    useEffect(() => {
        if (startDate) {
            setActiveStart(startOfDay(startDate));
            setCurrentMonth(startOfMonth(startDate));
        }
    }, [startDate]);

    // Calculate the end date strictly based on activeStart + durationDays
    const endDate = useMemo(() => {
        if (!durationDays || durationDays <= 0) return null;
        // The last day is activeStart + duration - 1
        return addDays(activeStart, durationDays - 1);
    }, [activeStart, durationDays]);

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
        if (!endDate) return false;
        return (isAfter(day, activeStart) || isSameDay(day, activeStart)) &&
            (isAfter(endDate, day) || isSameDay(day, endDate));
    };

    const isStart = (day: Date) => isSameDay(day, activeStart);
    const isEnd = (day: Date) => !!endDate && isSameDay(day, endDate);

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

                    if (isStartDay || isEndDay) {
                        bgColor = isConsumed ? 'var(--color-border)' : 'var(--color-primary)';
                        textColor = isConsumed ? 'var(--color-text-muted)' : 'white';
                        fontWeight = 700;
                    } else if (isActive) {
                        bgColor = isConsumed ? 'var(--color-surface-1)' : 'rgba(124, 58, 237, 0.15)'; // Gray out or Primary light 
                        textColor = isConsumed ? 'var(--color-text-muted)' : 'var(--color-primary-light)';
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
                                border: isToday && !isActive ? '1px solid var(--color-border)' : isToday && isActive ? '2px solid var(--color-primary)' : '1px solid transparent',
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
