"use client";

import React from "react";
import { useLoading } from "@/lib/contexts/LoadingContext";
import { LoadingType } from "@/lib/types/loading";

interface LoadingProps {
  type?: LoadingType;
  fallback?: React.ReactNode;
  className?: string;
}

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const Spinner = ({ size = "md", className = "" }: SpinnerProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div
      className={`animate-spin rounded-full border-2 border-primary border-t-transparent ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

const ProgressBar = ({ progress }: { progress?: number }) => {
  const width = progress ? `${Math.min(100, Math.max(0, progress))}%` : "0%";

  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width }}
      />
    </div>
  );
};

export function Loading({ type, fallback, className = "" }: LoadingProps) {
  const { isLoading, getLoadingState } = useLoading();

  // If no type is provided, show global loading state
  if (!type) {
    if (!isLoading) return null;
    return (
      <div
        className={`flex flex-col items-center justify-center space-y-4 ${className}`}
      >
        <Spinner size="lg" />
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    );
  }

  // Show loading state for specific operation
  const loadingState = getLoadingState(type);
  if (!loadingState) return fallback || null;

  return (
    <div
      className={`flex flex-col items-center justify-center space-y-4 ${className}`}
    >
      <Spinner size="md" />
      {loadingState.message && (
        <p className="text-sm text-gray-600">{loadingState.message}</p>
      )}
      {loadingState.progress !== undefined && (
        <ProgressBar progress={loadingState.progress} />
      )}
    </div>
  );
}

export function LoadingOverlay({ type, className = "" }: LoadingProps) {
  const { isLoading, getLoadingState } = useLoading();

  // If no type is provided, show global loading overlay
  if (!type && !isLoading) return null;
  if (type && !getLoadingState(type)) return null;

  const loadingState = type ? getLoadingState(type) : undefined;

  return (
    <div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 ${className}`}
    >
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 shadow-xl">
        <div className="flex flex-col items-center space-y-4">
          <Spinner size="lg" />
          {loadingState?.message && (
            <p className="text-center text-gray-600">{loadingState.message}</p>
          )}
          {loadingState?.progress !== undefined && (
            <ProgressBar progress={loadingState.progress} />
          )}
        </div>
      </div>
    </div>
  );
} 