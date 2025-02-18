## Technical Documentation and Implementation Plan

Current Project State
This is a Next.js application for YouTube video summarization using AI services. The core functionality allows users to input YouTube URLs, process videos through multiple AI services (OpenAI, Anthropic, Deepgram), and generate summaries with tags. The application uses Supabase for authentication and storage, with real-time voice transcription capabilities.

The application uses a modern tech stack including Next.js 13+, TypeScript, Tailwind CSS for styling, and multiple AI service integrations. The frontend is built with React components following a modular architecture, with separate contexts for authentication and Deepgram integration.

Authentication is implemented through Supabase, using their latest SSR package (@supabase/ssr) for server-side and client-side auth handling. The app stores user data, summaries, and transcriptions in Supabase, with additional storage capabilities through Supabase Storage.

API routes are implemented for various services:

YouTube transcript fetching

OpenAI summarization and chat

Anthropic Claude integration

Deepgram voice transcription

Replicate image generation

The application includes real-time voice recording and transcription through Deepgram, with the ability to save transcriptions to Supabase. Image upload functionality is implemented with both local preview and Supabase Storage integration.

### Codebase Summary

This is a Next.js application that serves as a YouTube video summarizer using AI services (OpenAI, Anthropic, Deepgram) and authentication (Supabase). The application allows users to input YouTube URLs, generate summaries, and manage their content.

### Technical Architecture

#### Core Technologies

- Frontend: Next.js (React), TypeScript
- Authentication: Supabase Auth
- Database: Supabase
- AI Services: OpenAI, Anthropic Claude, Deepgram
- Storage: Supabase Storage
- Styling: Tailwind CSS

#### Folder Structure

```
rileysummarizer/
├── src/
    ├── app/                    # Next.js App Router pages and API routes
    │   ├── api/               # API route handlers
    │   ├── auth/              # Authentication-related pages
    │   ├── login/             # Login page
    │   ├── summaries/         # Summaries page
    │   ├── components/        # Page-specific components
    │   ├── layout.tsx         # Root layout
    │   ├── page.tsx           # Home page
    │   └── globals.css        # Global styles
    ├── components/            # Shared components
    │   ├── auth/             # Authentication components
    │   ├── ui/               # UI components
    │   └── VoiceRecorder.tsx # Voice recording component
    ├── lib/                   # Core libraries and utilities
    │   ├── auth/             # Authentication utilities
    │   ├── contexts/         # React contexts
    │   ├── middleware/       # Custom middleware
    │   ├── services/         # Service layer
    │   ├── supabase/         # Supabase client and utilities
    │   ├── types/            # TypeScript types and interfaces
    │   └── utils/            # Utility functions
    └── middleware.ts          # Next.js middleware
```

### File Organization

1. **App Directory (`src/app/`)**

   - Pages using the App Router
   - API routes
   - Page-specific components
   - Layouts and templates

2. **Components Directory (`src/components/`)**

   - Shared components used across multiple pages
   - UI components (buttons, forms, etc.)
   - Authentication components
   - Feature-specific components

3. **Library Directory (`src/lib/`)**

   - Core business logic
   - Services and utilities
   - Type definitions
   - Context providers
   - Authentication utilities
   - Database utilities

4. **Middleware**
   - Root middleware for request handling
   - Custom middleware implementations

This structure follows Next.js 14 App Router conventions while maintaining a clean separation of concerns:

- **Pages**: Contained within the `app` directory
- **Components**: Split between shared (`components/`) and page-specific (`app/components/`)
- **Business Logic**: Organized in the `lib` directory
- **API Routes**: Centralized in `app/api`

### File Purposes

#### API Routes

- `api/anthropic/chat/` - Handles Claude AI chat integration
- `api/deepgram/` - Manages Deepgram API key access
- `api/openai/` - Contains OpenAI service integrations:
  - `chat/` - Chat completions
  - `summarize/` - Text summarization
  - `transcribe/` - Audio transcription
- `api/replicate/` - Handles image generation
- `api/youtube/` - YouTube transcript fetching

#### Components

1. Core Components:

- `LinkInput.tsx` - YouTube URL input handler
- `LoadingCard.tsx` - Loading state display
- `Navigation.tsx` - App navigation
- `SummaryCard.tsx` - Video summary display
- `Toast.tsx` - Notification system
- `VoiceRecorder.tsx` - Audio recording interface

2. Authentication Components:

- `SignInWithGoogle.tsx` - Google authentication

#### Context and Hooks

- `AuthContext.tsx` - Authentication state management
- `DeepgramContext.tsx` - Voice transcription state
- `useAuth.ts` - Authentication hook

### Dependencies

```json
{
  "major": {
    "@deepgram/sdk": "latest",
    "@firebase/auth": "latest",
    "@supabase/supabase-js": "latest",
    "next": "latest",
    "react": "latest",
    "tailwindcss": "latest",
    "typescript": "latest"
  }
}
```

### Interface Details

1. Authentication Interfaces:

```typescript
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  error: AuthError | null;
}
```

2. Storage Interfaces:

```typescript
interface UploadResult {
  path: string;
  url: string;
}

class StorageError extends Error {
  statusCode?: number;
}
```

3. Summary Interfaces:

```typescript
interface SummaryWithTags {
  title: string;
  channelName: string;
  date: string;
  summary: string;
  videoUrl: string;
  tags: string[];
}
```

### Error Handling

The application implements a comprehensive error handling system with the following components:

1. **Error Types and Interfaces**

```typescript
interface BaseError {
  message: string;
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

enum ErrorCode {
  // Authentication Errors
  AUTH_INVALID_CREDENTIALS = "auth/invalid-credentials",
  // Storage Errors
  STORAGE_FILE_NOT_FOUND = "storage/file-not-found",
  // API Errors
  API_RATE_LIMIT = "api/rate-limit",
  // Validation Errors
  VALIDATION_INVALID_FORMAT = "validation/invalid-format",
}

class AppError extends Error implements BaseError {
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
}
```

2. **API Error Handling**

- Centralized error handling middleware for API routes
- Consistent error response format
- Built-in support for validation and authentication
- Special handling for Supabase errors

3. **Error Utilities**

```typescript
// Create specific error types
createValidationError(message, details);
createAuthError(message, code, details);
createApiError(message, code, statusCode, details);

// Middleware functions
withErrorHandler(handler); // Wraps API routes with error handling
validateRequest(request, schema); // Validates request data
requireAuth(request); // Ensures valid authentication
```

4. **Storage Error Handling**

- Standardized error handling for Supabase storage operations
- Consistent error codes and status codes
- Detailed error messages with proper HTTP status codes

### API Response Format

All API responses follow a consistent format:

1. **Success Response**

```json
{
  "data": {
    // Response data
  }
}
```

2. **Error Response**

```json
{
  "error": {
    "message": "Error description",
    "code": "error/code",
    "details": {
      // Optional error details
    }
  }
}
```

### Configuration Details

Required Environment Variables:

````

### Loading State Management

The application implements a centralized loading state management system with the following components:

1. **Loading Types and Interfaces**
```typescript
enum LoadingType {
  // Authentication
  AUTH_SIGN_IN = "auth/sign-in",
  // Data Operations
  DATA_FETCH = "data/fetch",
  // File Operations
  FILE_UPLOAD = "file/upload",
  // API Operations
  API_REQUEST = "api/request",
  // AI Operations
  AI_PROCESSING = "ai/processing"
}

interface LoadingState {
  type: LoadingType;
  message?: string;
  progress?: number;
  startTime: number;
}
````

2. **Loading Context**

- Centralized state management for loading states
- Support for multiple concurrent loading operations
- Progress tracking and message updates
- Type-safe loading operations

3. **Loading Components**

```typescript
// Basic loading component
<Loading type={LoadingType.DATA_FETCH} />

// Loading overlay with backdrop
<LoadingOverlay type={LoadingType.AI_PROCESSING} />

// Progress tracking
<Loading
  type={LoadingType.FILE_UPLOAD}
  message="Uploading file..."
  progress={75}
/>
```

4. **Loading Hook**

```typescript
const {
  isLoading,
  startLoading,
  updateLoading,
  stopLoading,
  isOperationLoading,
  getLoadingState,
} = useLoading();
```

### Toast Notification System

The application implements a flexible toast notification system with the following components:

1. **Toast Types and Interfaces**

```typescript
enum ToastVariant {
  SUCCESS = "success",
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
}

enum ToastPosition {
  TOP = "top",
  TOP_RIGHT = "top-right",
  TOP_LEFT = "top-left",
  BOTTOM = "bottom",
  BOTTOM_RIGHT = "bottom-right",
  BOTTOM_LEFT = "bottom-left",
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

2. **Toast Context**

- Centralized state management for notifications
- Support for multiple concurrent toasts
- Auto-dismiss functionality
- Position-based grouping
- Type-safe toast creation

3. **Toast Components**

```typescript
// Show different types of toasts
toast.success("Operation completed successfully");
toast.error("An error occurred");
toast.warning("Please review your input");
toast.info("New update available");

// Customizable options
toast.show({
  message: "Custom toast",
  variant: ToastVariant.SUCCESS,
  position: ToastPosition.TOP_RIGHT,
  duration: 5000,
  isClosable: true,
});
```

4. **Toast Features**:

- Multiple positions support
- Variant-based styling
- Animated transitions
- Auto-dismiss with configurable duration
- Manual close option
- Stacking and grouping
- Accessibility support

### UI Components

1. **Toast Components**:

- `ToastContainer.tsx` - Toast notification manager
  - Position-based rendering
  - Framer Motion animations
  - Responsive design
  - Icon support for variants
  - Customizable styling
- Toast variants with consistent styling:
  - Success: Green theme
  - Error: Red theme
  - Warning: Yellow theme
  - Info: Blue theme

2. **Toast Usage**:

```typescript
const { success, error, warning, info } = useToast();

// Show success toast
success("Profile updated successfully", {
  title: "Success",
  duration: 3000,
  position: "top-right",
});

// Show error toast
error("Failed to save changes", {
  title: "Error",
  isClosable: true,
});
```

### AI Service Integration

The application uses OpenAI as its primary AI service provider, with a standardized implementation:

1. **OpenAI Types and Interfaces**

```typescript
enum OpenAIModel {
  GPT4 = "gpt-4-turbo-preview",
  GPT35 = "gpt-3.5-turbo-0125",
  GPT4_VISION = "gpt-4-vision-preview",
}

interface ChatCompletionOptions {
  model?: OpenAIModel;
  temperature?: number;
  max_tokens?: number;
  functions?: FunctionDefinition[];
  function_call?: "auto" | "none" | { name: string };
}

interface SummaryRequest {
  text: string;
  options?: {
    maxLength?: number;
    format?: "paragraph" | "bullets";
    includeTags?: boolean;
  };
}
```

2. **OpenAI Service**

- Centralized service for all OpenAI interactions
- Standardized error handling
- Type-safe API calls
- Streaming support for chat completions

3. **API Routes**

```typescript
// Chat completion with streaming
POST /api/openai/chat
{
  "messages": Message[],
  "options": ChatCompletionOptions
}

// Text summarization
POST /api/openai/summarize
{
  "text": string,
  "options": {
    "maxLength": number,
    "format": "paragraph" | "bullets",
    "includeTags": boolean
  }
}

// Audio transcription
POST /api/openai/transcribe
FormData with "file" field (audio file)
```

4. **Features**:

- Streaming chat responses
- Configurable model selection
- Temperature and token control
- Function calling support
- Audio transcription
- Text summarization with tags

### API Route Implementation

All API routes follow a consistent pattern:

1. **Request Validation**

```typescript
const requestSchema = z.object({
  // Schema definition using Zod
});

const result = requestSchema.safeParse(body);
if (!result.success) {
  throw new AppError(
    "Invalid request data",
    ErrorCode.VALIDATION_INVALID_FORMAT,
    HttpStatus.BAD_REQUEST,
    { details: result.error.format() }
  );
}
```

2. **Error Handling**

```typescript
try {
  // Route logic
} catch (error) {
  if (error instanceof AppError) {
    throw error;
  }
  throw new AppError(
    "Error message",
    ErrorCode.API_SERVICE_UNAVAILABLE,
    HttpStatus.INTERNAL_ERROR
  );
}
```

3. **Response Format**

```typescript
// Success response
{
  "data": {
    // Response data
  }
}

// Error response
{
  "error": {
    "message": string,
    "code": string,
    "details": object
  }
}
```

### Storage Service Implementation

User Stories:

1. As a user, when I provide a URL, I want the application to generate a detailed transcript of the video and store it in Supabase Storage. This transcript should be used to generate a summary of the video.
2. As a user, when I or another user provide the same URL, I want the application to use the existing transcript from Supabase Storage instead of generating a new one. The transcript should be stored at the same path regardless of the user.
3. As a user, I want to be able to view the summaries of the videos I have summarized in the past through a feature called 'Past Summaries'. This requires a database table that connects the IDs of URLs, the IDs of the users, and the date on which they requested the summary.
4. As a user, I want to be able to authenticate using a dummy email and password for now, ensuring that the application recognizes me and allows me to access my past summaries.

#### Database Schema

```typescript
// Database Tables
interface Video {
  id: string; // Primary key (video_id from YouTube URL)
  url: string; // Full YouTube URL
  transcript_path: string; // Path in Supabase Storage
  last_updated: Date; // Timestamp of last transcript update
  language: string; // Language of the video/transcript
}

interface UserSummary {
  id: string; // Primary key
  user_id: string; // Foreign key to auth.users
  video_id: string; // Foreign key to videos table
  summary: string; // Generated summary text
  tags: string[]; // Array of tags
  created_at: Date; // Timestamp of summary creation
  updated_at: Date; // Timestamp of last refresh
}

// Type for stored transcript
interface StoredTranscript {
  video_id: string;
  language: string;
  segments: {
    start: number; // Timestamp start
    end: number; // Timestamp end
    text: string; // Segment text
  }[];
  metadata: {
    title: string;
    channel: string;
    duration: number;
    last_updated: Date;
  };
}
```

#### Storage Utilities

```typescript
// Storage path generation
const getTranscriptPath = (videoId: string) => `transcripts/${videoId}.json`;

// Transcript storage functions
const storeTranscript = async (
  videoId: string,
  transcript: StoredTranscript
): Promise<void> => {
  const path = getTranscriptPath(videoId);
  await supabase.storage
    .from("transcripts")
    .upload(path, JSON.stringify(transcript), {
      upsert: true,
      contentType: "application/json",
    });
};

const getTranscript = async (
  videoId: string
): Promise<StoredTranscript | null> => {
  const path = getTranscriptPath(videoId);
  const { data, error } = await supabase.storage
    .from("transcripts")
    .download(path);

  if (error || !data) return null;
  return JSON.parse(await data.text());
};
```

#### Video Processing Service

```typescript
class VideoProcessingService {
  async processVideo(url: string, userId: string): Promise<UserSummary> {
    const videoId = extractVideoId(url);

    // Check existing video record
    let video = await this.findVideoRecord(videoId);
    let transcript: StoredTranscript;

    if (!video) {
      // Generate new transcript
      transcript = await this.generateTranscript(url);
      await storeTranscript(videoId, transcript);

      // Create video record
      video = await this.createVideoRecord(videoId, url, transcript);
    } else {
      transcript = await getTranscript(videoId);
    }

    // Generate or retrieve summary
    const summary = await this.getOrCreateSummary(userId, videoId, transcript);

    return summary;
  }

  async refreshVideo(videoId: string, userId: string): Promise<UserSummary> {
    // Generate new transcript
    const video = await this.findVideoRecord(videoId);
    const transcript = await this.generateTranscript(video.url);

    // Update storage and records
    await storeTranscript(videoId, transcript);
    await this.updateVideoRecord(videoId, transcript);

    // Generate new summary
    const summary = await this.generateSummary(transcript);
    await this.updateUserSummary(userId, videoId, summary);

    return summary;
  }
}
```

#### API Routes

```typescript
// POST /api/videos/process
async function processVideo(req: NextRequest): Promise<NextResponse> {
  const { url } = await req.json();
  const userId = await requireAuth(req);

  const service = new VideoProcessingService();
  const summary = await service.processVideo(url, userId);

  return NextResponse.json({ data: summary });
}

// POST /api/videos/refresh
async function refreshVideo(req: NextRequest): Promise<NextResponse> {
  const { videoId } = await req.json();
  const userId = await requireAuth(req);

  const service = new VideoProcessingService();
  const summary = await service.refreshVideo(videoId, userId);

  return NextResponse.json({ data: summary });
}

// GET /api/summaries
async function getUserSummaries(req: NextRequest): Promise<NextResponse> {
  const userId = await requireAuth(req);

  const { data: summaries } = await supabase
    .from("user_summaries")
    .select("*, videos(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ data: summaries });
}
```

This implementation provides:

- Efficient transcript storage and reuse across users
- Clear separation between video data and user-specific summaries
- Support for transcript refresh functionality
- Structured storage of transcripts with timestamps
- Language support for multi-language videos
- Read-only history with refresh capability
- Session persistence until cache clear
- Foundation for future OAuth integration

The system uses Supabase Storage for transcript files and Supabase Database for relational data, providing a scalable and maintainable solution that meets all specified requirements while maintaining data integrity and user privacy.

### Authentication Implementation

The application uses Supabase for authentication with a clean, production-ready implementation:

1. **Supabase Client Configuration**

```typescript
// Minimal Supabase client configuration in src/lib/auth/supabase.ts
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
    },
  }
);
```

2. **Authentication Context**

```typescript
// Clean AuthContext implementation in src/lib/auth/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  error: AuthError | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ... implementation with proper state management and error handling
}
```

3. **Route Protection**

```typescript
// Robust middleware in src/lib/auth/middleware.ts
export async function getUserId(req: NextRequest): Promise<string> {
  // ... secure session validation
}

export function withAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  // ... proper error handling and type safety
}
```

### Key Features

1. **Type Safety**

   - Full TypeScript support with proper types
   - Database type integration
   - Error type definitions

2. **Security**

   - Server-side session validation
   - Proper cookie handling
   - Secure error responses

3. **Error Handling**

   - Consistent error types
   - Proper error messages
   - Status code mapping

4. **State Management**
   - Clean context implementation
   - Loading states
   - Error states

### Best Practices

1. **Clean Architecture**

   - Separation of concerns
   - Modular components
   - Clear interfaces

2. **Type Safety**

   - No any types
   - Proper error typing
   - Database type integration

3. **Security**

   - Environment variable validation
   - Secure cookie handling
   - Protected routes

4. **Error Handling**
   - Consistent error format
   - Proper status codes
   - Detailed error messages

The implementation follows Supabase's best practices and Next.js 14 patterns, providing a solid foundation for authentication in the application.

### Future Enhancements

1. **Error Handling**

   - Add comprehensive error states
   - Implement user feedback
   - Add retry mechanisms

2. **Security**

   - Enhanced security headers
   - Session management features
   - Rate limiting

3. **User Experience**
   - Loading states
   - Progress indicators
   - Clear error messages

The implementation follows a "start simple, add complexity later" approach, ensuring core functionality works before adding additional features. This provides a solid foundation for future enhancements while maintaining code clarity and reliability.
