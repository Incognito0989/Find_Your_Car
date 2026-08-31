import React from 'react';

interface PhotoCardSkeletonProps {
  viewMode?: 'grid' | 'list';
  count?: number;
}

export const PhotoCardSkeleton: React.FC<PhotoCardSkeletonProps> = ({
  viewMode = 'grid',
}) => {
  if (viewMode === 'list') {
    return (
      <div className="relative bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-[20px] overflow-hidden p-4 flex flex-col md:flex-row items-center gap-6 shadow-lg animate-pulse">
        {/* Thumbnail skeleton with shimmer */}
        <div className="relative w-full md:w-64 aspect-[4/3] rounded-xl overflow-hidden shrink-0 bg-white/5 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.8s_infinite]" />
          <div className="absolute top-2.5 left-2.5 w-24 h-6 rounded-full bg-white/10" />
          <div className="absolute top-2.5 right-2.5 w-14 h-5 rounded-full bg-white/10" />
        </div>

        {/* Content Info skeleton */}
        <div className="flex-1 min-w-0 w-full space-y-3 py-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-48 rounded bg-white/15" />
            <div className="h-4 w-12 rounded bg-white/10" />
          </div>
          <div className="h-3 w-36 rounded bg-white/10" />
          <div className="flex items-center gap-2 pt-2">
            <div className="w-5 h-5 rounded-full bg-white/15" />
            <div className="h-3 w-24 rounded bg-white/10" />
          </div>
        </div>

        {/* Action button skeletons */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0">
          <div className="h-9 w-28 rounded-xl bg-white/10" />
          <div className="h-9 w-9 rounded-xl bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-[var(--ps-card-bg,#111111)] border border-[var(--ps-card-border,#2C2C2E)] rounded-[20px] overflow-hidden shadow-lg flex flex-col animate-pulse">
      {/* 4:3 Image Shimmer Box */}
      <div className="relative w-full aspect-[4/3] bg-white/5 overflow-hidden flex items-center justify-center">
        {/* Shimmer wave effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.8s_infinite]" />

        {/* Floating badge skeleton */}
        <div className="absolute top-3 left-3 w-28 h-6 rounded-full bg-white/15" />
        {/* Photo count skeleton */}
        <div className="absolute top-3 right-3 w-16 h-5 rounded-full bg-white/10" />
      </div>

      {/* Card Content Skeleton */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="h-5 w-36 rounded bg-white/15" />
            <div className="h-4 w-10 rounded bg-white/10" />
          </div>
          <div className="h-3 w-28 rounded bg-white/10" />
        </div>

        {/* Tag chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <div className="h-4 w-12 rounded bg-white/10" />
          <div className="h-4 w-16 rounded bg-white/10" />
          <div className="h-4 w-10 rounded bg-white/10" />
        </div>

        {/* Photographer info bar */}
        <div className="pt-3 border-t border-[var(--ps-card-border,#2C2C2E)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/15" />
            <div className="h-3 w-20 rounded bg-white/10" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 rounded-xl bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const PhotoCardSkeletonGrid: React.FC<{
  count?: number;
  viewMode?: 'grid' | 'list';
}> = ({ count = 8, viewMode = 'grid' }) => {
  return (
    <div
      className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'flex flex-col gap-4'
      }
    >
      {Array.from({ length: count }).map((_, idx) => (
        <PhotoCardSkeleton key={`skeleton-${idx}`} viewMode={viewMode} />
      ))}
    </div>
  );
};
