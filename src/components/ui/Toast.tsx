"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/lib/contexts/ToastContext";
import { ToastPosition, ToastVariant } from "@/lib/types/toast";
import { X } from "lucide-react";

const variants = {
  initial: {
    opacity: 0,
    y: -100,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
};

const positionClasses: Record<ToastPosition, string> = {
  top: "top-0 left-1/2 -translate-x-1/2",
  "top-right": "top-0 right-0",
  "top-left": "top-0 left-0",
  bottom: "bottom-0 left-1/2 -translate-x-1/2",
  "bottom-right": "bottom-0 right-0",
  "bottom-left": "bottom-0 left-0",
};

const variantClasses: Record<ToastVariant, string> = {
  success: "bg-green-50 border-green-500 text-green-800",
  error: "bg-red-50 border-red-500 text-red-800",
  warning: "bg-yellow-50 border-yellow-500 text-yellow-800",
  info: "bg-blue-50 border-blue-500 text-blue-800",
};

const variantIcons: Record<ToastVariant, React.ReactNode> = {
  success: (
    <svg
      className="w-5 h-5 text-green-400"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  ),
  warning: (
    <svg
      className="w-5 h-5 text-yellow-400"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
  info: (
    <svg
      className="w-5 h-5 text-blue-400"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

interface ToastProps {
  message: string;
  onClose: () => void;
}

export default function Toast({ message, onClose }: ToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center justify-between">
        <div className="flex items-center">
          <svg
            className="w-5 h-5 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{message}</span>
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-red-700 hover:text-red-800 focus:outline-none"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  // Group toasts by position
  const groupedToasts = toasts.reduce((acc, toast) => {
    const position = toast.position || "top-right";
    if (!acc[position]) {
      acc[position] = [];
    }
    acc[position].push(toast);
    return acc;
  }, {} as Record<ToastPosition, typeof toasts>);

  return (
    <>
      {Object.entries(groupedToasts).map(([position, positionToasts]) => (
        <div
          key={position}
          className={`fixed z-50 m-4 flex flex-col gap-2 ${
            positionClasses[position as ToastPosition]
          }`}
        >
          <AnimatePresence>
            {positionToasts.map((toast) => (
              <motion.div
                key={toast.id}
                layout
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={`${
                  variantClasses[toast.variant]
                } border rounded-lg shadow-lg p-4 min-w-[320px] max-w-md flex items-start gap-3`}
              >
                {variantIcons[toast.variant]}
                <div className="flex-1">
                  {toast.title && (
                    <h3 className="font-semibold">{toast.title}</h3>
                  )}
                  <p className="text-sm">{toast.message}</p>
                </div>
                {toast.isClosable && (
                  <button
                    onClick={() => removeToast(toast.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close toast"
                  >
                    <X size={16} />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ))}
    </>
  );
} 