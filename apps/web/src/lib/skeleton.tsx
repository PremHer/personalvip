'use client';

export function SkeletonLine({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
    return <div className={`skeleton skeleton-line ${className}`} style={style} />;
}

export function SkeletonCard({ children, style = {} }: { children?: React.ReactNode; style?: React.CSSProperties }) {
    return <div className="skeleton-card" style={style}>{children || <DefaultCardContent />}</div>;
}

function DefaultCardContent() {
    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div className="skeleton skeleton-circle" style={{ width: '36px', height: '36px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                    <div className="skeleton skeleton-line lg" />
                    <div className="skeleton skeleton-line sm" style={{ marginBottom: 0 }} />
                </div>
            </div>
        </>
    );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="table-container">
            <table className="data-table">
                <thead>
                    <tr>
                        {Array.from({ length: cols }).map((_, i) => (
                            <th key={i}><div className="skeleton skeleton-line" style={{ width: `${60 + Math.random() * 40}%`, height: '12px', marginBottom: 0 }} /></th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, r) => (
                        <tr key={r}>
                            {Array.from({ length: cols }).map((_, c) => (
                                <td key={c}><div className="skeleton skeleton-line" style={{ width: `${50 + Math.random() * 50}%`, height: '12px', marginBottom: 0 }} /></td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function SkeletonDashboard() {
    return (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="skeleton-card" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="skeleton" style={{ width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                                <div className="skeleton skeleton-line xl" />
                                <div className="skeleton skeleton-line sm" style={{ marginBottom: 0 }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {/* Second row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {[1, 2, 3].map(i => (
                    <div key={i} className="skeleton-card" style={{ padding: '16px' }}>
                        <div className="skeleton skeleton-line lg" />
                        <div className="skeleton skeleton-line sm" style={{ marginBottom: 0 }} />
                    </div>
                ))}
            </div>
            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                {[1, 2].map(i => (
                    <div key={i} className="skeleton-card" style={{ padding: '20px' }}>
                        <div className="skeleton skeleton-line" style={{ width: '40%', height: '14px', marginBottom: '12px' }} />
                        <div className="skeleton" style={{ height: '200px', borderRadius: '8px' }} />
                    </div>
                ))}
            </div>
        </div>
    );
}
