# Toast Notification System

## Overview

The application uses a context-based toast notification system for displaying alerts and messages to users. This system is implemented using React Context and custom hooks for better state management and reusability.

## Implementation

### Components

- `ToastContainer`: The main component that renders all toast notifications
- `useToast`: A custom hook that provides methods to show different types of toast notifications

### Usage

```typescript
import { useToast } from "@/lib/contexts/ToastContext";
import { ToastContainer } from "@/components/ui/Toast";

export default function MyComponent() {
  const toast = useToast();

  // Show a success toast
  toast.success("Operation completed successfully");

  // Show an error toast
  toast.error("An error occurred");

  return (
    <div>
      {/* Your component content */}
      <ToastContainer />
    </div>
  );
}
```

### Key Features

- Context-based state management
- Multiple toast types (success, error, info, warning)
- Automatic cleanup of toast messages
- Consistent styling across the application
- Type-safe toast messages

### Migration Notes

The old implementation using direct props (`message` and `onClose`) has been replaced with the context-based system. All components should now use the `useToast` hook for showing notifications.
