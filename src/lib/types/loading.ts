/**
 * Loading state types
 */
export enum LoadingType {
  // Data Operations
  DATA_FETCH = "data/fetch",
  DATA_SAVE = "data/save",
  DATA_DELETE = "data/delete",

  // File Operations
  FILE_UPLOAD = "file/upload",
  FILE_DOWNLOAD = "file/download",

  // API Operations
  API_REQUEST = "api/request",
  API_RESPONSE = "api/response",

  // AI Operations
  AI_PROCESSING = "ai/processing",
  AI_GENERATING = "ai/generating",
  AI_TRANSCRIBING = "ai/transcribing",

  // Video Operations
  VIDEO_PROCESSING = "video/processing",
  VIDEO_TRANSCRIBING = "video/transcribing",
  VIDEO_SUMMARIZING = "video/summarizing"
}

/**
 * Loading state interface
 */
export interface LoadingState {
  type: LoadingType;
  message?: string;
  progress?: number;
  startTime: number;
}

/**
 * Loading context interface
 */
export interface LoadingContextType {
  isLoading: boolean;
  loadingState: LoadingState | null;
  startLoading: (type: LoadingType, message?: string) => void;
  updateLoading: (progress: number) => void;
  stopLoading: () => void;
} 