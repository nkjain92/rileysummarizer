## Technical Documentation and Implementation Plan

### Current Project State

RileySummarizer is a Next.js 13+ application that enables users to obtain AI-generated summaries of YouTube videos. The current implementation leverages OpenAI’s models for multiple tasks:

- **Chat Completion and Summarization:** Using GPT‑3.5 Turbo and GPT‑4 (via separate routes) to generate both brief and detailed summaries.
- **Audio Transcription:** Using OpenAI Whisper to transcribe audio files.
- **YouTube Transcript Retrieval:** Fetching transcripts from YouTube via an external RapidAPI endpoint.

Instead of integrating multiple AI providers (such as Anthropic, Deepgram, or Replicate), the application currently focuses on OpenAI services. For storage and database operations, Supabase is used for transcript storage and (in some cases) for record keeping; however, several database operations (videos, summaries, channels) are also simulated via an in‑memory store inside the DatabaseService. For user identity, the application presently uses a default “anonymous” user, with room to later integrate a full Supabase authentication solution.

The app employs modern standards with TypeScript, Tailwind CSS for styling, and a clear separation between user interface components, API routes, and business logic.

---

### Codebase Summary

RileySummarizer is a modular Next.js application built around AI‑powered YouTube video summarization. Key features include:

- **AI Services:** All AI interactions (chat completions, text summarization, and audio transcription) are handled using OpenAI’s APIs.
- **Video Processing:** A dedicated service processes a YouTube URL by retrieving (or generating) its transcript, splitting it into meaningful chunks, generating summaries (including detailed versions on demand), and extracting tags.
- **Storage and Database:** Transcripts are stored in Supabase Storage (using a consistent path structure) while video metadata and user summaries are managed via a DatabaseService that currently employs an in‑memory store.
- **User Experience:** The frontend—built with React and styled using Tailwind CSS—includes components such as LinkInput for URL submission, SummaryCard for displaying video summaries, navigation and loading indicators, and a toast notification system.

---

### Technical Architecture

#### Core Technologies

- **Frontend:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS
- **AI Services:** OpenAI (for chat completions, summarization, and transcription via Whisper)
- **Storage & Database:** Supabase Storage for transcripts and Supabase (or an in‑memory store) for video, channel, and summary records
- **Utilities & Enhancements:** Custom logger, retry utilities, loading state contexts, and toast notification contexts

#### Folder Structure

A high‑level overview of the project structure (under the `rileysummarizer/` root):

```
rileysummarizer/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── api/               # API route handlers for OpenAI, videos, YouTube, etc.
│   │   │   ├── openai/        # OpenAI integrations:
│   │   │   │   ├── chat         (chat completion)
│   │   │   │   ├── summarize    (detail-rich summarization)
│   │   │   │   └── transcribe   (audio transcription using Whisper)
│   │   │   ├── videos/        # Video processing & summary management
│   │   │   │   ├── process      (process YouTube URLs)
│   │   │   │   ├── refresh      (update transcripts and summaries)
│   │   │   │   └── summaries/   (get and update user summaries)
│   │   │   └── youtube/       # YouTube transcript fetching (via RapidAPI)
│   │   ├── components/        # Page-specific components (if any)
│   │   ├── layout.tsx         # Global and root layout definitions
│   │   ├── globals.css        # Global styling rules
│   │   └── page.tsx           # Home page (e.g. URL submission and recent summaries)
│   ├── components/            # Shared UI components
│   │   ├── LinkInput.tsx      # Component for YouTube URL input with inline validation
│   │   ├── LoadingCard.tsx    # Visual loading skeleton during data fetching
│   │   ├── Navigation.tsx     # Application navigation bar
│   │   └── SummaryCard.tsx    # Displays a video’s summary, tags, and details
│   ├── lib/                   # Core libraries and utilities
│   │   ├── contexts/          # React context providers (e.g. ToastContext, LoadingContext)
│   │   ├── services/          # Business logic (DatabaseService, OpenAIService, VideoProcessingService)
│   │   ├── types/             # TypeScript interfaces and type definitions (e.g. for errors, database, loading, storage, toast)
│   │   └── utils/             # Utility functions (e.g. logger, retry, storage, youtube helpers)
│   └── supabase/              # Supabase project configurations and migration files
```

#### File Organization and Purposes

1. **App Directory (`src/app/`):**

   - Contains Next.js pages, API routes, layouts, and global styles.

2. **Components Directory (`src/components/`):**

   - Holds reusable UI components like the URL input (LinkInput), summary display (SummaryCard), loading indicator (LoadingCard), and navigation bar.
   - Also includes UI-specific components for toasts and loading animations (found under `components/ui/`).

3. **Library Directory (`src/lib/`):**

   - Implements core business logic:
     - **Services:**  
       • `OpenAIService` – Provides chat completions, detailed summarization, and audio transcription (using OpenAI Whisper).  
       • `DatabaseService` – Simulates database operations (videos, channels, and summaries) using an in‑memory store.  
       • `VideoProcessingService` – Coordinates transcript fetching, summary generation, and database updates.
     - **Utilities:** Logger, retry mechanisms, request validation, and error formatting.
     - **Contexts:** Toast and loading contexts for centralized UI state management.
     - **Types:** Type definitions for errors, database records, loading states, storage, and toast notifications.

4. **Supabase Directory (`src/supabase/`):**
   - Contains Supabase-related configuration files (such as migrations) and serves as the integration point for Supabase Storage.

---

### API Routes

The application exposes several API endpoints:

- **/api/openai/chat:**  
  Handles chat completion requests. Validates a messages array and delegates the request to OpenAIService.

- **/api/openai/summarize:**  
  Processes a text input to generate a detailed summary (optionally with bullet points) using OpenAI. Validation is done via Zod, and detailed logging is used throughout the process.

- **/api/openai/transcribe:**  
  Accepts a file upload (audio) and uses OpenAI’s Whisper to return a transcript.

- **/api/videos/process:**  
  Takes a YouTube URL, validates it, and uses OpenAIService to process the video. It retrieves (or generates) a transcript (including via an external YouTube transcript API), creates or updates DB records, and ultimately generates a summary and tags.

- **/api/videos/refresh:**  
  Refreshes a video’s transcript and summary by reprocessing the YouTube video and updating storage and database entries.

- **/api/videos/summaries/update:**  
  Updates the detailed summary stored for a given video.

- **/api/videos/summaries (GET):**  
  Retrieves all summaries associated with the default “anonymous” user (intended for future authenticated use).

- **/api/youtube/transcript:**  
  Fetches YouTube transcripts using the RapidAPI endpoint. It handles errors (e.g. when a transcript is not available) and returns the combined transcript text.

All API responses conform to a consistent format with a top‑level “data” field on success or an “error” object describing the problem.

---

### UI Components

Key UI components include:

- **LinkInput.tsx:** Validates and accepts YouTube links for summarization.
- **LoadingCard.tsx:** Displays a placeholder skeleton while data loads.
- **Navigation.tsx:** Provides navigation between the home page and past summaries.
- **SummaryCard.tsx:** Formats and displays video summaries along with detailed views, tags, and a “Show Detailed Summary” button.
- **Toast Components:** Provide animated, position‑aware notifications using Framer Motion.

---

### Context and Hooks

Two central context providers manage shared application state:

- **LoadingContext:**  
  Provides mechanisms to trigger global or operation‑specific loading states. Components like the Loading UI (and overlays) use this context to display progress and messages.

- **ToastContext:**  
  Manages toast notifications for success, error, warning, and informational messages. Components and API responses use this context to show realtime feedback to the user.

_(Note: Although earlier iterations included authentication and voice recording contexts, the current codebase primarily uses an “anonymous” user placeholder.)_

---

### Dependencies

Some major dependencies in the project include:

- Next.js (latest version)
- React and React DOM
- TypeScript
- Tailwind CSS
- OpenAI (for both chat completions and audio transcription)
- Supabase (for Storage and potential authentication)
- Framer Motion (for animated UI elements)
- Zod (for request validation)
- Additional utilities for logging and retries

---

### Interface Details

#### Summary Interfaces

```typescript
interface SummaryWithTags {
  title: string;
  channelName: string;
  date: string;
  summary: string;
  videoUrl: string;
  tags: string[];
  videoId: string;
}
```

#### Error Interfaces

Every error in the application is represented by an AppError with a consistent interface:

```typescript
interface BaseError {
  message: string;
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

enum ErrorCode {
  VALIDATION_INVALID_FORMAT = "validation/invalid-format",
  STORAGE_FILE_NOT_FOUND = "storage/file-not-found",
  API_SERVICE_UNAVAILABLE = "api/service-unavailable",
  // … other error codes
}

class AppError extends Error implements BaseError {
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
}
```

---

### Error Handling

- **Centralized Error Handling:**  
  All API routes wrap operations in try–catch blocks. Validated errors (using Zod) result in an AppError, and unexpected errors are wrapped before sending a response.

- **Consistent API Response Format:**  
  Success responses include a "data" field; error responses include an "error" object with message, code, and optional details.

---

### Loading State Management

Loading is managed centrally via the LoadingContext:

- **Types & Interfaces:**

  ```typescript
  enum LoadingType {
    DATA_FETCH = "data/fetch",
    FILE_UPLOAD = "file/upload",
    API_REQUEST = "api/request",
    AI_PROCESSING = "ai/processing",
    VIDEO_PROCESSING = "video/processing",
  }

  interface LoadingState {
    type: LoadingType;
    message?: string;
    progress?: number;
    startTime: number;
  }
  ```

- **Usage:**  
  Hooks (via `useLoading()`) expose methods to start, update, and stop loading operations, which UI components then use to display spinners or progress bars.

---

### Toast Notification System

The toast notification system uses context to display non‑blocking messages:

- **Toast Types and Interfaces:**

  ```typescript
  enum ToastVariant {
    SUCCESS = "success",
    ERROR = "error",
    WARNING = "warning",
    INFO = "info",
  }

  enum ToastPosition {
    TOP_RIGHT = "top-right",
    // other positions…
  }

  interface Toast {
    id: string;
    message: string;
    variant: ToastVariant;
    title?: string;
    duration?: number;
    position?: ToastPosition;
    isClosable?: boolean;
  }
  ```

- **Usage:**  
  Using the `useToast()` hook, components can display messages (for example, when a summary is successfully generated or if an error occurs during video processing).

---

### AI Service Integration

All AI functionality is provided by the OpenAIService:

- **Chat and Summarization:**  
  Routes like `/api/openai/chat` and `/api/openai/summarize` provision chat completions and detailed summaries. Prompts are structured with system and user messages to ensure clarity and formatting (including bullet points where appropriate).

- **Audio Transcription:**  
  The `/api/openai/transcribe` route accepts a file upload and processes it using OpenAI Whisper.

- **Tag Generation:**  
  Tags are generated along with summaries from the processed transcript text and summary content.

All AI-related API calls include robust error handling and retries using a custom retry utility.

---

### API Route Implementation

Each API route follows a consistent pattern:

1. **Request Validation:**  
   Using Zod schemas to validate incoming JSON data; if validation fails, an AppError is thrown.

2. **Core Logic Delegation:**  
   Once validated, requests call corresponding service layer methods (e.g. `generateChatCompletion()` in OpenAIService or `processVideo()` in VideoProcessingService).

3. **Error Handling and Response:**  
   Errors caught are converted to standardized error responses. On success, the JSON response is wrapped inside a top‑level “data” object.

---

### Storage Service Implementation

Transcripts are stored and retrieved via Supabase Storage:

- **Path Generation:**  
  All transcripts are stored under a unified directory structure:

  ```typescript
  const getTranscriptPath = (videoId: string): string =>
    `transcripts/${videoId}.json`;
  ```

- **Storage Utilities:**  
  Functions such as `storeTranscript()`, `getTranscript()`, and `deleteTranscript()` manage file operations using Supabase’s storage API while handling errors with consistent AppError objects.

---

### Video Processing Service

The VideoProcessingService coordinates the overall processing of a YouTube URL:

- **Processing Flow:**

  1. Extract the video ID from the URL.
  2. Fetch the transcript—either by calling an external YouTube transcript API (or using Supabase Storage if already stored) or by generating a new transcript.
  3. Split transcript text into manageable chunks and pass them to OpenAI for summarization.
  4. Generate tags from summary content.
  5. Create or update the video record and user summary record.
  6. Return the summary object to be rendered on the frontend.

- **Refresh Capability:**  
  Users can refresh summaries (via the `/api/videos/refresh` route) to update both the transcript and its summary.

---

### Authentication Implementation

Currently, the application uses a placeholder user ("anonymous") in API routes. In future steps, Supabase Authentication may be fully integrated:

- **Supabase Client Configuration:**  
  The Supabase client is configured in a dedicated folder (e.g. in `src/supabase/`) using environment variables for the Supabase URL and anonymous key.

- **Auth Context (Future Work):**  
  Although not yet implemented, a dedicated AuthContext and associated middleware functions can be added to manage user sessions, protect API routes, and differentiate individual users’ summaries.

---

### Key Features

1. **Type Safety:**  
   The entire codebase is written in TypeScript with strict type definitions for API inputs/outputs, database records, error handling, and UI states.

2. **Modular Architecture:**  
   Clear separation between pages, shared UI components, service logic, and utilities ensures maintainability and scalability.

3. **Robust Error Handling:**  
   Consistent use of AppError, Zod for schema validation, and centralized error responses ensures that errors are caught, logged (using a custom logger), and communicated clearly to the client.

4. **State Management:**  
   Context providers for loading and toast notifications provide a responsive and interactive user experience.

5. **Flexible AI Integration:**  
   Although currently only OpenAI is used, the architecture makes it straightforward to add or swap out AI providers in the future.

---

### Future Enhancements

- **Enhanced Authentication:**  
  Integrate full Supabase Auth (or another OAuth provider) to support user-specific summaries and secure routes.

- **Expanded AI Options:**  
  While currently using only OpenAI, additional integrations (such as with Anthropic or Deepgram) could be added if desired.

- **Improved Error and Retry Handling:**  
  Further enhancements in the retry mechanism and more granular error messages can improve reliability.

- **User Experience Improvements:**  
  Additional loading states, detailed error feedback, and improved UI animations will increase usability.

- **Persistent Data Storage:**  
  Moving from an in‑memory store to full Supabase Database integration for all video, summary, and channel records will better support multi‑user environments and data persistence.
