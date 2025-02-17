<file_map>
├── rileysummarizer
│ ├── src
│ │ ├── app
│ │ │ ├── api
│ │ │ │ ├── anthropic
│ │ │ │ │ └── chat
│ │ │ │ ├── deepgram
│ │ │ │ ├── openai
│ │ │ │ │ ├── chat
│ │ │ │ │ ├── summarize
│ │ │ │ │ └── transcribe
│ │ │ │ ├── replicate
│ │ │ │ │ └── generate-image
│ │ │ │ ├── videos
│ │ │ │ └── youtube
│ │ │ │ └── transcript
│ │ │ ├── auth
│ │ │ │ └── callback
│ │ │ ├── components
│ │ │ │ └── auth
│ │ │ ├── login
│ │ │ └── summaries
│ │ ├── components
│ │ │ ├── auth
│ │ │ └── ui
│ │ └── lib
│ │ ├── auth
│ │ ├── contexts
│ │ ├── hooks
│ │ ├── middleware
│ │ ├── services
│ │ ├── supabase
│ │ ├── types
│ │ └── utils
│ └── supabase
│ └── migrations

</file_map>

<file_contents>
File: src/app/api/anthropic/chat/route.ts

```ts
import { anthropic } from "@ai-sdk/anthropic";
import { convertToCoreMessages, streamText } from "ai";

export const runtime = "edge";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = await streamText({
    model: anthropic("claude-3-5-sonnet-20240620"),
    messages: convertToCoreMessages(messages),
    system: "You are a helpful AI assistant",
  });

  return result.toDataStreamResponse();
}
```

File: src/app/api/openai/chat/route.ts

```ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { OpenAIService } from "@/lib/services/openai";

// Initialize OpenAI service
const openaiService = new OpenAIService();

// Request validation schema
const validateRequest = (body: any) => {
  if (!body.messages || !Array.isArray(body.messages)) {
    throw new AppError(
      "Messages array is required",
      ErrorCode.VALIDATION_INVALID_FORMAT,
      HttpStatus.BAD_REQUEST
    );
  }

  for (const message of body.messages) {
    if (!message.role || !message.content) {
      throw new AppError(
        "Each message must have a role and content",
        ErrorCode.VALIDATION_INVALID_FORMAT,
        HttpStatus.BAD_REQUEST
      );
    }

    if (!["system", "user", "assistant", "function"].includes(message.role)) {
      throw new AppError(
        "Invalid message role",
        ErrorCode.VALIDATION_INVALID_FORMAT,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  return body as {
    messages: OpenAI.Chat.ChatCompletionMessageParam[];
    options?: Partial<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming>;
  };
};

/**
 * Handle chat completion request
 * POST /api/openai/chat
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { messages, options } = validateRequest(body);

    const response = await openaiService.generateChatCompletion(
      messages,
      options
    );

    return NextResponse.json({ data: response });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.toResponse() },
        { status: error.statusCode }
      );
    }

    const appError = new AppError(
      "Failed to generate chat completion",
      ErrorCode.API_SERVICE_UNAVAILABLE,
      HttpStatus.INTERNAL_ERROR,
      { details: error }
    );

    return NextResponse.json(
      { error: appError.toResponse() },
      { status: appError.statusCode }
    );
  }
}
```

File: src/app/api/openai/summarize/route.ts

```ts
import { NextRequest, NextResponse } from "next/server";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { OpenAIService } from "@/lib/services/openai";
import { z } from "zod";

// Initialize OpenAI service
const openaiService = new OpenAIService();

// Request validation schema
const requestSchema = z.object({
  text: z.string().min(1),
  options: z
    .object({
      maxLength: z.number().min(1).max(4000).optional(),
      format: z.enum(["paragraph", "bullets"]).optional(),
      includeTags: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Handle text summarization request
 * POST /api/openai/summarize
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const result = requestSchema.safeParse(body);

    if (!result.success) {
      throw new AppError(
        "Invalid request data",
        ErrorCode.VALIDATION_INVALID_FORMAT,
        HttpStatus.BAD_REQUEST,
        { details: result.error.format() }
      );
    }

    const { text, options = {} } = result.data;
    const response = await openaiService.generateSummary(text, options);

    return NextResponse.json({ data: response });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.toResponse() },
        { status: error.statusCode }
      );
    }

    const appError = new AppError(
      "Failed to generate summary",
      ErrorCode.API_SERVICE_UNAVAILABLE,
      HttpStatus.INTERNAL_ERROR,
      { details: error }
    );

    return NextResponse.json(
      { error: appError.toResponse() },
      { status: appError.statusCode }
    );
  }
}
```

File: src/app/api/openai/transcribe/route.ts

```ts
import { NextRequest, NextResponse } from "next/server";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { OpenAIService } from "@/lib/services/openai";
import { z } from "zod";

// Initialize OpenAI service
const openaiService = new OpenAIService();

// Request validation schema
const requestSchema = z.object({
  audioFile: z.instanceof(File),
});

/**
 * Handle audio transcription request
 * POST /api/openai/transcribe
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audioFile") as File;

    if (!audioFile) {
      throw new AppError(
        "Audio file is required",
        ErrorCode.VALIDATION_INVALID_FORMAT,
        HttpStatus.BAD_REQUEST
      );
    }

    const transcription = await openaiService.transcribeAudio(audioFile);
    return NextResponse.json({ data: { text: transcription } });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.toResponse() },
        { status: error.statusCode }
      );
    }

    const appError = new AppError(
      "Failed to transcribe audio",
      ErrorCode.API_SERVICE_UNAVAILABLE,
      HttpStatus.INTERNAL_ERROR,
      { details: error }
    );

    return NextResponse.json(
      { error: appError.toResponse() },
      { status: appError.statusCode }
    );
  }
}
```

File: src/app/api/replicate/generate-image/route.ts

```ts
import { NextResponse } from "next/server";
import Replicate from "replicate";
import { withErrorHandler } from "@/lib/middleware/errorHandler";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { logger } from "@/lib/utils/logger";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function handler(request: Request) {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new AppError(
      "Replicate API token is not configured",
      ErrorCode.API_SERVICE_UNAVAILABLE,
      HttpStatus.SERVICE_UNAVAILABLE
    );
  }

  const { prompt } = await request.json();

  if (!prompt) {
    throw new AppError(
      "Prompt is required",
      ErrorCode.VALIDATION_REQUIRED,
      HttpStatus.BAD_REQUEST
    );
  }

  try {
    logger.info("Generating image with Replicate", { prompt });
    const output = await replicate.run(
      "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
      {
        input: {
          prompt: prompt,
          image_dimensions: "512x512",
          num_outputs: 1,
          num_inference_steps: 50,
          guidance_scale: 7.5,
          scheduler: "DPMSolverMultistep",
        },
      }
    );

    return NextResponse.json({ output }, { status: 200 });
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error("Unknown error occurred");
    logger.error("Replicate API error", err, { prompt });
    throw new AppError(
      "Failed to generate image",
      ErrorCode.API_SERVICE_UNAVAILABLE,
      HttpStatus.SERVICE_UNAVAILABLE,
      { details: err.message }
    );
  }
}

export const POST = withErrorHandler(handler);
```

File: src/app/api/videos/route.ts

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { VideoProcessingService } from "@/lib/services/VideoProcessingService";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { z } from "zod";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Request validation schemas
const processVideoSchema = z.object({
  url: z.string().url(),
  options: z
    .object({
      refresh: z.boolean().optional(),
      language: z.string().optional(),
      generateSummary: z.boolean().optional(),
    })
    .optional(),
});

const refreshVideoSchema = z.object({
  videoId: z.string(),
});

/**
 * Get user ID from session
 */
async function getUserId(req: NextRequest): Promise<string> {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    throw new AppError(
      "No authentication token provided",
      ErrorCode.AUTH_INVALID_SESSION,
      HttpStatus.UNAUTHORIZED
    );
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new AppError(
      "Invalid authentication token",
      ErrorCode.AUTH_INVALID_SESSION,
      HttpStatus.UNAUTHORIZED,
      { details: error }
    );
  }

  return user.id;
}

/**
 * Process a video URL
 * POST /api/videos/process
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getUserId(req);
    const body = await req.json();

    const result = processVideoSchema.safeParse(body);
    if (!result.success) {
      throw new AppError(
        "Invalid request data",
        ErrorCode.VALIDATION_INVALID_FORMAT,
        HttpStatus.BAD_REQUEST,
        { details: result.error.format() }
      );
    }

    const service = new VideoProcessingService();
    const summary = await service.processVideo(
      result.data.url,
      userId,
      result.data.options
    );

    return NextResponse.json({ data: summary });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.toResponse() },
        { status: error.statusCode }
      );
    }

    const appError = new AppError(
      "Failed to process video",
      ErrorCode.API_SERVICE_UNAVAILABLE,
      HttpStatus.INTERNAL_ERROR,
      { details: error }
    );
    return NextResponse.json(
      { error: appError.toResponse() },
      { status: appError.statusCode }
    );
  }
}

/**
 * Refresh a video's transcript and summary
 * PUT /api/videos/refresh
 */
export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getUserId(req);
    const body = await req.json();

    const result = refreshVideoSchema.safeParse(body);
    if (!result.success) {
      throw new AppError(
        "Invalid request data",
        ErrorCode.VALIDATION_INVALID_FORMAT,
        HttpStatus.BAD_REQUEST,
        { details: result.error.format() }
      );
    }

    const service = new VideoProcessingService();
    const summary = await service.refreshVideo(result.data.videoId, userId);

    return NextResponse.json({ data: summary });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.toResponse() },
        { status: error.statusCode }
      );
    }

    const appError = new AppError(
      "Failed to refresh video",
      ErrorCode.API_SERVICE_UNAVAILABLE,
      HttpStatus.INTERNAL_ERROR,
      { details: error }
    );
    return NextResponse.json(
      { error: appError.toResponse() },
      { status: appError.statusCode }
    );
  }
}

/**
 * Get user's video summaries
 * GET /api/videos/summaries
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getUserId(req);

    const { data: summaries, error } = await supabase
      .from("user_summaries")
      .select("*, videos(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new AppError(
        "Failed to fetch summaries",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: error }
      );
    }

    return NextResponse.json({ data: summaries });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.toResponse() },
        { status: error.statusCode }
      );
    }

    const appError = new AppError(
      "Failed to fetch summaries",
      ErrorCode.API_SERVICE_UNAVAILABLE,
      HttpStatus.INTERNAL_ERROR,
      { details: error }
    );
    return NextResponse.json(
      { error: appError.toResponse() },
      { status: appError.statusCode }
    );
  }
}
```

File: src/app/auth/callback/route.ts

```ts
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
```

File: src/app/api/youtube/transcript/route.ts

```ts
import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/middleware/errorHandler";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { logger } from "@/lib/utils/logger";

async function handler(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");

  if (!videoId) {
    throw new AppError(
      "Video ID is required",
      ErrorCode.VALIDATION_REQUIRED,
      HttpStatus.BAD_REQUEST
    );
  }

  const response = await fetch(
    `https://youtube-transcript3.p.rapidapi.com/api/transcript?videoId=${videoId}`,
    {
      headers: {
        "x-rapidapi-host": "youtube-transcript3.p.rapidapi.com",
        "x-rapidapi-key": "fb3f0acafdmsh409d48594da062ap1b22e3jsn034f696e4c63",
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    logger.warn("YouTube API error response", {
      status: response.status,
      videoId,
      error: errorData,
    });

    // Handle specific error cases
    if (response.status === 404) {
      throw new AppError(
        "No transcript available for this video. This might be a live stream or a video without captions.",
        ErrorCode.API_INVALID_REQUEST,
        HttpStatus.NOT_FOUND
      );
    }

    if (errorData.message) {
      throw new AppError(
        errorData.message,
        ErrorCode.API_SERVICE_UNAVAILABLE,
        response.status
      );
    }

    throw new AppError(
      "Failed to fetch transcript",
      ErrorCode.API_SERVICE_UNAVAILABLE,
      HttpStatus.INTERNAL_ERROR
    );
  }

  const data = await response.json();

  // Additional validation for empty transcripts
  if (!data || (Array.isArray(data) && data.length === 0)) {
    throw new AppError(
      "No transcript content available for this video",
      ErrorCode.API_INVALID_REQUEST,
      HttpStatus.NOT_FOUND
    );
  }

  return NextResponse.json(data);
}

export const GET = withErrorHandler(handler);
```

File: src/app/components/auth/AuthGuard.tsx

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Show nothing while loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!user) {
    return null;
  }

  // If we have a user, render the protected content
  return <>{children}</>;
}
```

File: src/app/components/LinkInput.tsx

```tsx
"use client";

import { useState, useEffect } from "react";

interface LinkInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export default function LinkInput({ onSubmit, isLoading }: LinkInputProps) {
  const [url, setUrl] = useState("");
  const [isValid, setIsValid] = useState(false);

  const validateYouTubeUrl = (url: string) => {
    const pattern =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|live\/|shorts\/|channel\/)|youtu\.be\/).+/;
    return pattern.test(url);
  };

  useEffect(() => {
    setIsValid(validateYouTubeUrl(url));
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && !isLoading) {
      onSubmit(url);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-purple-100/20">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          Add New Video
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="min-h-[110px]">
            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter YouTube video or channel link"
                className="w-full p-4 text-lg text-gray-700 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 border border-purple-100 placeholder-gray-400 transition-all duration-200"
                disabled={isLoading}
              />
              {url && (
                <div className="absolute right-4 top-4">
                  {isValid ? (
                    <span className="text-green-500 text-xl">✓</span>
                  ) : (
                    <span className="text-red-500 text-xl">✗</span>
                  )}
                </div>
              )}
            </div>
            <div className="h-8 mt-2">
              {url && !isValid && (
                <p className="text-sm text-red-500">
                  Please enter a valid YouTube video or channel URL
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={!isValid || isLoading}
              className={`
                px-8 py-3 rounded-xl text-lg font-medium transition-all duration-300 relative
                ${
                  isValid && !isLoading
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:-translate-y-0.5"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }
              `}
            >
              <span
                className={`transition-opacity duration-200 ${
                  isLoading ? "opacity-0" : "opacity-100"
                }`}
              >
                Generate Summary
              </span>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

File: src/app/components/LoadingCard.tsx

```tsx
"use client";

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
```

File: src/app/api/deepgram/route.ts

```ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    key: process.env.DEEPGRAM_API_KEY ?? "",
  });
}
```

File: src/app/components/Navigation.tsx

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";

export default function Navigation() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-white/70 backdrop-blur-sm border-b border-purple-100/20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and links */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link
                href="/"
                className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text"
              >
                RileySummarizer
              </Link>
            </div>
            <div className="ml-10 flex items-center space-x-4">
              <Link
                href="/"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/")
                    ? "text-purple-700 bg-purple-50"
                    : "text-gray-600 hover:text-purple-600 hover:bg-purple-50"
                }`}
              >
                Home
              </Link>
              <Link
                href="/summaries"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive("/summaries")
                    ? "text-purple-700 bg-purple-50"
                    : "text-gray-600 hover:text-purple-600 hover:bg-purple-50"
                }`}
              >
                My Summaries
              </Link>
            </div>
          </div>

          {/* Right side - User menu */}
          {user && (
            <div className="flex items-center">
              <Menu as="div" className="relative ml-3">
                <Menu.Button className="flex items-center max-w-xs p-2 rounded-full hover:bg-purple-50 focus:outline-none">
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white font-medium">
                    {user.email?.[0].toUpperCase()}
                  </div>
                </Menu.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <Menu.Item>
                      {({ active }: { active: boolean }) => (
                        <button
                          onClick={signOut}
                          className={`${
                            active ? "bg-purple-50" : ""
                          } block w-full px-4 py-2 text-sm text-gray-700 text-left`}
                        >
                          Sign out
                        </button>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
```

File: src/app/components/Toast.tsx

```tsx
import { useEffect } from "react";

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
```

File: src/app/login/page.tsx

```tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import LoginButton from "@/components/auth/LoginButton";
import Toast from "@/app/components/Toast";

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text">
              Welcome to Video Summarizer
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl">
              Sign in to start generating AI-powered summaries of your favorite
              YouTube videos.
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-purple-100/20 w-full max-w-md">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                  Sign In
                </h2>
                <p className="text-gray-600">
                  Use your Google account to access all features.
                </p>
              </div>

              <div className="flex justify-center">
                <LoginButton />
              </div>
            </div>
          </div>
        </div>
      </div>
      {error === "auth_callback_failed" && (
        <Toast
          message="Authentication failed. Please try again."
          onClose={() => router.replace("/login")}
        />
      )}
    </div>
  );
}
```

File: src/app/layout.tsx

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ToastProvider } from "@/lib/contexts/ToastContext";
import { ToastContainer } from "@/components/ui/Toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Video Summarizer",
  description: "AI-powered YouTube video summarizer",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      {...{
        "data-qb-extension-installed": "",
        "data-qb-installed": "",
      }}
    >
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <ToastProvider>
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
              {children}
            </div>
            <ToastContainer />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

File: src/app/components/SummaryCard.tsx

```tsx
import ReactMarkdown from "react-markdown";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { logger } from "@/lib/utils/logger";
import { useToast } from "@/lib/contexts/ToastContext";
import { ToastVariant } from "@/lib/types/toast";

interface SummaryCardProps {
  title: string;
  channelName: string;
  date: string;
  summary: string;
  videoUrl: string;
  tags?: string[];
}

export default function SummaryCard({
  title,
  channelName,
  date,
  summary,
  videoUrl,
  tags = [],
}: SummaryCardProps) {
  const [isLoadingDetailed, setIsLoadingDetailed] = useState(false);
  const [detailedSummary, setDetailedSummary] = useState<string | null>(null);
  const [isShowingDetailed, setIsShowingDetailed] = useState(false);
  const toast = useToast();

  const handleGetDetailedSummary = async () => {
    if (detailedSummary) {
      setIsShowingDetailed(!isShowingDetailed);
      return;
    }

    setIsLoadingDetailed(true);
    try {
      const response = await fetch("/api/openai/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: summary,
          options: {
            format: "paragraph",
            maxLength: 2000,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error?.message || "Failed to generate detailed summary"
        );
      }

      const { data } = await response.json();
      setDetailedSummary(data.summary);
      setIsShowingDetailed(true);
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Unknown error occurred");
      logger.error("Failed to generate detailed summary", err, {
        title,
        summaryLength: summary.length,
      });
      toast.error(
        "Failed to generate detailed summary. Please try again later."
      );
    } finally {
      setIsLoadingDetailed(false);
    }
  };

  const currentSummary = isShowingDetailed ? detailedSummary : summary;

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-purple-100/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-semibold text-gray-800 mb-3 line-clamp-2">
            {title}
          </h3>
          <div className="flex items-center space-x-3 text-base text-gray-500">
            <span className="font-medium">{channelName}</span>
            <span>•</span>
            <span>{date}</span>
          </div>
        </div>
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
        >
          <span className="font-medium">Watch Video</span>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>

      <div className="mt-6">
        <div className="prose prose-lg max-w-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={isShowingDetailed ? "detailed" : "brief"}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ReactMarkdown
                components={{
                  strong: ({ children }) => (
                    <span className="font-bold text-purple-800">
                      {children}
                    </span>
                  ),
                  p: ({ children }) => (
                    <p className="text-gray-600 leading-relaxed mb-4">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="space-y-2 my-4 list-none">{children}</ul>
                  ),
                  li: ({ children }) => (
                    <li className="flex items-start space-x-2">
                      <span className="text-purple-600 mt-1.5">•</span>
                      <span className="text-gray-600">{children}</span>
                    </li>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-semibold text-purple-800 mt-4 mb-2">
                      {children}
                    </h3>
                  ),
                }}
              >
                {currentSummary}
              </ReactMarkdown>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex flex-col space-y-4 mt-4">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  className="px-3 py-1 text-sm rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors cursor-pointer"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={handleGetDetailedSummary}
              disabled={isLoadingDetailed}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                ${
                  isLoadingDetailed
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:-translate-y-0.5"
                }`}
            >
              {isLoadingDetailed ? (
                <div className="flex items-center space-x-2">
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Generating...</span>
                </div>
              ) : isShowingDetailed ? (
                "Show Brief Summary"
              ) : (
                "Show Detailed Summary"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

File: src/app/page.tsx

```tsx
"use client";

import { useState } from "react";
import Navigation from "./components/Navigation";
import LinkInput from "./components/LinkInput";
import SummaryCard from "./components/SummaryCard";
import LoadingCard from "./components/LoadingCard";
import Toast from "./components/Toast";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/lib/auth/AuthContext";

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

interface SummaryWithTags {
  title: string;
  channelName: string;
  date: string;
  summary: string;
  videoUrl: string;
  tags: string[];
}

// Mock data for demonstration
const mockSummaries: SummaryWithTags[] = [
  {
    title: "Video title xyz abc",
    channelName: "channel name",
    date: "2/2/25",
    summary:
      "This is where the summary will be for the latest video the user has subscribed to. It will contain key points and main takeaways from the video content.",
    videoUrl: "https://youtube.com/watch?v=example",
    tags: ["Technology", "Tutorial"],
  },
];

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [summaries, setSummaries] = useState<SummaryWithTags[]>(mockSummaries);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const generateTags = (title: string, summary: string): string[] => {
    // Extract meaningful words from title and summary
    const text = `${title} ${summary}`.toLowerCase();
    const words = text.split(/\s+/);

    // Common words to exclude
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
    ]);

    // Get unique meaningful words
    const uniqueWords = new Set(
      words
        .filter((word) => word.length > 2) // Filter out short words
        .filter((word) => !stopWords.has(word)) // Filter out stop words
        .filter((word) => /^[a-z]+$/.test(word)) // Only keep words with letters
    );

    // Convert words to title case and limit to 5 most relevant tags
    return Array.from(uniqueWords)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .slice(0, 5);
  };

  const handleSubmit = async (url: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Extract video ID from various YouTube URL formats
      let videoId = "";

      try {
        const urlObj = new URL(url);

        if (url.includes("youtu.be")) {
          // Handle youtu.be format
          videoId = url.split("youtu.be/")[1]?.split("?")[0] || "";
        } else if (url.includes("youtube.com/live/")) {
          // Handle live stream format
          videoId = url.split("youtube.com/live/")[1]?.split("?")[0] || "";
        } else if (url.includes("youtube.com/shorts/")) {
          // Handle shorts format
          videoId = url.split("youtube.com/shorts/")[1]?.split("?")[0] || "";
        } else if (urlObj.searchParams.get("v")) {
          // Handle standard youtube.com format with v parameter
          const vParam = urlObj.searchParams.get("v");
          if (vParam) videoId = vParam;
        }
      } catch (e) {
        throw new Error(
          "Invalid URL format. Please enter a valid YouTube URL."
        );
      }

      if (!videoId) {
        throw new Error(
          "Could not extract video ID. Please make sure you're using a valid YouTube video URL."
        );
      }

      // Clean the video ID
      videoId = videoId.trim();

      // Validate video ID format (allow both standard 11-char IDs and longer live stream IDs)
      if (!/^[a-zA-Z0-9_-]{11,}$/.test(videoId)) {
        throw new Error("Invalid YouTube video ID format.");
      }

      // Get transcript
      const transcriptResponse = await fetch(
        `/api/youtube/transcript?videoId=${videoId}`
      );
      if (!transcriptResponse.ok) {
        throw new Error("Failed to fetch transcript");
      }
      const transcriptData = await transcriptResponse.json();

      // Process the transcript data into a readable format
      let transcript;
      if (Array.isArray(transcriptData)) {
        transcript = (transcriptData as TranscriptSegment[])
          .map((segment) => segment.text)
          .filter(Boolean)
          .join(" ");
      } else if (
        transcriptData.transcript &&
        Array.isArray(transcriptData.transcript)
      ) {
        transcript = (transcriptData.transcript as TranscriptSegment[])
          .map((segment) => segment.text)
          .filter(Boolean)
          .join(" ");
      } else {
        throw new Error("Unexpected transcript format");
      }

      if (!transcript) {
        throw new Error("No transcript content found");
      }

      // Get summary using OpenAI
      const summaryResponse = await fetch("/api/openai/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: transcript }),
      });
      if (!summaryResponse.ok) {
        throw new Error("Failed to generate summary");
      }
      const {
        data: { summary },
      } = await summaryResponse.json();

      // Get tags using OpenAI
      const tagsResponse = await fetch("/api/openai/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: transcript,
          options: { includeTags: true },
        }),
      });
      if (!tagsResponse.ok) {
        throw new Error("Failed to generate tags");
      }
      const {
        data: { tags },
      } = await tagsResponse.json();

      // Get video metadata from YouTube oEmbed
      const oembedResponse = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(
          url
        )}&format=json`
      );
      const videoData = await oembedResponse.json();

      const newSummary: SummaryWithTags = {
        title: videoData.title,
        channelName: videoData.author_name,
        date: new Date().toLocaleDateString(),
        summary,
        videoUrl: url,
        tags,
      };

      setSummaries((prev) => [newSummary, ...prev]);
    } catch (error) {
      console.error("Error:", error);
      setError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthGuard>
      <main>
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text mb-6">
              Video Summarizer
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get instant AI-powered summaries of YouTube videos. Save time and
              decide what to watch.
            </p>
          </div>

          <LinkInput onSubmit={handleSubmit} isLoading={isLoading} />

          <div className="space-y-6 mt-12">
            {isLoading && <LoadingCard />}

            {summaries.map((summary, index) => (
              <div
                key={index}
                className="transition-all duration-500 animate-fade-in"
              >
                <SummaryCard {...summary} />
              </div>
            ))}
          </div>

          {summaries.length === 0 && !isLoading && (
            <div className="text-center py-16">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-purple-100/20">
                <h3 className="text-2xl font-semibold text-gray-800 mb-3">
                  No summaries yet
                </h3>
                <p className="text-gray-600 text-lg">
                  Add a YouTube link above to get started with your first video
                  summary!
                </p>
              </div>
            </div>
          )}
        </div>
        {error && <Toast message={error} onClose={() => setError(null)} />}
      </main>
    </AuthGuard>
  );
}
```

File: src/app/summaries/page.tsx

```tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { DatabaseService } from "@/lib/services/DatabaseService";
import AuthGuard from "@/components/auth/AuthGuard";
import Navigation from "@/app/components/Navigation";
import SummaryCard from "@/app/components/SummaryCard";
import LoadingCard from "@/app/components/LoadingCard";
import {
  VideoRecord,
  UserSummaryRecord,
  ChannelRecord,
} from "@/lib/types/database";
import { logger } from "@/lib/utils/logger";
import { useToast } from "@/lib/contexts/ToastContext";
import { ToastVariant } from "@/lib/types/toast";

interface SummaryWithTags {
  title: string;
  channelName: string;
  date: string;
  summary: string;
  videoUrl: string;
  tags: string[];
}

type JoinedVideo = VideoRecord & {
  channels: ChannelRecord;
};

type JoinedUserSummary = UserSummaryRecord & {
  videos: JoinedVideo;
};

const databaseService = new DatabaseService();

export default function SummariesPage() {
  const [summaries, setSummaries] = useState<SummaryWithTags[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (user) {
      loadSummaries();
    }
  }, [user]);

  const loadSummaries = async () => {
    try {
      if (!user) return;
      setIsLoading(true);
      const userSummaries = (await databaseService.getUserSummaries(
        user.id
      )) as JoinedUserSummary[];

      if (!userSummaries) {
        setSummaries([]);
        return;
      }

      // Transform database records to UI format
      const transformedSummaries: SummaryWithTags[] = userSummaries.map(
        (record) => {
          if (!record.videos) {
            return {
              title: "Untitled",
              channelName: "Unknown Channel",
              date: new Date(record.created_at).toLocaleDateString(),
              summary: record.summary,
              videoUrl: "",
              tags: record.tags || [],
            };
          }

          return {
            title: record.videos.title,
            channelName: record.videos.channels.name,
            date: new Date(record.created_at).toLocaleDateString(),
            summary: record.summary,
            videoUrl: record.videos.url,
            tags: record.tags || [],
          };
        }
      );

      setSummaries(transformedSummaries);
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Unknown error occurred");
      logger.error("Failed to load user summaries", err, {
        userId: user?.id,
      });
      toast.error("Failed to load your summaries. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthGuard>
      <main>
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-transparent bg-clip-text mb-6">
              Your Summaries
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              View and manage all your video summaries in one place.
            </p>
          </div>

          <div className="space-y-6">
            {isLoading ? (
              <LoadingCard />
            ) : summaries.length > 0 ? (
              summaries.map((summary, index) => (
                <div
                  key={index}
                  className="transition-all duration-500 animate-fade-in"
                >
                  <SummaryCard {...summary} />
                </div>
              ))
            ) : (
              <div className="text-center py-16">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-purple-100/20">
                  <h3 className="text-2xl font-semibold text-gray-800 mb-3">
                    No summaries yet
                  </h3>
                  <p className="text-gray-600 text-lg">
                    Head back to the home page to create your first video
                    summary!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
```

File: src/components/auth/AuthGuard.tsx

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import LoginButton from "./LoginButton";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <svg
            className="animate-spin h-8 w-8 text-purple-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Please sign in to continue
        </h1>
        <LoginButton />
      </div>
    );
  }

  return <>{children}</>;
}
```

File: src/app/globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* Base styles for HTML elements */
  html {
    @apply antialiased text-neutral-900 bg-neutral-50;
  }

  body {
    @apply min-h-screen;
  }

  /* Heading styles */
  h1 {
    @apply text-4xl font-bold tracking-tight;
  }

  h2 {
    @apply text-3xl font-semibold tracking-tight;
  }

  h3 {
    @apply text-2xl font-semibold;
  }

  h4 {
    @apply text-xl font-semibold;
  }

  /* Focus styles */
  :focus-visible {
    @apply outline-none ring-2 ring-primary-500 ring-offset-2;
  }
}

@layer components {
  /* Button variants */
  .btn {
    @apply inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
           disabled:pointer-events-none disabled:opacity-50;
  }

  .btn-primary {
    @apply btn bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800;
  }

  .btn-secondary {
    @apply btn bg-secondary-600 text-white hover:bg-secondary-700 active:bg-secondary-800;
  }

  .btn-outline {
    @apply btn border-2 border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100;
  }

  .btn-ghost {
    @apply btn bg-transparent hover:bg-neutral-100 active:bg-neutral-200;
  }

  /* Input styles */
  .input {
    @apply block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm
           placeholder:text-neutral-400
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
           disabled:pointer-events-none disabled:opacity-50;
  }

  /* Card styles */
  .card {
    @apply rounded-xl border border-neutral-200 bg-white p-6 shadow-sm;
  }

  /* Badge variants */
  .badge {
    @apply inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium;
  }

  .badge-primary {
    @apply badge bg-primary-50 text-primary-700;
  }

  .badge-secondary {
    @apply badge bg-secondary-50 text-secondary-700;
  }

  .badge-success {
    @apply badge bg-success-50 text-success-700;
  }

  .badge-error {
    @apply badge bg-error-50 text-error-700;
  }

  .badge-warning {
    @apply badge bg-warning-50 text-warning-700;
  }

  /* Form group */
  .form-group {
    @apply space-y-2;
  }

  .form-label {
    @apply block text-sm font-medium text-neutral-700;
  }

  .form-hint {
    @apply text-xs text-neutral-500;
  }

  .form-error {
    @apply text-xs text-error-600;
  }
}

@layer utilities {
  /* Layout utilities */
  .center {
    @apply flex items-center justify-center;
  }

  .stack {
    @apply flex flex-col;
  }

  .stack-h {
    @apply flex flex-row;
  }

  /* Text utilities */
  .truncate-2 {
    @apply line-clamp-2;
  }

  .truncate-3 {
    @apply line-clamp-3;
  }

  /* Animation utilities */
  .animate-once {
    @apply animation-count-1;
  }

  .animate-twice {
    @apply animation-count-2;
  }

  .animate-thrice {
    @apply animation-count-3;
  }
}
```

File: src/components/ui/Toast.tsx

```tsx
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
    <svg
      className="w-5 h-5 text-red-400"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
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
```

File: src/components/auth/LoginButton.tsx

```tsx
"use client";

import { useAuth } from "@/lib/auth/AuthContext";

export default function LoginButton() {
  const { signInWithGoogle, isLoading } = useAuth();

  return (
    <button
      onClick={signInWithGoogle}
      disabled={isLoading}
      className={`
        flex items-center justify-center gap-2 px-4 py-2 rounded-xl
        text-sm font-medium transition-all duration-300
        ${
          isLoading
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md"
        }
      `}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <svg
            className="animate-spin h-4 w-4 text-gray-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Signing in...</span>
        </div>
      ) : (
        <>
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Sign in with Google</span>
        </>
      )}
    </button>
  );
}
```

File: src/components/ImageUpload.tsx

```tsx
import React, { useState, useRef } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
  onImageChange: (file: File | null) => void;
}

export default function ImageUpload({ onImageChange }: ImageUploadProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageChange(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    onImageChange(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center justify-center w-full">
      {imagePreview ? (
        <div className="relative w-full h-64">
          <Image
            src={imagePreview}
            alt="Preview"
            layout="fill"
            objectFit="cover"
            className="rounded-lg"
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        <label
          htmlFor="image"
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <ImageIcon className="w-10 h-10 mb-3 text-gray-400" />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and
              drop
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG or GIF (MAX. 800x400px)
            </p>
          </div>
        </label>
      )}
      <input
        type="file"
        id="image"
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
        ref={fileInputRef}
      />
    </div>
  );
}
```

File: src/components/SignInWithGoogle.tsx

```tsx
"use client";

import { useAuth } from "../lib/auth/AuthContext";

export default function SignInWithGoogle() {
  const { signInWithGoogle } = useAuth();

  return (
    <button
      onClick={signInWithGoogle}
      className="flex items-center justify-center bg-white text-gray-700 font-semibold py-2 px-4 rounded-full border border-gray-300 hover:bg-gray-100 transition duration-300 ease-in-out"
    >
      <img
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
        alt="Google logo"
        className="w-6 h-6 mr-2"
      />
      Sign in with Google
    </button>
  );
}
```

File: src/lib/auth/AuthContext.tsx

```tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, AuthError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  error: AuthError | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.protocol}//${window.location.host}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;

      // Let Supabase handle the redirect
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err as AuthError);
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      setError(err as AuthError);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signInWithGoogle,
        signOut,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

File: src/components/VoiceRecorder.tsx

```tsx
"use client";

import { useState, useEffect } from "react";
import { useDeepgram } from "../lib/contexts/DeepgramContext";
import { addDocument } from "../lib/firebase/firebaseUtils";
import { motion } from "framer-motion";

export default function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const {
    connectToDeepgram,
    disconnectFromDeepgram,
    connectionState,
    realtimeTranscript,
  } = useDeepgram();

  const handleStartRecording = async () => {
    await connectToDeepgram();
    setIsRecording(true);
  };

  const handleStopRecording = async () => {
    disconnectFromDeepgram();
    setIsRecording(false);

    // Save the note to Firebase
    if (realtimeTranscript) {
      await addDocument("notes", {
        text: realtimeTranscript,
        timestamp: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="w-full max-w-md">
      <button
        onClick={isRecording ? handleStopRecording : handleStartRecording}
        className={`w-full py-2 px-4 rounded-full ${
          isRecording
            ? "bg-red-500 hover:bg-red-600"
            : "bg-blue-500 hover:bg-blue-600"
        } text-white font-bold`}
      >
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>
      {isRecording && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-8 h-8 bg-blue-500 rounded-full mx-auto mb-4"
          />
          <p className="text-sm text-gray-600">{realtimeTranscript}</p>
        </div>
      )}
    </div>
  );
}
```

File: src/lib/auth/middleware.ts

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";

/**
 * Get user ID from session
 */
export async function getUserId(req: NextRequest): Promise<string> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          req.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    throw new AppError(
      "Authentication required",
      ErrorCode.AUTH_INVALID_SESSION,
      HttpStatus.UNAUTHORIZED,
      { details: error }
    );
  }

  return session.user.id;
}

/**
 * Middleware to protect routes
 */
export function withAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    try {
      await getUserId(req);
      return handler(req);
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json(
          { error: error.toResponse() },
          { status: error.statusCode }
        );
      }

      const appError = new AppError(
        "Authentication failed",
        ErrorCode.AUTH_INVALID_SESSION,
        HttpStatus.UNAUTHORIZED,
        { details: error }
      );

      return NextResponse.json(
        { error: appError.toResponse() },
        { status: appError.statusCode }
      );
    }
  };
}
```

File: src/lib/auth/supabase.ts

```ts
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/lib/types/supabase";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

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

File: src/lib/contexts/DeepgramContext.tsx

```tsx
"use client";

import {
  createClient,
  LiveClient,
  SOCKET_STATES,
  LiveTranscriptionEvents,
  type LiveSchema,
  type LiveTranscriptionEvent,
} from "@deepgram/sdk";
import { logger } from "@/lib/utils/logger";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  FunctionComponent,
  useRef,
} from "react";

interface DeepgramContextType {
  connectToDeepgram: () => Promise<void>;
  disconnectFromDeepgram: () => void;
  connectionState: SOCKET_STATES;
  realtimeTranscript: string;
  error: string | null;
}

const DeepgramContext = createContext<DeepgramContextType | undefined>(
  undefined
);

interface DeepgramContextProviderProps {
  children: ReactNode;
}

const getApiKey = async (): Promise<string> => {
  const response = await fetch("/api/deepgram", { cache: "no-store" });
  const result = await response.json();
  return result.key;
};

const DeepgramContextProvider: FunctionComponent<
  DeepgramContextProviderProps
> = ({ children }) => {
  const [connection, setConnection] = useState<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<SOCKET_STATES>(
    SOCKET_STATES.closed
  );
  const [realtimeTranscript, setRealtimeTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<MediaRecorder | null>(null);

  const connectToDeepgram = async () => {
    try {
      setError(null);
      setRealtimeTranscript("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioRef.current = new MediaRecorder(stream);

      const apiKey = await getApiKey();

      logger.info("Initializing Deepgram WebSocket connection");
      const socket = new WebSocket("wss://api.deepgram.com/v1/listen", [
        "token",
        apiKey,
      ]);

      socket.onopen = () => {
        setConnectionState(SOCKET_STATES.open);
        logger.info("Deepgram WebSocket connection established");
        audioRef.current!.addEventListener("dataavailable", (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        });

        audioRef.current!.start(250);
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (
          data.channel &&
          data.channel.alternatives &&
          data.channel.alternatives[0]
        ) {
          const newTranscript = data.channel.alternatives[0].transcript;
          setRealtimeTranscript((prev) => prev + " " + newTranscript);
        }
      };

      socket.onerror = (error: Event) => {
        logger.error(
          "Deepgram WebSocket error",
          new Error("WebSocket connection failed"),
          {
            event: error,
            state: socket.readyState,
          }
        );
        setError("Error connecting to Deepgram. Please try again.");
        disconnectFromDeepgram();
      };

      socket.onclose = (event) => {
        setConnectionState(SOCKET_STATES.closed);
        logger.info("Deepgram WebSocket connection closed", {
          code: event.code,
          reason: event.reason,
        });
      };

      setConnection(socket);
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Unknown error occurred");
      logger.error("Failed to start voice recognition", err);
      setError(err.message);
      setConnectionState(SOCKET_STATES.closed);
    }
  };

  const disconnectFromDeepgram = () => {
    if (connection) {
      connection.close();
      setConnection(null);
    }
    if (audioRef.current) {
      audioRef.current.stop();
    }
    setRealtimeTranscript("");
    setConnectionState(SOCKET_STATES.closed);
  };

  return (
    <DeepgramContext.Provider
      value={{
        connectToDeepgram,
        disconnectFromDeepgram,
        connectionState,
        realtimeTranscript,
        error,
      }}
    >
      {children}
    </DeepgramContext.Provider>
  );
};

// Use the useDeepgram hook to access the deepgram context and use the deepgram in any component.
// This allows you to connect to the deepgram and disconnect from the deepgram via a socket.
// Make sure to wrap your application in a DeepgramContextProvider to use the deepgram.
function useDeepgram(): DeepgramContextType {
  const context = useContext(DeepgramContext);
  if (context === undefined) {
    throw new Error(
      "useDeepgram must be used within a DeepgramContextProvider"
    );
  }
  return context;
}

export {
  DeepgramContextProvider,
  useDeepgram,
  SOCKET_STATES,
  LiveTranscriptionEvents,
  type LiveTranscriptionEvent,
};
```

File: src/lib/hooks/useAuth.ts

```ts
import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

export const useAuth = () => useContext(AuthContext);
```

File: src/lib/contexts/LoadingContext.tsx

```tsx
"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from "react";
import {
  LoadingType,
  LoadingState,
  LoadingContextState,
  LoadingContextActions,
} from "../types/loading";

type LoadingAction =
  | { type: "START_LOADING"; payload: { type: LoadingType; message?: string } }
  | {
      type: "UPDATE_LOADING";
      payload: { type: LoadingType; progress?: number; message?: string };
    }
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
      dispatch({
        type: "UPDATE_LOADING",
        payload: { type, progress, message },
      });
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
```

File: src/lib/contexts/ToastContext.tsx

```tsx
"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from "react";
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

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
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
  }, []);

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
```

File: src/lib/middleware/errorHandler.ts

```ts
import { NextResponse } from "next/server";
import { AppError, ErrorCode, HttpStatus } from "../types/errors";
import { logger } from "../utils/logger";

type ApiHandler = (
  request: Request,
  ...args: any[]
) => Promise<Response> | Response;

/**
 * Wraps an API route handler with error handling
 */
export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (request: Request, ...args: any[]) => {
    try {
      const response = await handler(request, ...args);
      return response;
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Unknown error occurred");
      logger.error("API request failed", err, {
        url: request.url,
        method: request.method,
      });

      if (error instanceof AppError) {
        return NextResponse.json(error.toResponse(), {
          status: error.statusCode,
        });
      }

      // Handle Supabase errors
      if (error && typeof error === "object" && "code" in error) {
        const supabaseError = error as {
          code: string;
          message: string;
          status?: number;
        };
        return NextResponse.json(
          {
            error: {
              message: supabaseError.message,
              code: `supabase/${supabaseError.code}`,
            },
          },
          { status: supabaseError.status || HttpStatus.INTERNAL_ERROR }
        );
      }

      // Handle unknown errors
      const unknownError = new AppError(
        "An unexpected error occurred",
        ErrorCode.UNKNOWN,
        HttpStatus.INTERNAL_ERROR
      );

      return NextResponse.json(unknownError.toResponse(), {
        status: unknownError.statusCode,
      });
    }
  };
}

/**
 * Validates request data against a schema
 */
export async function validateRequest<T>(
  request: Request,
  schema: {
    validate: (data: unknown) => Promise<T> | T;
  }
): Promise<T> {
  try {
    const body = await request.json();
    return await schema.validate(body);
  } catch (error) {
    throw new AppError(
      "Invalid request data",
      ErrorCode.VALIDATION_INVALID_FORMAT,
      HttpStatus.BAD_REQUEST,
      { details: error instanceof Error ? error.message : "Validation failed" }
    );
  }
}

/**
 * Ensures the request has a valid authentication session
 */
export async function requireAuth(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    throw new AppError(
      "Authentication required",
      ErrorCode.AUTH_INVALID_SESSION,
      HttpStatus.UNAUTHORIZED
    );
  }

  // Add your auth validation logic here
  // For example, validate JWT token or session

  return authHeader;
}
```

File: src/lib/services/openai.ts

```ts
import OpenAI from "openai";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { retryApi } from "@/lib/utils/retry";

/**
 * OpenAI service for handling AI operations
 */
export class OpenAIService {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Generate a chat completion using the OpenAI API
   * @param messages - Array of messages for the chat completion
   * @param options - Optional parameters for the chat completion
   * @returns A chat completion response
   */
  async generateChatCompletion(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    options: Partial<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming> = {}
  ): Promise<OpenAI.Chat.ChatCompletion> {
    const defaultOptions: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
      model: "gpt-4",
      temperature: 0.7,
      max_tokens: 2000,
      messages,
      stream: false,
    };

    const params = { ...defaultOptions, ...options };

    try {
      return await retryApi(() => this.client.chat.completions.create(params));
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new AppError(
          error.message,
          ErrorCode.API_SERVICE_UNAVAILABLE,
          error.status || HttpStatus.SERVICE_UNAVAILABLE
        );
      }
      throw new AppError(
        "Failed to create chat completion",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
        { details: error }
      );
    }
  }

  /**
   * Generate a summary for the given text
   * @param text - The text to summarize
   * @param options - Optional parameters for summary generation
   * @returns A string containing the generated summary and optional tags
   */
  async generateSummary(
    text: string,
    options: {
      maxLength?: number;
      format?: "paragraph" | "bullets";
      includeTags?: boolean;
    } = {}
  ): Promise<{ summary: string; tags?: string[] }> {
    const {
      maxLength = 1000,
      format = "paragraph",
      includeTags = false,
    } = options;

    const prompt = `
Text to summarize:
${text}

Instructions:
1. Create a ${
      format === "paragraph" ? "coherent paragraph" : "bulleted list"
    } summary
2. Keep the summary under ${maxLength} characters
${includeTags ? "3. Include 3-5 relevant tags" : ""}
`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          "You are a helpful assistant that generates concise summaries. Keep summaries clear and informative. If requested, include relevant tags.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const response = await this.generateChatCompletion(messages, {
      temperature: 0.5,
      max_tokens: Math.floor(maxLength / 4),
    });

    const content = response.choices[0]?.message?.content || "";

    // Extract tags if they were requested
    let tags: string[] | undefined;
    if (includeTags && content.includes("#")) {
      tags = content
        .split("\n")
        .find((line) => line.startsWith("#"))
        ?.split("#")
        .filter(Boolean)
        .map((tag) => tag.trim());
    }

    return {
      summary: content.replace(/Tags:?\s*#.*$/m, "").trim(),
      ...(tags && { tags }),
    };
  }

  /**
   * Generate tags for the given text
   * @param text - The text to generate tags for
   * @returns An array of generated tags
   */
  async generateTags(text: string): Promise<string[]> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          "You are a helpful assistant that generates relevant tags. Generate 3-5 tags that best describe the content.",
      },
      {
        role: "user",
        content: `Please generate tags for the following text:\n\n${text}`,
      },
    ];

    const response = await this.generateChatCompletion(messages, {
      temperature: 0.3,
      max_tokens: 100,
    });

    const content = response.choices[0]?.message?.content || "";
    return content
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }

  /**
   * Transcribe audio to text using Whisper
   * @param audioFile - The audio file to transcribe
   * @returns The transcribed text
   */
  async transcribeAudio(audioFile: File): Promise<string> {
    try {
      const response = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      });

      return response.text;
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new AppError(
          error.message,
          ErrorCode.API_SERVICE_UNAVAILABLE,
          error.status || HttpStatus.SERVICE_UNAVAILABLE
        );
      }
      throw new AppError(
        "Failed to transcribe audio",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
        { details: error }
      );
    }
  }
}
```

File: src/lib/services/DatabaseService.ts

```ts
import { supabase } from "@/lib/auth/supabase";
import {
  VideoRecord,
  UserSummaryRecord,
  ChannelRecord,
  ProfileRecord,
  TagRecord,
  ContentTagRecord,
  SubscriptionRecord,
} from "@/lib/types/database";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { retryDatabase } from "@/lib/utils/retry";
import { logger } from "@/lib/utils/logger";

export class DatabaseService {
  private supabase;
  private logger = logger.withContext({ service: "DatabaseService" });

  constructor() {
    this.supabase = supabase;
  }

  // Profile methods
  async getProfile(userId: string): Promise<ProfileRecord | null> {
    const result = await retryDatabase(
      async () => {
        const { data, error } = await this.supabase
          .from("profiles")
          .select()
          .eq("id", userId)
          .single();
        return { data, error };
      },
      { operationName: "getProfile" }
    );

    if (result.error) {
      throw new AppError(
        "Failed to fetch profile",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: result.error }
      );
    }

    return result.data;
  }

  async upsertProfile(
    profile: Omit<ProfileRecord, "created_at">
  ): Promise<ProfileRecord> {
    const result = await retryDatabase(
      async () => {
        const { data, error } = await this.supabase
          .from("profiles")
          .upsert(profile)
          .select()
          .single();
        return { data, error };
      },
      { operationName: "upsertProfile" }
    );

    if (result.error) {
      throw new AppError(
        "Failed to upsert profile",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: result.error }
      );
    }

    if (!result.data) {
      throw new AppError(
        "Failed to upsert profile - no data returned",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR
      );
    }

    return result.data;
  }

  // Channel methods
  async findChannelById(id: string): Promise<ChannelRecord | null> {
    const result = await retryDatabase(
      async () => {
        const { data, error } = await this.supabase
          .from("channels")
          .select()
          .eq("id", id)
          .single();
        return { data, error };
      },
      { operationName: "findChannelById" }
    );

    if (result.error) {
      throw new AppError(
        "Failed to fetch channel",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: result.error }
      );
    }

    return result.data;
  }

  async upsertChannel(
    channel: Omit<ChannelRecord, "created_at">
  ): Promise<ChannelRecord> {
    const result = await retryDatabase(
      async () => {
        const { data, error } = await this.supabase
          .from("channels")
          .upsert(channel)
          .select()
          .single();
        return { data, error };
      },
      { operationName: "upsertChannel" }
    );

    if (result.error) {
      throw new AppError(
        "Failed to upsert channel",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: result.error }
      );
    }

    if (!result.data) {
      throw new AppError(
        "Failed to upsert channel - no data returned",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR
      );
    }

    return result.data;
  }

  // Video methods
  async findVideoById(id: string): Promise<VideoRecord | null> {
    const result = await retryDatabase(
      async () => {
        const { data, error } = await this.supabase
          .from("videos")
          .select("*, channels(*)")
          .eq("id", id)
          .single();
        return { data, error };
      },
      { operationName: "findVideoById" }
    );

    if (result.error) {
      throw new AppError(
        "Failed to fetch video",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: result.error }
      );
    }

    return result.data;
  }

  async createVideo(
    video: Omit<VideoRecord, "created_at">
  ): Promise<VideoRecord> {
    const result = await retryDatabase(
      async () => {
        const { data, error } = await this.supabase
          .from("videos")
          .insert(video)
          .select("*, channels(*)")
          .single();
        return { data, error };
      },
      { operationName: "createVideo" }
    );

    if (result.error) {
      throw new AppError(
        "Failed to create video",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: result.error }
      );
    }

    if (!result.data) {
      throw new AppError(
        "Failed to create video - no data returned",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR
      );
    }

    return result.data;
  }

  async updateVideo(
    id: string,
    video: Partial<VideoRecord>
  ): Promise<VideoRecord> {
    const result = await retryDatabase(
      async () => {
        const { data, error } = await this.supabase
          .from("videos")
          .update(video)
          .eq("id", id)
          .select("*, channels(*)")
          .single();
        return { data, error };
      },
      { operationName: "updateVideo" }
    );

    if (result.error) {
      throw new AppError(
        "Failed to update video",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: result.error }
      );
    }

    if (!result.data) {
      throw new AppError(
        "Failed to update video - no data returned",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR
      );
    }

    return result.data;
  }

  // User summary methods
  async getUserSummaries(userId: string): Promise<UserSummaryRecord[]> {
    const result = await retryDatabase(
      async () => {
        const { data, error } = await this.supabase
          .from("user_summaries")
          .select("*, videos(*, channels(*))")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        return { data, error };
      },
      { operationName: "getUserSummaries" }
    );

    if (result.error) {
      throw new AppError(
        "Failed to get user summaries",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: result.error }
      );
    }

    return result.data ?? [];
  }

  async createUserSummary(
    summary: Omit<UserSummaryRecord, "id" | "created_at" | "updated_at">
  ): Promise<UserSummaryRecord> {
    const result = await retryDatabase(
      async () => {
        const { data, error } = await this.supabase
          .from("user_summaries")
          .insert(summary)
          .select("*, videos(*, channels(*))")
          .single();
        return { data, error };
      },
      { operationName: "createUserSummary" }
    );

    if (result.error) {
      throw new AppError(
        "Failed to create user summary",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: result.error }
      );
    }

    if (!result.data) {
      throw new AppError(
        "Failed to create user summary - no data returned",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR
      );
    }

    return result.data;
  }

  async updateUserSummary(
    id: string,
    summary: Partial<UserSummaryRecord>
  ): Promise<UserSummaryRecord> {
    const result = await retryDatabase(
      async () => {
        const { data, error } = await this.supabase
          .from("user_summaries")
          .update(summary)
          .eq("id", id)
          .select("*, videos(*, channels(*))")
          .single();
        return { data, error };
      },
      { operationName: "updateUserSummary" }
    );

    if (result.error) {
      throw new AppError(
        "Failed to update user summary",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: result.error }
      );
    }

    if (!result.data) {
      throw new AppError(
        "Failed to update user summary - no data returned",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR
      );
    }

    return result.data;
  }

  // Tag methods
  async findOrCreateTag(name: string): Promise<TagRecord> {
    const result = await retryDatabase(
      async () => {
        const { data, error } = await this.supabase
          .from("tags")
          .upsert({ name })
          .select()
          .single();
        return { data, error };
      },
      { operationName: "findOrCreateTag" }
    );

    if (result.error) {
      throw new AppError(
        "Failed to find or create tag",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: result.error }
      );
    }

    if (!result.data) {
      throw new AppError(
        "Failed to find or create tag - no data returned",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR
      );
    }

    return result.data;
  }

  async addContentTag(contentTag: ContentTagRecord): Promise<void> {
    const result = await retryDatabase(
      async () => {
        const { error } = await this.supabase
          .from("content_tags")
          .upsert(contentTag);
        return { data: null, error };
      },
      { operationName: "addContentTag" }
    );

    if (result.error) {
      throw new AppError(
        "Failed to add content tag",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: result.error }
      );
    }
  }

  async getContentTags(contentId: string): Promise<TagRecord[]> {
    try {
      const result = await retryDatabase(
        async () => {
          const { data, error } = await this.supabase
            .from("content_tags")
            .select("tag_id:tags(*)")
            .eq("content_id", contentId);
          return { data, error };
        },
        { operationName: "getContentTags" }
      );

      if (!result) {
        return [];
      }

      // Type guard to ensure the response has the expected structure
      const isValidResponse = (
        items: unknown
      ): items is Array<{ tag_id: TagRecord }> => {
        if (!Array.isArray(items)) return false;
        return items.every(
          (item) =>
            item &&
            typeof item === "object" &&
            "tag_id" in item &&
            typeof item.tag_id === "object" &&
            item.tag_id !== null &&
            "id" in item.tag_id &&
            "name" in item.tag_id
        );
      };

      if (!isValidResponse(result)) {
        throw new AppError(
          "Invalid response format from database",
          ErrorCode.API_SERVICE_UNAVAILABLE,
          HttpStatus.INTERNAL_ERROR
        );
      }

      return result.map((item) => item.tag_id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to get content tags",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: error }
      );
    }
  }

  // Subscription methods
  async getSubscriptions(userId: string): Promise<SubscriptionRecord[]> {
    const result = await retryDatabase(
      async () => {
        const { data, error } = await this.supabase
          .from("subscriptions")
          .select("*, channels(*)")
          .eq("user_id", userId)
          .eq("subscription_type", "channel");
        return { data, error };
      },
      { operationName: "getSubscriptions" }
    );

    if (result.error) {
      throw new AppError(
        "Failed to get subscriptions",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: result.error }
      );
    }

    return result.data ?? [];
  }

  async addSubscription(
    subscription: Omit<SubscriptionRecord, "id" | "created_at">
  ): Promise<SubscriptionRecord> {
    const result = await retryDatabase(
      async () => {
        const { data, error } = await this.supabase
          .from("subscriptions")
          .upsert(subscription)
          .select("*, channels(*)")
          .single();
        return { data, error };
      },
      { operationName: "addSubscription" }
    );

    if (result.error) {
      throw new AppError(
        "Failed to add subscription",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: result.error }
      );
    }

    if (!result.data) {
      throw new AppError(
        "Failed to add subscription - no data returned",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR
      );
    }

    return result.data;
  }

  async removeSubscription(
    userId: string,
    subscriptionId: string
  ): Promise<void> {
    const result = await retryDatabase(
      async () => {
        const { error } = await this.supabase
          .from("subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("subscription_id", subscriptionId);
        return { data: null, error };
      },
      { operationName: "removeSubscription" }
    );

    if (result.error) {
      throw new AppError(
        "Failed to remove subscription",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: result.error }
      );
    }
  }
}
```

File: src/lib/services/DeepgramService.ts

```ts
import { Deepgram } from "@deepgram/sdk";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { StoredTranscript, TranscriptSegment } from "@/lib/types/storage";
import { getAudioStream, getVideoInfo } from "@/lib/utils/youtube";
import { retryApi } from "@/lib/utils/retry";
import {
  DeepgramClient,
  DeepgramTranscriptionOptions,
  DeepgramWord,
  DeepgramResponse,
} from "@/lib/types/deepgram";

// Initialize Deepgram client
const deepgramApiKey = process.env.DEEPGRAM_API_KEY!;
const deepgram = new Deepgram(deepgramApiKey) as unknown as DeepgramClient;

/**
 * Options for transcription
 */
export interface TranscriptionOptions {
  language?: string;
  model?: string;
  punctuate?: boolean;
  profanityFilter?: boolean;
  paragraphs?: boolean;
  numerals?: boolean;
}

/**
 * Service class for handling Deepgram transcription
 */
export class DeepgramService {
  /**
   * Generate transcript from YouTube video URL
   */
  async generateTranscript(
    url: string,
    options: DeepgramTranscriptionOptions = {}
  ): Promise<StoredTranscript> {
    try {
      // Get video info and audio stream
      const [videoInfo, audioStream] = await Promise.all([
        retryApi(() => getVideoInfo(url), { operationName: "getVideoInfo" }),
        retryApi(() => getAudioStream(url), {
          operationName: "getAudioStream",
        }),
      ]);

      // Configure Deepgram options
      const deepgramOptions: DeepgramTranscriptionOptions = {
        punctuate: options.punctuate ?? true,
        model: options.model ?? "general",
        language: options.language ?? "en",
        numerals: options.numerals ?? true,
        paragraphs: options.paragraphs ?? true,
        profanityFilter: options.profanityFilter ?? false,
        diarize: false,
        utterances: false,
      };

      // Get transcript from Deepgram with retry
      const response = await retryApi<DeepgramResponse>(
        () =>
          deepgram.transcription.preRecorded(
            {
              stream: audioStream,
              mimetype: "audio/webm",
            },
            deepgramOptions
          ),
        { operationName: "deepgramTranscription" }
      );

      // Format transcript segments
      const segments: TranscriptSegment[] =
        response.results.channels[0].alternatives[0].words.map(
          (word: DeepgramWord) => ({
            start: word.start,
            end: word.end,
            text: word.punctuated_word || word.word,
          })
        );

      // Create stored transcript
      const transcript: StoredTranscript = {
        video_id: url.split("v=")[1],
        language: options.language ?? "en",
        segments,
        metadata: {
          title: videoInfo.title,
          channel: videoInfo.channel,
          duration: videoInfo.duration,
          last_updated: new Date(),
        },
      };

      return transcript;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to generate transcript",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: error }
      );
    }
  }

  /**
   * Get supported languages from Deepgram
   */
  async getSupportedLanguages(): Promise<string[]> {
    try {
      // This is a placeholder - Deepgram's API for getting supported languages
      // might be different or not available
      return [
        "en", // English
        "es", // Spanish
        "fr", // French
        "de", // German
        "it", // Italian
        "pt", // Portuguese
        "nl", // Dutch
        "ja", // Japanese
        "ko", // Korean
        "zh", // Chinese
      ];
    } catch (error) {
      throw new AppError(
        "Failed to get supported languages",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: error }
      );
    }
  }

  /**
   * Check if a language is supported
   */
  async isLanguageSupported(language: string): Promise<boolean> {
    const supportedLanguages = await retryApi(
      () => this.getSupportedLanguages(),
      { operationName: "getSupportedLanguages" }
    );
    return supportedLanguages.includes(language.toLowerCase());
  }
}
```

File: src/lib/types/database.ts

```ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          created_at?: string;
        };
      };
      channels: {
        Row: {
          id: string;
          name: string;
          url: string;
          subscriber_count: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          url: string;
          subscriber_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          url?: string;
          subscriber_count?: number;
          created_at?: string;
        };
      };
      videos: {
        Row: {
          id: string;
          channel_id: string;
          unique_identifier: string;
          title: string;
          url: string;
          transcript_path: string;
          language: string;
          metadata: Json | null;
          published_at: string;
          last_updated: string;
          created_at: string;
        };
        Insert: {
          id: string;
          channel_id: string;
          unique_identifier: string;
          title: string;
          url: string;
          transcript_path: string;
          language?: string;
          metadata?: Json | null;
          published_at: string;
          last_updated?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          channel_id?: string;
          unique_identifier?: string;
          title?: string;
          url?: string;
          transcript_path?: string;
          language?: string;
          metadata?: Json | null;
          published_at?: string;
          last_updated?: string;
          created_at?: string;
        };
      };
      user_summaries: {
        Row: {
          id: string;
          user_id: string;
          video_id: string;
          summary: string;
          detailed_summary: string | null;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          video_id: string;
          summary: string;
          detailed_summary?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          video_id?: string;
          summary?: string;
          detailed_summary?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      tags: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
      };
      content_tags: {
        Row: {
          content_id: string;
          tag_id: string;
          content_type: "video" | "summary";
        };
        Insert: {
          content_id: string;
          tag_id: string;
          content_type: "video" | "summary";
        };
        Update: {
          content_id?: string;
          tag_id?: string;
          content_type?: "video" | "summary";
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          subscription_type: "channel";
          subscription_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_type: "channel";
          subscription_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subscription_type?: "channel";
          subscription_id?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      subscription_type: "channel";
    };
  };
}

export type Tables = Database["public"]["Tables"];
export type VideoRecord = Tables["videos"]["Row"];
export type UserSummaryRecord = Tables["user_summaries"]["Row"];
export type ChannelRecord = Tables["channels"]["Row"];
export type ProfileRecord = Tables["profiles"]["Row"];
export type TagRecord = Tables["tags"]["Row"];
export type ContentTagRecord = Tables["content_tags"]["Row"];
export type SubscriptionRecord = Tables["subscriptions"]["Row"];
```

File: src/lib/types/errors.ts

```ts
/**
 * Base error interface for all application errors
 */
export interface BaseError {
  message: string;
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

/**
 * Error codes for different types of errors
 */
export enum ErrorCode {
  // Authentication Errors
  AUTH_INVALID_CREDENTIALS = "auth/invalid-credentials",
  AUTH_USER_NOT_FOUND = "auth/user-not-found",
  AUTH_EMAIL_IN_USE = "auth/email-in-use",
  AUTH_INVALID_SESSION = "auth/invalid-session",
  AUTH_CALLBACK_ERROR = "auth/callback-error",
  AUTH_SESSION_ERROR = "auth/session-error",

  // Storage Errors
  STORAGE_FILE_NOT_FOUND = "storage/file-not-found",
  STORAGE_INVALID_FILE = "storage/invalid-file",
  STORAGE_QUOTA_EXCEEDED = "storage/quota-exceeded",
  STORAGE_UPLOAD_FAILED = "storage/upload-failed",
  STORAGE_DOWNLOAD_FAILED = "storage/download-failed",
  STORAGE_DELETE_FAILED = "storage/delete-failed",

  // API Errors
  API_RATE_LIMIT = "api/rate-limit",
  API_INVALID_REQUEST = "api/invalid-request",
  API_SERVICE_UNAVAILABLE = "api/service-unavailable",

  // Validation Errors
  VALIDATION_REQUIRED = "validation/required",
  VALIDATION_INVALID_FORMAT = "validation/invalid-format",

  // Unknown Error
  UNKNOWN = "error/unknown",
}

/**
 * HTTP status codes mapped to common scenarios
 */
export enum HttpStatus {
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  RATE_LIMIT = 429,
  INTERNAL_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

/**
 * Application error class that implements BaseError
 */
export class AppError extends Error implements BaseError {
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN,
    statusCode: number = HttpStatus.INTERNAL_ERROR,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  /**
   * Creates an error response object suitable for API responses
   */
  toResponse() {
    return {
      error: {
        message: this.message,
        code: this.code,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

/**
 * Creates a validation error
 */
export function createValidationError(
  message: string,
  details?: Record<string, unknown>
) {
  return new AppError(
    message,
    ErrorCode.VALIDATION_INVALID_FORMAT,
    HttpStatus.BAD_REQUEST,
    details
  );
}

/**
 * Creates an authentication error
 */
export function createAuthError(
  message: string,
  code: ErrorCode = ErrorCode.AUTH_INVALID_CREDENTIALS,
  details?: Record<string, unknown>
) {
  return new AppError(message, code, HttpStatus.UNAUTHORIZED, details);
}

/**
 * Creates an API error
 */
export function createApiError(
  message: string,
  code: ErrorCode = ErrorCode.API_SERVICE_UNAVAILABLE,
  statusCode: number = HttpStatus.SERVICE_UNAVAILABLE,
  details?: Record<string, unknown>
) {
  return new AppError(message, code, statusCode, details);
}

/**
 * Creates a storage error
 */
export function createStorageError(
  message: string,
  code: ErrorCode = ErrorCode.STORAGE_INVALID_FILE,
  details?: Record<string, unknown>
): AppError {
  const statusCode = mapStorageErrorToHttpStatus(code);
  return new AppError(message, code, statusCode, details);
}

/**
 * Maps storage error codes to HTTP status codes
 */
export function mapStorageErrorToHttpStatus(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.STORAGE_FILE_NOT_FOUND:
      return HttpStatus.NOT_FOUND;
    case ErrorCode.STORAGE_QUOTA_EXCEEDED:
      return HttpStatus.FORBIDDEN;
    case ErrorCode.STORAGE_INVALID_FILE:
      return HttpStatus.BAD_REQUEST;
    default:
      return HttpStatus.INTERNAL_ERROR;
  }
}
```

File: src/lib/types/deepgram.ts

```ts
/**
 * Types for Deepgram API responses
 */

export interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word: string;
  speaker?: number;
}

export interface DeepgramAlternative {
  transcript: string;
  confidence: number;
  words: DeepgramWord[];
}

export interface DeepgramChannel {
  alternatives: DeepgramAlternative[];
}

export interface DeepgramResults {
  channels: DeepgramChannel[];
  duration: number;
}

export interface DeepgramResponse {
  results: DeepgramResults;
  metadata: {
    transaction_key: string;
    request_id: string;
    sha256: string;
    created: string;
    duration: number;
    channels: number;
  };
}

/**
 * Types for Deepgram API requests
 */
export interface DeepgramTranscriptionOptions {
  punctuate?: boolean;
  model?: string;
  language?: string;
  numerals?: boolean;
  paragraphs?: boolean;
  profanityFilter?: boolean;
  redact?: string[];
  diarize?: boolean;
  multichannel?: boolean;
  alternatives?: number;
  utterances?: boolean;
  detectLanguage?: boolean;
  search?: string[];
  replace?: Array<{ search: string; replace: string }>;
}

export interface DeepgramSource {
  stream: NodeJS.ReadableStream;
  mimetype: string;
}

/**
 * Types for Deepgram API errors
 */
export interface DeepgramError {
  type: string;
  title: string;
  detail: string;
  status: number;
}

/**
 * Types for Deepgram language detection
 */
export interface DeepgramLanguage {
  code: string;
  score: number;
}

/**
 * Types for Deepgram client
 */
export interface DeepgramClient {
  transcription: {
    preRecorded: (
      source: DeepgramSource,
      options: DeepgramTranscriptionOptions
    ) => Promise<DeepgramResponse>;
  };
}
```

File: src/lib/supabase/storageUtils.ts

```ts
import { createClient } from "@supabase/supabase-js";
import { StoredTranscript } from "@/lib/types/storage";
import {
  AppError,
  ErrorCode,
  createStorageError,
  HttpStatus,
} from "@/lib/types/errors";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface UploadResult {
  path: string;
  url: string;
}

/**
 * Generate a storage path for a video transcript
 */
export const getTranscriptPath = (videoId: string): string =>
  `transcripts/${videoId}.json`;

/**
 * Store a transcript in Supabase Storage
 */
export const storeTranscript = async (
  videoId: string,
  transcript: StoredTranscript
): Promise<void> => {
  try {
    const path = getTranscriptPath(videoId);
    const { error } = await supabase.storage
      .from("transcripts")
      .upload(path, JSON.stringify(transcript), {
        upsert: true,
        contentType: "application/json",
      });

    if (error) {
      throw createStorageError(
        "Failed to store transcript",
        ErrorCode.STORAGE_UPLOAD_FAILED,
        { details: error }
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw createStorageError(
      "Unexpected error storing transcript",
      ErrorCode.STORAGE_UPLOAD_FAILED,
      { details: error }
    );
  }
};

/**
 * Retrieve a transcript from Supabase Storage
 */
export const getTranscript = async (
  videoId: string
): Promise<StoredTranscript | null> => {
  try {
    const path = getTranscriptPath(videoId);
    const { data, error } = await supabase.storage
      .from("transcripts")
      .download(path);

    if (error) {
      if (error.message.includes("404")) return null;
      throw createStorageError(
        "Failed to retrieve transcript",
        ErrorCode.STORAGE_DOWNLOAD_FAILED,
        { details: error }
      );
    }

    if (!data) return null;
    return JSON.parse(await data.text()) as StoredTranscript;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw createStorageError(
      "Unexpected error retrieving transcript",
      ErrorCode.STORAGE_DOWNLOAD_FAILED,
      { details: error }
    );
  }
};

/**
 * Delete a transcript from Supabase Storage
 */
export const deleteTranscript = async (videoId: string): Promise<void> => {
  try {
    const path = getTranscriptPath(videoId);
    const { error } = await supabase.storage.from("transcripts").remove([path]);

    if (error) {
      throw createStorageError(
        "Failed to delete transcript",
        ErrorCode.STORAGE_DELETE_FAILED,
        { details: error }
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw createStorageError(
      "Unexpected error deleting transcript",
      ErrorCode.STORAGE_DELETE_FAILED,
      { details: error }
    );
  }
};

/**
 * Check if a transcript exists in storage
 */
export const transcriptExists = async (videoId: string): Promise<boolean> => {
  try {
    const path = getTranscriptPath(videoId);
    const { data, error } = await supabase.storage
      .from("transcripts")
      .list(path.split("/")[0], {
        search: path.split("/")[1],
      });

    if (error) {
      throw createStorageError(
        "Failed to check transcript existence",
        ErrorCode.STORAGE_FILE_NOT_FOUND,
        { details: error }
      );
    }

    return data.some((file) => file.name === path.split("/")[1]);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw createStorageError(
      "Unexpected error checking transcript existence",
      ErrorCode.STORAGE_FILE_NOT_FOUND,
      { details: error }
    );
  }
};

/**
 * Uploads a file to Supabase Storage
 */
export async function uploadFile(
  file: File,
  bucket: string,
  path?: string
): Promise<UploadResult> {
  const filePath = path ? `${path}/${file.name}` : file.name;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    throw createStorageError(
      "Failed to upload file",
      ErrorCode.STORAGE_UPLOAD_FAILED,
      { details: error }
    );
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return {
    path: data.path,
    url: urlData.publicUrl,
  };
}

/**
 * Downloads a file from Supabase Storage
 */
export async function downloadFile(
  path: string,
  bucket: string
): Promise<Blob> {
  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error) {
    throw createStorageError(
      "Failed to download file",
      ErrorCode.STORAGE_DOWNLOAD_FAILED,
      { details: error }
    );
  }

  if (!data) {
    throw createStorageError(
      "No data received from storage",
      ErrorCode.STORAGE_FILE_NOT_FOUND
    );
  }

  return data;
}

/**
 * Deletes a file from Supabase Storage
 */
export async function deleteFile(path: string, bucket: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw createStorageError(
      "Failed to delete file",
      ErrorCode.STORAGE_DELETE_FAILED,
      { details: error }
    );
  }
}

/**
 * Lists files in a Supabase Storage bucket
 */
export async function listFiles(
  bucket: string,
  path?: string
): Promise<{ name: string; id: string; created_at: string }[]> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path || "");

    if (error) {
      throw createStorageError(
        "Failed to list files",
        ErrorCode.STORAGE_FILE_NOT_FOUND,
        { details: error }
      );
    }

    if (!data) {
      throw createStorageError(
        "No data received from storage",
        ErrorCode.STORAGE_FILE_NOT_FOUND
      );
    }

    return data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw createStorageError(
      "Unexpected error listing files",
      ErrorCode.STORAGE_FILE_NOT_FOUND,
      { details: error }
    );
  }
}
```

File: src/lib/services/VideoProcessingService.ts

```ts
import { createClient } from "@supabase/supabase-js";
import {
  Database,
  toDbResponseSingle,
  toDbResponseMany,
  ensureNonNull,
} from "@/lib/types/supabase";
import { Video, UserSummary, StoredTranscript } from "@/lib/types/storage";
import { logger } from "@/lib/utils/logger";
import { retryDatabase } from "@/lib/utils/retry";
import { DeepgramService } from "./DeepgramService";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import {
  getTranscript,
  storeTranscript,
  transcriptExists,
} from "@/lib/utils/storage";
import { extractVideoId } from "@/lib/utils/youtube";
import { VideoProcessingOptions } from "@/lib/types/storage";

/**
 * Service class for handling video processing and transcript management
 */
export class VideoProcessingService {
  private supabase;
  private logger;
  private deepgramService: DeepgramService;

  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    this.logger = logger.withContext({ service: "VideoProcessingService" });
    this.deepgramService = new DeepgramService();
  }

  /**
   * Find a video record by ID
   */
  async findVideoRecord(videoId: string) {
    this.logger.info("Finding video record", { videoId });

    const result = await retryDatabase(
      async () => {
        const { data, error } = await this.supabase
          .from("videos")
          .select()
          .eq("id", videoId)
          .single();
        return { data, error };
      },
      { operationName: "findVideoRecord" }
    );

    if (result.error) {
      const error = new AppError(
        "Failed to fetch video record",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: result.error }
      );
      this.logger.error("Failed to fetch video record", error);
      throw error;
    }

    if (!result.data) {
      this.logger.info("Video record not found");
      return null;
    }

    this.logger.info("Found video record");
    return result.data;
  }

  /**
   * Create a new video record
   */
  async createVideoRecord(
    videoId: string,
    url: string,
    transcript: StoredTranscript
  ) {
    this.logger.info("Creating video record", { videoId, url });

    const video = {
      url,
      transcript_path: `transcripts/${videoId}.json`,
      last_updated: new Date(),
      language: transcript.language,
    };

    const result = await retryDatabase(
      async () => {
        const { data, error } = await this.supabase
          .from("videos")
          .insert(video)
          .select()
          .single();
        return { data, error };
      },
      { operationName: "createVideoRecord" }
    );

    if (result.error) {
      const error = new AppError(
        "Failed to create video record",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: result.error }
      );
      this.logger.error("Failed to create video record", error);
      throw error;
    }

    if (!result.data) {
      const error = new AppError(
        "Failed to create video record - no data returned",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR
      );
      this.logger.error(
        "Failed to create video record - no data returned",
        error
      );
      throw error;
    }

    this.logger.info("Created video record", { videoId: result.data.id });
    return result.data;
  }

  /**
   * Update a video record
   */
  async updateVideoRecord(videoId: string, transcript: StoredTranscript) {
    this.logger.info("Updating video record", { videoId });

    const update = {
      last_updated: new Date(),
      language: transcript.language,
    };

    const result = await retryDatabase(
      async () => {
        const { data, error } = await this.supabase
          .from("videos")
          .update(update)
          .eq("id", videoId)
          .select()
          .single();
        return { data, error };
      },
      { operationName: "updateVideoRecord" }
    );

    if (result.error) {
      const error = new AppError(
        "Failed to update video record",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: result.error }
      );
      this.logger.error("Failed to update video record", error);
      throw error;
    }

    if (!result.data) {
      const error = new AppError(
        "Failed to update video record - no data returned",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR
      );
      this.logger.error(
        "Failed to update video record - no data returned",
        error
      );
      throw error;
    }

    this.logger.info("Updated video record", { videoId });
    return result.data;
  }

  /**
   * Get user summaries for a video
   */
  async getUserSummaries(videoId: string) {
    this.logger.info("Getting user summaries", { videoId });

    const result = await retryDatabase(
      async () => {
        const { data, error } = await this.supabase
          .from("user_summaries")
          .select()
          .eq("video_id", videoId);
        return { data, error };
      },
      { operationName: "getUserSummaries" }
    );

    if (result.error) {
      const error = new AppError(
        "Failed to get user summaries",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: result.error }
      );
      this.logger.error("Failed to get user summaries", error);
      throw error;
    }

    return result.data ?? [];
  }

  /**
   * Create a user summary
   */
  async createUserSummary(summary: Omit<UserSummary, "id">) {
    this.logger.info("Creating user summary", { videoId: summary.video_id });

    const result = await retryDatabase(
      async () => {
        const { data, error } = await this.supabase
          .from("user_summaries")
          .insert(summary)
          .select()
          .single();
        return { data, error };
      },
      { operationName: "createUserSummary" }
    );

    if (result.error) {
      const error = new AppError(
        "Failed to create user summary",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR,
        { details: result.error }
      );
      this.logger.error("Failed to create user summary", error);
      throw error;
    }

    if (!result.data) {
      const error = new AppError(
        "Failed to create user summary - no data returned",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR
      );
      this.logger.error(
        "Failed to create user summary - no data returned",
        error
      );
      throw error;
    }

    this.logger.info("Created user summary", {
      videoId: result.data.video_id,
      summaryId: result.data.id,
    });
    return result.data;
  }

  /**
   * Generate transcript for a video using Deepgram
   */
  private async generateTranscript(
    url: string,
    language?: string
  ): Promise<StoredTranscript> {
    try {
      // Check if language is supported
      if (language) {
        const isSupported = await this.deepgramService.isLanguageSupported(
          language
        );
        if (!isSupported) {
          const error = new AppError(
            `Language '${language}' is not supported`,
            ErrorCode.VALIDATION_INVALID_FORMAT,
            HttpStatus.BAD_REQUEST
          );
          this.logger.error("Unsupported language", error, { language });
          throw error;
        }
      }

      // Generate transcript
      this.logger.info(`Generating transcript for URL: ${url}`, { language });
      const transcript = await this.deepgramService.generateTranscript(url, {
        language,
        punctuate: true,
        numerals: true,
        paragraphs: true,
      });

      this.logger.info(`Generated transcript for URL: ${url}`, {
        language: transcript.language,
        segmentCount: transcript.segments.length,
      });

      return transcript;
    } catch (error) {
      this.logger.error("Error generating transcript", error as Error, {
        url,
        language,
      });
      throw error;
    }
  }

  /**
   * Generate summary for a transcript
   * This is a placeholder - actual implementation will depend on the summary generation service
   */
  private async generateSummary(transcript: StoredTranscript): Promise<string> {
    // TODO: Implement actual summary generation
    // This should use a service like OpenAI or Claude to generate the summary
    throw new Error("Summary generation not implemented");
  }

  /**
   * Get transcript from storage
   */
  private async getTranscript(
    transcriptPath: string
  ): Promise<StoredTranscript> {
    try {
      const { data, error } = await this.supabase.storage
        .from("transcripts")
        .download(transcriptPath);

      if (error) {
        throw new AppError(
          "Failed to download transcript",
          ErrorCode.STORAGE_FILE_NOT_FOUND,
          HttpStatus.NOT_FOUND,
          { details: error }
        );
      }

      const text = await data.text();
      return JSON.parse(text) as StoredTranscript;
    } catch (error) {
      this.logger.error(
        "Error getting transcript",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Process a video
   */
  async processVideo(
    url: string,
    userId: string,
    options: VideoProcessingOptions = {}
  ) {
    try {
      const videoId = extractVideoId(url);
      if (!videoId) {
        throw new AppError(
          "Invalid YouTube URL",
          ErrorCode.VALIDATION_INVALID_FORMAT,
          HttpStatus.BAD_REQUEST
        );
      }

      let video = await this.findVideoRecord(videoId);
      let transcript: StoredTranscript;

      if (!video || options.refresh) {
        this.logger.info(`Generating new transcript for video: ${videoId}`);
        transcript = await this.generateTranscript(url);
        video = video
          ? await this.updateVideoRecord(videoId, transcript)
          : await this.createVideoRecord(videoId, url, transcript);
      } else {
        this.logger.info(
          `Retrieving existing transcript for video: ${videoId}`
        );
        transcript = await this.getTranscript(video.transcript_path);
      }

      const existingSummaries = await this.getUserSummaries(videoId);
      const userSummary = existingSummaries.find((s) => s.user_id === userId);

      if (userSummary && !options.refresh) {
        this.logger.info(`Found existing summary for user: ${userId}`);
        return userSummary;
      }

      this.logger.info(`Generating new summary for user: ${userId}`);
      const summary = await this.generateSummary(transcript);

      const newSummary = await this.createUserSummary({
        video_id: videoId,
        user_id: userId,
        summary,
        created_at: new Date(),
        updated_at: new Date(),
        tags: [],
      });

      return newSummary;
    } catch (error) {
      this.logger.error(
        "Error processing video",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Refresh video processing
   */
  async refreshVideo(videoId: string, userId: string) {
    try {
      const video = await this.findVideoRecord(videoId);
      if (!video) {
        const error = new AppError(
          "Video not found",
          ErrorCode.STORAGE_FILE_NOT_FOUND,
          HttpStatus.NOT_FOUND
        );
        this.logger.error("Video not found", error);
        throw error;
      }
      return this.processVideo(video.url, userId, { refresh: true });
    } catch (error) {
      if (error instanceof AppError) {
        this.logger.error(error.message, error);
      } else {
        this.logger.error(
          "Unexpected error refreshing video",
          error instanceof Error ? error : new Error(String(error))
        );
      }
      throw error;
    }
  }
}
```

File: src/lib/types/loading.ts

```ts
/**
 * Loading state types for different operations
 */
export enum LoadingType {
  // Authentication
  AUTH_SIGN_IN = "auth/sign-in",
  AUTH_SIGN_OUT = "auth/sign-out",

  // Data Operations
  DATA_FETCH = "data/fetch",
  DATA_SUBMIT = "data/submit",
  DATA_DELETE = "data/delete",

  // File Operations
  FILE_UPLOAD = "file/upload",
  FILE_DOWNLOAD = "file/download",

  // API Operations
  API_REQUEST = "api/request",

  // AI Operations
  AI_PROCESSING = "ai/processing",
  AI_GENERATING = "ai/generating",

  // Generic
  INITIAL_LOAD = "generic/initial-load",
  PAGE_TRANSITION = "generic/page-transition",
}

/**
 * Loading state for a specific operation
 */
export interface LoadingState {
  type: LoadingType;
  message?: string;
  progress?: number;
  startTime: number;
}

/**
 * Loading context state
 */
export interface LoadingContextState {
  isLoading: boolean;
  activeOperations: Map<LoadingType, LoadingState>;
}

/**
 * Loading context actions
 */
export interface LoadingContextActions {
  startLoading: (type: LoadingType, message?: string) => void;
  updateLoading: (
    type: LoadingType,
    progress?: number,
    message?: string
  ) => void;
  stopLoading: (type: LoadingType) => void;
  isOperationLoading: (type: LoadingType) => boolean;
  getLoadingState: (type: LoadingType) => LoadingState | undefined;
}
```

File: src/lib/types/storage.ts

```ts
import { Database } from "@/lib/types/supabase";

/**
 * Interface representing a video record in the database
 */
export interface Video {
  id: string;
  url: string;
  transcript_path: string;
  last_updated: Date;
  language: string;
}

/**
 * Interface representing a user's summary of a video
 */
export interface UserSummary {
  id: string;
  user_id: string;
  video_id: string;
  summary: string;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

/**
 * Interface representing a segment in the transcript
 */
export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

/**
 * Interface representing metadata for a stored transcript
 */
export interface TranscriptMetadata {
  title: string;
  channel: string;
  duration: number;
  last_updated: Date;
}

/**
 * Interface representing a complete stored transcript
 */
export interface StoredTranscript {
  video_id: string;
  language: string;
  segments: TranscriptSegment[];
  metadata: TranscriptMetadata;
}

/**
 * Type for video processing options
 */
export interface VideoProcessingOptions {
  refresh?: boolean;
  language?: string;
  generateSummary?: boolean;
}

/**
 * Type for database tables using Supabase types
 */
export type Tables = Database["public"]["Tables"];
export type VideoRecord = Tables["videos"]["Row"];
export type UserSummaryRecord = Tables["user_summaries"]["Row"];
```

File: src/lib/types/supabase.ts

```ts
import {
  PostgrestError,
  PostgrestResponse,
  SupabaseClient,
} from "@supabase/supabase-js";
import { Video, UserSummary } from "./storage";

/**
 * Generic database response type
 */
export interface DatabaseResponse<T> {
  data: T | null;
  error: PostgrestError | null;
}

/**
 * Database tables
 */
export interface Database {
  public: {
    Tables: {
      videos: {
        Row: Video;
        Insert: Omit<Video, "id"> & { id?: string };
        Update: Partial<Omit<Video, "id">>;
      };
      user_summaries: {
        Row: UserSummary;
        Insert: Omit<UserSummary, "id"> & { id?: string };
        Update: Partial<Omit<UserSummary, "id">>;
      };
    };
  };
}

/**
 * Type helper for database operations
 */
export type DbResult<T> = Promise<DatabaseResponse<T>>;

/**
 * Type for single row operations
 */
export type DbResultSingle<T> = DbResult<T>;

/**
 * Type for multiple row operations
 */
export type DbResultMany<T> = DbResult<T[]>;

/**
 * Type for table operations
 */
export type TableOperations<T extends keyof Database["public"]["Tables"]> = {
  select: () => DbResultMany<Database["public"]["Tables"][T]["Row"]>;
  insert: (
    value: Database["public"]["Tables"][T]["Insert"]
  ) => DbResultSingle<Database["public"]["Tables"][T]["Row"]>;
  update: (
    value: Database["public"]["Tables"][T]["Update"]
  ) => DbResultSingle<Database["public"]["Tables"][T]["Row"]>;
  upsert: (
    value: Database["public"]["Tables"][T]["Insert"]
  ) => DbResultSingle<Database["public"]["Tables"][T]["Row"]>;
  delete: () => DbResultSingle<Database["public"]["Tables"][T]["Row"]>;
};

/**
 * Type guard for non-null response
 */
export function isNonNullResponse<T>(
  response: DatabaseResponse<T>
): response is DatabaseResponse<NonNullable<T>> {
  return response.data !== null;
}

/**
 * Helper function to convert Supabase query to DatabaseResponse for single row
 */
export async function toDbResponseSingle<T>(
  promise: Promise<PostgrestResponse<T>>
): Promise<DatabaseResponse<T>> {
  const response = await promise;
  return {
    data: response.data?.[0] ?? null,
    error: response.error,
  };
}

/**
 * Helper function to convert Supabase query to DatabaseResponse for multiple rows
 */
export async function toDbResponseMany<T>(
  promise: Promise<PostgrestResponse<T>>
): Promise<DatabaseResponse<T[]>> {
  const response = await promise;
  return {
    data: response.data ?? null,
    error: response.error,
  };
}

/**
 * Helper function to ensure non-null response
 */
export function ensureNonNull<T>(
  response: DatabaseResponse<T>,
  errorMessage: string = "Expected non-null response"
): T {
  if (!response.data) {
    throw new Error(errorMessage);
  }
  return response.data;
}
```

File: src/lib/types/toast.ts

```ts
/**
 * Toast variant types
 */
export enum ToastVariant {
  SUCCESS = "success",
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
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
  BOTTOM_LEFT = "bottom-left",
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
```

File: src/lib/utils/errors.ts

```ts
export class AppError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }
}

export enum ErrorCode {
  // Authentication Errors
  AUTH_MISSING_CODE = "auth/missing-code",
  AUTH_INVALID_CODE = "auth/invalid-code",
  AUTH_SESSION_ERROR = "auth/session-error",

  // API Errors
  API_ERROR = "api/error",
  API_INVALID_REQUEST = "api/invalid-request",

  // Storage Errors
  STORAGE_ERROR = "storage/error",

  // Database Errors
  DB_ERROR = "db/error",
}
```

File: src/lib/utils/logger.ts

```ts
import { AppError } from "@/lib/types/errors";

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

/**
 * Log entry structure
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error | AppError;
  stack?: string;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  minLevel?: LogLevel;
  enableConsole?: boolean;
  enableMetrics?: boolean;
}

/**
 * Default logger configuration
 */
const defaultConfig: Required<LoggerConfig> = {
  minLevel: LogLevel.INFO,
  enableConsole: true,
  enableMetrics: false,
};

/**
 * Format error for logging
 */
function formatError(error: Error | AppError): Record<string, unknown> {
  const errorInfo: Record<string, unknown> = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };

  if (error instanceof AppError) {
    errorInfo.code = error.code;
    errorInfo.statusCode = error.statusCode;
    errorInfo.details = error.details;
  }

  return errorInfo;
}

/**
 * Logger class for consistent logging across the application
 */
export class Logger {
  private config: Required<LoggerConfig>;
  private context: Record<string, unknown>;

  constructor(
    config: LoggerConfig = {},
    context: Record<string, unknown> = {}
  ) {
    this.config = { ...defaultConfig, ...config };
    this.context = context;
  }

  /**
   * Create a new logger with additional context
   */
  withContext(context: Record<string, unknown>): Logger {
    return new Logger(this.config, { ...this.context, ...context });
  }

  /**
   * Log a message
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error | AppError
  ): void {
    if (this.shouldLog(level)) {
      const entry: LogEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        context: { ...this.context, ...context },
      };

      if (error) {
        entry.error = error;
        entry.stack = error.stack;
        entry.context = { ...entry.context, error: formatError(error) };
      }

      this.writeLog(entry);
    }
  }

  /**
   * Check if a message should be logged based on level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    return levels.indexOf(level) >= levels.indexOf(this.config.minLevel);
  }

  /**
   * Write log entry
   */
  private writeLog(entry: LogEntry): void {
    if (this.config.enableConsole) {
      const { level, message, context } = entry;

      switch (level) {
        case LogLevel.ERROR:
          console.error(message, context);
          if (entry.error?.stack) console.error(entry.error.stack);
          break;
        case LogLevel.WARN:
          console.warn(message, context);
          break;
        case LogLevel.INFO:
          console.info(message, context);
          break;
        case LogLevel.DEBUG:
          console.debug(message, context);
          break;
      }
    }

    // TODO: Add additional log destinations (e.g., file, monitoring service)
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): void {
    this.log(LogLevel.WARN, message, context, error);
  }

  /**
   * Log error message
   */
  error(
    message: string,
    error: Error | AppError,
    context?: Record<string, unknown>
  ): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log retry attempt
   */
  logRetry(
    operation: string,
    attempt: number,
    maxAttempts: number,
    error: Error,
    delay: number
  ): void {
    this.warn(
      `Retry attempt ${attempt}/${maxAttempts} for operation: ${operation}`,
      {
        operation,
        attempt,
        maxAttempts,
        delay,
        error: formatError(error),
      },
      error
    );
  }
}

// Create and export default logger instance
export const logger = new Logger();
```

File: src/lib/utils/retry.ts

```ts
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { logger } from "./logger";
import { DatabaseResponse } from "@/lib/types/supabase";

/**
 * Options for retry mechanism
 */
export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: string[];
  operationName?: string;
}

/**
 * Default retry options
 */
const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  retryableErrors: [
    "ECONNRESET",
    "ETIMEDOUT",
    "ECONNREFUSED",
    "NETWORK_ERROR",
    "RATE_LIMIT",
  ],
  operationName: "unknown",
};

/**
 * Sleep for a given number of milliseconds
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Check if an error is retryable
 */
const isRetryableError = (error: any, retryableErrors: string[]): boolean => {
  if (!error) return false;

  // Check error code
  if (error.code && retryableErrors.includes(error.code)) return true;

  // Check error type
  if (error.type && retryableErrors.includes(error.type)) return true;

  // Check HTTP status codes
  if (error.status) {
    const status = error.status;
    return (
      status === 408 || // Request Timeout
      status === 429 || // Too Many Requests
      status === 500 || // Internal Server Error
      status === 502 || // Bad Gateway
      status === 503 || // Service Unavailable
      status === 504 // Gateway Timeout
    );
  }

  return false;
};

/**
 * Calculate delay for next retry attempt
 */
const calculateDelay = (
  attempt: number,
  { initialDelay, maxDelay, backoffFactor }: Required<RetryOptions>
): number => {
  const delay = initialDelay * Math.pow(backoffFactor, attempt - 1);
  return Math.min(delay, maxDelay);
};

/**
 * Retry a database operation
 */
export async function retryDatabase<T>(
  fn: () => Promise<DatabaseResponse<T>>,
  options: RetryOptions = {}
): Promise<DatabaseResponse<T>> {
  const retryOptions: Required<RetryOptions> = {
    ...defaultOptions,
    ...options,
  };

  let lastError: any;
  for (let attempt = 1; attempt <= retryOptions.maxAttempts; attempt++) {
    try {
      const result = await fn();

      if (result.error) {
        if (!isRetryableError(result.error, retryOptions.retryableErrors)) {
          logger.error(
            `Non-retryable database error in operation: ${retryOptions.operationName}`,
            result.error,
            { attempt, maxAttempts: retryOptions.maxAttempts }
          );
          return result;
        }

        if (attempt === retryOptions.maxAttempts) {
          logger.error(
            `Database operation failed after ${attempt} attempts: ${retryOptions.operationName}`,
            result.error,
            { attempt, maxAttempts: retryOptions.maxAttempts }
          );
          return result;
        }

        const delay = calculateDelay(attempt, retryOptions);
        logger.logRetry(
          retryOptions.operationName,
          attempt,
          retryOptions.maxAttempts,
          result.error,
          delay
        );

        await sleep(delay);
        continue;
      }

      return result;
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error, retryOptions.retryableErrors)) {
        logger.error(
          `Non-retryable error in operation: ${retryOptions.operationName}`,
          error as Error,
          { attempt, maxAttempts: retryOptions.maxAttempts }
        );
        throw error;
      }

      if (attempt === retryOptions.maxAttempts) {
        logger.error(
          `Operation failed after ${attempt} attempts: ${retryOptions.operationName}`,
          error as Error,
          { attempt, maxAttempts: retryOptions.maxAttempts }
        );
        break;
      }

      const delay = calculateDelay(attempt, retryOptions);
      logger.logRetry(
        retryOptions.operationName,
        attempt,
        retryOptions.maxAttempts,
        error as Error,
        delay
      );

      await sleep(delay);
    }
  }

  throw new AppError(
    `Operation '${retryOptions.operationName}' failed after ${retryOptions.maxAttempts} attempts`,
    ErrorCode.API_SERVICE_UNAVAILABLE,
    HttpStatus.SERVICE_UNAVAILABLE,
    { details: lastError }
  );
}

/**
 * Retry an API operation
 */
export async function retryApi<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const retryOptions: Required<RetryOptions> = {
    ...defaultOptions,
    ...options,
  };

  let lastError: any;
  for (let attempt = 1; attempt <= retryOptions.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error, retryOptions.retryableErrors)) {
        logger.error(
          `Non-retryable API error in operation: ${retryOptions.operationName}`,
          error as Error,
          { attempt, maxAttempts: retryOptions.maxAttempts }
        );
        throw error;
      }

      if (attempt === retryOptions.maxAttempts) {
        logger.error(
          `API operation failed after ${attempt} attempts: ${retryOptions.operationName}`,
          error as Error,
          { attempt, maxAttempts: retryOptions.maxAttempts }
        );
        break;
      }

      const delay = calculateDelay(attempt, retryOptions);
      logger.logRetry(
        retryOptions.operationName,
        attempt,
        retryOptions.maxAttempts,
        error as Error,
        delay
      );

      await sleep(delay);
    }
  }

  throw new AppError(
    `API operation '${retryOptions.operationName}' failed after ${retryOptions.maxAttempts} attempts`,
    ErrorCode.API_SERVICE_UNAVAILABLE,
    HttpStatus.SERVICE_UNAVAILABLE,
    { details: lastError }
  );
}

// Maintain backward compatibility
export const retry = retryDatabase;
```

File: src/lib/utils/storage.ts

```ts
import { createClient } from "@supabase/supabase-js";
import { StoredTranscript } from "@/lib/types/storage";
import {
  AppError,
  ErrorCode,
  createStorageError,
  mapStorageErrorToHttpStatus,
} from "@/lib/types/errors";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Generate a storage path for a video transcript
 */
export const getTranscriptPath = (videoId: string): string =>
  `transcripts/${videoId}.json`;

/**
 * Store a transcript in Supabase Storage
 */
export const storeTranscript = async (
  videoId: string,
  transcript: StoredTranscript
): Promise<void> => {
  try {
    const path = getTranscriptPath(videoId);
    const { error } = await supabase.storage
      .from("transcripts")
      .upload(path, JSON.stringify(transcript), {
        upsert: true,
        contentType: "application/json",
      });

    if (error) {
      throw createStorageError(
        "Failed to store transcript",
        ErrorCode.STORAGE_UPLOAD_FAILED,
        { details: error }
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw createStorageError(
      "Unexpected error storing transcript",
      ErrorCode.STORAGE_UPLOAD_FAILED,
      { details: error }
    );
  }
};

/**
 * Retrieve a transcript from Supabase Storage
 */
export const getTranscript = async (
  videoId: string
): Promise<StoredTranscript | null> => {
  try {
    const path = getTranscriptPath(videoId);
    const { data, error } = await supabase.storage
      .from("transcripts")
      .download(path);

    if (error) {
      if (error.message.includes("404")) return null;
      throw createStorageError(
        "Failed to retrieve transcript",
        ErrorCode.STORAGE_DOWNLOAD_FAILED,
        { details: error }
      );
    }

    if (!data) return null;
    return JSON.parse(await data.text()) as StoredTranscript;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw createStorageError(
      "Unexpected error retrieving transcript",
      ErrorCode.STORAGE_DOWNLOAD_FAILED,
      { details: error }
    );
  }
};

/**
 * Delete a transcript from Supabase Storage
 */
export const deleteTranscript = async (videoId: string): Promise<void> => {
  try {
    const path = getTranscriptPath(videoId);
    const { error } = await supabase.storage.from("transcripts").remove([path]);

    if (error) {
      throw createStorageError(
        "Failed to delete transcript",
        ErrorCode.STORAGE_DELETE_FAILED,
        { details: error }
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw createStorageError(
      "Unexpected error deleting transcript",
      ErrorCode.STORAGE_DELETE_FAILED,
      { details: error }
    );
  }
};

/**
 * Check if a transcript exists in storage
 */
export const transcriptExists = async (videoId: string): Promise<boolean> => {
  try {
    const path = getTranscriptPath(videoId);
    const { data, error } = await supabase.storage
      .from("transcripts")
      .list(path.split("/")[0], {
        search: path.split("/")[1],
      });

    if (error) {
      throw createStorageError(
        "Failed to check transcript existence",
        ErrorCode.STORAGE_FILE_NOT_FOUND,
        { details: error }
      );
    }

    return data.some((file) => file.name === path.split("/")[1]);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw createStorageError(
      "Unexpected error checking transcript existence",
      ErrorCode.STORAGE_FILE_NOT_FOUND,
      { details: error }
    );
  }
};
```

File: src/lib/utils/youtube.ts

```ts
import ytdl from "ytdl-core";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";

/**
 * Interface for video information
 */
export interface VideoInfo {
  title: string;
  channel: string;
  duration: number;
  formats: ytdl.videoFormat[];
}

/**
 * Get video information from YouTube
 */
export async function getVideoInfo(url: string): Promise<VideoInfo> {
  try {
    const info = await ytdl.getInfo(url);
    return {
      title: info.videoDetails.title,
      channel: info.videoDetails.author.name,
      duration: parseInt(info.videoDetails.lengthSeconds),
      formats: info.formats,
    };
  } catch (error) {
    throw new AppError(
      "Failed to get video information",
      ErrorCode.API_SERVICE_UNAVAILABLE,
      HttpStatus.INTERNAL_ERROR,
      { details: error }
    );
  }
}

/**
 * Get audio stream from YouTube video
 */
export function getAudioStream(url: string): Promise<NodeJS.ReadableStream> {
  try {
    return Promise.resolve(
      ytdl(url, {
        filter: "audioonly",
        quality: "highestaudio",
      })
    );
  } catch (error) {
    throw new AppError(
      "Failed to get audio stream",
      ErrorCode.API_SERVICE_UNAVAILABLE,
      HttpStatus.INTERNAL_ERROR,
      { details: error }
    );
  }
}

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string {
  const regex =
    /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);

  if (!match) {
    throw new AppError(
      "Invalid YouTube URL",
      ErrorCode.VALIDATION_INVALID_FORMAT,
      HttpStatus.BAD_REQUEST
    );
  }

  return match[1];
}

/**
 * Validate YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  try {
    extractVideoId(url);
    return true;
  } catch {
    return false;
  }
}
```

File: src/middleware.ts

```ts
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Bypass auth routes and static assets
  if (
    request.nextUrl.pathname.startsWith("/auth") ||
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  try {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req: request, res });
    await supabase.auth.getSession();
    return res;
  } catch (error) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!auth|login|_next|static|.*\\..*$).*)"],
};
```

File: src/components/ui/Loading.tsx

```tsx
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
```

</file_contents>

<meta prompt 1 = "[Architect]">
You are a senior software architect specializing in code design and implementation planning. 
You may include short code snippets to illustrate specific patterns, signatures, or structures, but do not implement the full solution.

Focus solely on the technical implementation plan - exclude testing, validation, and deployment considerations unless they directly impact the architecture.

Please proceed with your analysis based on the following <user instrctions>

</meta prompt 1>
<user_instructions>
Evaluate the entire code, and Identify the redundant files, redundant code, bad quality code issues, issues in file structure
</user_instructions>
