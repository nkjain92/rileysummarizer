import OpenAI from "openai";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { retryApi } from "@/lib/utils/retry";
import { extractVideoInfo } from "@/lib/utils/youtube";
import { fetchTranscript } from "@/lib/utils/youtube";
import { OpenAIStream } from "ai";

interface VideoSummary {
  videoId: string;
  channelId: string | null;
  summary: string;
  detailed_summary: string;
  tags: string[];
  transcript: string;
}

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
   * Process a YouTube video URL to generate summary and tags
   * @param url - The YouTube video URL
   * @returns A VideoSummary object containing the summary, tags, and transcript
   */
  async processYouTubeVideo(url: string): Promise<VideoSummary> {
    const videoInfo = extractVideoInfo(url);
    if (!videoInfo.videoId) {
      throw new AppError(
        "Invalid YouTube URL",
        ErrorCode.VIDEO_INVALID_URL,
        HttpStatus.BAD_REQUEST
      );
    }

    // Get transcript
    const transcript = await fetchTranscript(videoInfo.videoId);
    const chunks = this.splitTranscript(transcript);

    // Generate initial summary only (defer detailed summary)
    let finalSummary: string;
    if (chunks.length > 1) {
      // Process chunks in parallel
      const chunkSummaries = await Promise.all(
        chunks.map(chunk => this.generateChunkSummary(chunk))
      );
      const combinedSummary = chunkSummaries.join("\n\n");
      finalSummary = await this.generateFinalSummary(combinedSummary);
    } else {
      finalSummary = await this.generateChunkSummary(chunks[0]);
    }

    // Generate tags in parallel with the summary
    const tags = await this.generateTags(finalSummary);

    return {
      videoId: videoInfo.videoId,
      channelId: videoInfo.channelId,
      summary: finalSummary,
      detailed_summary: "", // Will be generated on demand
      tags,
      transcript
    };
  }

  private splitTranscript(transcript: string): string[] {
    const MAX_CHUNK_LENGTH = 3000;
    const chunks: string[] = [];
    let currentChunk = "";

    const sentences = transcript.split(/(?<=[.!?])\s+/);
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > MAX_CHUNK_LENGTH) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += " " + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private async generateChunkSummary(chunk: string): Promise<string> {
    const response = await retryApi(() => 
      this.client.chat.completions.create({
        model: "gpt-3.5-turbo-0125",
        messages: [
          {
            role: "system",
            content: "Summarize transcripts concisely, focusing on key points."
          },
          {
            role: "user",
            content: `Summarize this transcript chunk:\n\n${chunk}`
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      })
    );

    return response.choices[0].message.content || "";
  }

  private async generateFinalSummary(combinedSummaries: string): Promise<string> {
    const response = await retryApi(() =>
      this.client.chat.completions.create({
        model: "gpt-3.5-turbo-0125",
        messages: [
          {
            role: "system",
            content: "Create concise summaries that capture main points."
          },
          {
            role: "user",
            content: `Create a final summary:\n\n${combinedSummaries}`
          }
        ],
        temperature: 0.3,
        max_tokens: 400
      })
    );

    return response.choices[0].message.content || "";
  }

  private async generateTags(summary: string): Promise<string[]> {
    try {
      const response = await retryApi(() =>
        this.client.chat.completions.create({
          model: "gpt-3.5-turbo-0125",
          messages: [
            {
              role: "system",
              content: "Generate 10 tags, 1-3 words each, under 25 chars."
            },
            {
              role: "user",
              content: `Tags for:\n\n${summary}`
            }
          ],
          temperature: 0.3,
          max_tokens: 100
        })
      );

      const content = response.choices[0].message.content || "";
      const tags = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(tag => tag.replace(/[^a-zA-Z0-9]/g, '').trim())
        .filter(tag => tag.length > 1 && tag.length <= 25)
        .slice(0, 10);

      return tags.length === 10 ? tags : [
        ...tags,
        ...['Tech', 'Innovation', 'Learning', 'Development', 'Business', 
            'Strategy', 'Growth', 'Success', 'Future', 'Tips'].slice(0, 10 - tags.length)
      ];
    } catch (error) {
      console.error("Error generating tags:", error);
      return ['Tech', 'Innovation', 'Learning', 'Development', 'Business', 
              'Strategy', 'Growth', 'Success', 'Future', 'Tips'];
    }
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
      model: "gpt-3.5-turbo-0125",
      temperature: 0.3,
      max_tokens: 1000,
      messages,
      stream: false,
    };

    const params = { ...defaultOptions, ...options };

    try {
      return await retryApi(() =>
        this.client.chat.completions.create(params)
      );
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