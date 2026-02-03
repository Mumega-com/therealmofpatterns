/**
 * Loading Skeleton Components
 * Provides visual placeholders while content loads
 */

import { type CSSProperties } from 'react';

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

// Base skeleton with shimmer animation
export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-[rgba(240,232,216,0.05)] via-[rgba(240,232,216,0.1)] to-[rgba(240,232,216,0.05)] rounded ${className}`}
      style={style}
    />
  );
}

// Text line skeleton
export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: i === lines - 1 && lines > 1 ? '70%' : '100%' }}
        />
      ))}
    </div>
  );
}

// Circle skeleton (avatars, icons)
export function SkeletonCircle({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <Skeleton
      className={`rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

// Card skeleton
export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`p-4 rounded-xl border border-[rgba(212,168,84,0.1)] bg-[rgba(26,24,20,0.4)] ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <SkeletonCircle size={32} />
        <Skeleton className="h-4 w-24" />
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

// Gauge/chart skeleton
export function SkeletonGauge({ className = '' }: SkeletonProps) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <SkeletonCircle size={120} />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

// Theater scene skeleton
export function SkeletonTheaterScene({ className = '' }: SkeletonProps) {
  return (
    <div className={`relative aspect-video rounded-lg overflow-hidden ${className}`}>
      <Skeleton className="absolute inset-0" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
        <Skeleton className="h-6 w-48" />
        <SkeletonText lines={2} className="max-w-md" />
        <div className="flex gap-2 mt-4">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Dashboard stats skeleton
export function SkeletonStats({ count = 4, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-lg border border-[rgba(212,168,84,0.1)] bg-[rgba(26,24,20,0.3)]">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

// Dimension list skeleton
export function SkeletonDimensions({ className = '' }: SkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonCircle size={24} />
          <div className="flex-1">
            <Skeleton className="h-3 w-24 mb-1" />
            <Skeleton className="h-2 w-full" />
          </div>
          <Skeleton className="h-4 w-8" />
        </div>
      ))}
    </div>
  );
}

// Check-in history skeleton
export function SkeletonCheckinHistory({ className = '' }: SkeletonProps) {
  return (
    <div className={className}>
      <Skeleton className="h-5 w-32 mb-4" />
      <div className="flex items-end justify-between gap-1 h-20">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <Skeleton
              className="w-full rounded-t"
              style={{ height: `${30 + Math.random() * 50}%` }}
            />
            <Skeleton className="h-2 w-3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default Skeleton;
