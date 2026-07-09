import React from 'react';

// Shimmering placeholder blocks shown while data loads, instead of a bare
// spinner. Uses theme tokens so it works in light and dark mode.

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  radius = 6,
  className = '',
  style,
}) => (
  <span
    className={`skeleton-shimmer ${className}`}
    style={{
      display: 'block',
      width,
      height,
      borderRadius: radius,
      ...style,
    }}
  />
);

// A skeleton table body: `rows` × `cols` shimmering cells. Drop into a
// <tbody> while the real rows are loading.
export const SkeletonRows: React.FC<{ rows?: number; cols: number }> = ({ rows = 6, cols }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r}>
        {Array.from({ length: cols }).map((_, c) => (
          <td key={c} className="px-4 py-3">
            <Skeleton width={c === 0 ? '70%' : '50%'} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

// A grid of skeleton cards (e.g. product grid).
export const SkeletonCards: React.FC<{ count?: number; className?: string }> = ({
  count = 6,
  className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
}) => (
  <div className={className}>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="p-4 rounded-xl"
        style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
      >
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={10} style={{ marginTop: 10 }} />
        <div className="flex justify-between items-end" style={{ marginTop: 20 }}>
          <Skeleton width={60} height={20} />
          <Skeleton width={40} height={14} />
        </div>
      </div>
    ))}
  </div>
);
