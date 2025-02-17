"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import {
  LoadingType,
  LoadingState,
  LoadingContextState,
  LoadingContextActions,
} from "../types/loading";

type LoadingAction =
  | { type: "START_LOADING"; payload: { type: LoadingType; message?: string } }
  | { type: "UPDATE_LOADING"; payload: { type: LoadingType; progress?: number; message?: string } }
  | { type: "STOP_LOADING"; payload: { type: LoadingType } };

const initialState: LoadingContextState = {
  isLoading: false,
  activeOperations: new Map(),
};

function loadingReducer(
  state: LoadingContextState,
  action: LoadingAction
): LoadingContextState {
  switch (action.type) {
    case "START_LOADING": {
      const newOperations = new Map(state.activeOperations);
      newOperations.set(action.payload.type, {
        type: action.payload.type,
        message: action.payload.message,
        startTime: Date.now(),
      });
      return {
        isLoading: true,
        activeOperations: newOperations,
      };
    }
    case "UPDATE_LOADING": {
      const operation = state.activeOperations.get(action.payload.type);
      if (!operation) return state;

      const newOperations = new Map(state.activeOperations);
      newOperations.set(action.payload.type, {
        ...operation,
        progress: action.payload.progress,
        message: action.payload.message ?? operation.message,
      });
      return {
        ...state,
        activeOperations: newOperations,
      };
    }
    case "STOP_LOADING": {
      const newOperations = new Map(state.activeOperations);
      newOperations.delete(action.payload.type);
      return {
        isLoading: newOperations.size > 0,
        activeOperations: newOperations,
      };
    }
    default:
      return state;
  }
}

const LoadingContext = createContext<
  (LoadingContextState & LoadingContextActions) | undefined
>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(loadingReducer, initialState);

  const startLoading = useCallback((type: LoadingType, message?: string) => {
    dispatch({ type: "START_LOADING", payload: { type, message } });
  }, []);

  const updateLoading = useCallback(
    (type: LoadingType, progress?: number, message?: string) => {
      dispatch({ type: "UPDATE_LOADING", payload: { type, progress, message } });
    },
    []
  );

  const stopLoading = useCallback((type: LoadingType) => {
    dispatch({ type: "STOP_LOADING", payload: { type } });
  }, []);

  const isOperationLoading = useCallback(
    (type: LoadingType) => state.activeOperations.has(type),
    [state.activeOperations]
  );

  const getLoadingState = useCallback(
    (type: LoadingType) => state.activeOperations.get(type),
    [state.activeOperations]
  );

  return (
    <LoadingContext.Provider
      value={{
        ...state,
        startLoading,
        updateLoading,
        stopLoading,
        isOperationLoading,
        getLoadingState,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
} 