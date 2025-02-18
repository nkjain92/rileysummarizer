'use client';

export default function LoadingCard() {
  return (
    <div className="animate-pulse bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-purple-100/20">
      {/* Title skeleton */}
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
      
      {/* Channel and date skeleton */}
      <div className="flex gap-4 mb-6">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/6"></div>
      </div>
      
      {/* Summary skeleton */}
      <div className="space-y-3 mb-6">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
      </div>
      
      {/* Tags skeleton */}
      <div className="flex gap-2">
        <div className="h-6 bg-gray-200 rounded w-16"></div>
        <div className="h-6 bg-gray-200 rounded w-20"></div>
        <div className="h-6 bg-gray-200 rounded w-24"></div>
      </div>
    </div>
  );
}
