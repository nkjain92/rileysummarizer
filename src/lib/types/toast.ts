/**
 * Toast variant types
 */
export enum ToastVariant {
  SUCCESS = "success",
  ERROR = "error",
  WARNING = "warning",
  INFO = "info"
}

/**
 * Toast position types
 */
export enum ToastPosition {
  TOP = "top",
  TOP_RIGHT = "top-right",
  TOP_LEFT = "top-left",
  BOTTOM = "bottom",
  BOTTOM_RIGHT = "bottom-right",
  BOTTOM_LEFT = "bottom-left"
}

/**
 * Individual toast notification
 */
export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  title?: string;
  duration?: number;
  position?: ToastPosition;
  isClosable?: boolean;
  onClose?: () => void;
}

/**
 * Toast context state
 */
export interface ToastContextState {
  toasts: Toast[];
}

/**
 * Toast context actions
 */
export interface ToastContextActions {
  showToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

/**
 * Toast options for simplified usage
 */
export interface ToastOptions {
  title?: string;
  duration?: number;
  position?: ToastPosition;
  isClosable?: boolean;
  onClose?: () => void;
}

/**
 * Default toast settings
 */
export const DEFAULT_TOAST_DURATION = 5000; // 5 seconds
export const DEFAULT_TOAST_POSITION = ToastPosition.TOP_RIGHT;
export const DEFAULT_TOAST_CLOSABLE = true; 