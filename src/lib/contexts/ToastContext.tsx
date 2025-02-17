"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import {
  Toast,
  ToastContextState,
  ToastContextActions,
  ToastVariant,
  ToastPosition,
  ToastOptions,
  DEFAULT_TOAST_DURATION,
  DEFAULT_TOAST_POSITION,
  DEFAULT_TOAST_CLOSABLE,
} from "../types/toast";

type ToastAction =
  | { type: "ADD_TOAST"; payload: Toast }
  | { type: "REMOVE_TOAST"; payload: { id: string } }
  | { type: "CLEAR_TOASTS" };

const initialState: ToastContextState = {
  toasts: [],
};

function toastReducer(
  state: ToastContextState,
  action: ToastAction
): ToastContextState {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [...state.toasts, action.payload],
      };
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== action.payload.id),
      };
    case "CLEAR_TOASTS":
      return {
        ...state,
        toasts: [],
      };
    default:
      return state;
  }
}

const ToastContext = createContext<
  (ToastContextState & ToastContextActions) | undefined
>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(toastReducer, initialState);

  const showToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast: Toast = {
        id,
        duration: DEFAULT_TOAST_DURATION,
        position: DEFAULT_TOAST_POSITION,
        isClosable: DEFAULT_TOAST_CLOSABLE,
        ...toast,
      };

      dispatch({ type: "ADD_TOAST", payload: newToast });

      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, newToast.duration);
      }
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    dispatch({ type: "REMOVE_TOAST", payload: { id } });
  }, []);

  const clearToasts = useCallback(() => {
    dispatch({ type: "CLEAR_TOASTS" });
  }, []);

  return (
    <ToastContext.Provider
      value={{
        toasts: state.toasts,
        showToast,
        removeToast,
        clearToasts,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  const { showToast, ...rest } = context;

  // Convenience methods for different toast variants
  const success = useCallback(
    (message: string, options?: ToastOptions) => {
      showToast({ message, variant: ToastVariant.SUCCESS, ...options });
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, options?: ToastOptions) => {
      showToast({ message, variant: ToastVariant.ERROR, ...options });
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, options?: ToastOptions) => {
      showToast({ message, variant: ToastVariant.WARNING, ...options });
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, options?: ToastOptions) => {
      showToast({ message, variant: ToastVariant.INFO, ...options });
    },
    [showToast]
  );

  return {
    ...rest,
    showToast,
    success,
    error,
    warning,
    info,
  };
} 