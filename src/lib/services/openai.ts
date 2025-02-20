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
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
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

    // Generate summary directly
    const summary = await this.generateSummary(transcript);

    // Generate tags in parallel with the summary
    const tags = await this.generateTags(summary);

    return {
      videoId: videoInfo.videoId,
      channelId: videoInfo.channelId,
      summary,
      detailed_summary: "", // Will be generated on demand
      tags,
      transcript
    };
  }

  /**
   * Generate a summary of the transcript
   */
  private async generateSummary(transcript: string): Promise<string> {
    const response = await retryApi(() =>
      this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a highly skilled summarizer. Create a concise summary of the video transcript provided. Focus on the main points and key takeaways."
          },
          {
            role: "user",
            content: transcript
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    );

    return response.choices[0].message.content || "";
  }

  /**
   * Generate tags for the video based on the summary
   */
  private async generateTags(summary: string): Promise<string[]> {
    const response = await retryApi(() =>
      this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Generate 5-7 relevant tags for this video based on its summary. Return only the tags as a comma-separated list."
          },
          {
            role: "user",
            content: summary
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    );

    const tags = response.choices[0].message.content?.split(",") || [];
    return tags.map(tag => tag.trim()).filter(tag => tag.length > 0);
  }

  /**
   * Generate a detailed summary on demand
   */
  async generateDetailedSummary(transcript: string): Promise<string> {
    const response = await retryApi(() =>
      this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Create a detailed summary of the video transcript. Include important details, key points, and maintain the logical flow of information."
          },
          {
            role: "user",
            content: transcript
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    );

    return response.choices[0].message.content || "";
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
      model: "gpt-4o-mini",
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