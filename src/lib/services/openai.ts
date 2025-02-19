import OpenAI from "openai";
import { AppError, ErrorCode, HttpStatus } from "@/lib/types/errors";
import { retryApi } from "@/lib/utils/retry";
import { extractVideoInfo } from "@/lib/utils/youtube";
import { fetchTranscript } from "@/lib/utils/youtube";
import { OpenAIStream } from "ai";

interface VideoInfo {
  videoId: string;
  channelId: string | null;
  title: string;
}

interface VideoSummary {
  videoId: string;
  channelId: string | null;
  title: string;
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
    const videoInfo = await extractVideoInfo(url);
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

    // Get video metadata from YouTube oEmbed
    const oembedResponse = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    );
    if (!oembedResponse.ok) {
      throw new AppError(
        "Failed to fetch video metadata",
        ErrorCode.API_SERVICE_UNAVAILABLE,
        HttpStatus.INTERNAL_ERROR
      );
    }
    const videoData = await oembedResponse.json();

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
      channelId: null,
      title: videoData.title || 'Unknown Title',
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
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert in synthesizing information. Create clear, informative summaries that capture the main ideas, key points, and important details. Focus on accuracy and clarity while maintaining context. Use natural language and avoid redundancy. Do not include terms like 'The summarized content is:' or 'The summary is:', etc. It has to be the best summary someone can get from the content. Depending on the nature of the content, provide the key highlights in bullet points."
          },
          {
            role: "user",
            content: `Create a clear and informative summary of this content, highlighting the main ideas and key points:\n\n${chunk}`
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
            content: "You are an expert content synthesizer. Create cohesive, engaging summaries that weave together key points into a clear narrative. Focus on the most important insights while maintaining logical flow and readability. Use clear topic transitions and ensure the summary is both informative and accessible."
          },
          {
            role: "user",
            content: `Create a cohesive final summary that synthesizes these key points into a clear narrative:\n\n${combinedSummaries}`
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
              content: "Generate relevant, concise tags for content categorization. Each tag should be 1-3 words, under 25 characters, and represent key themes or topics. Do not include numbers, hashtags, or special characters."
            },
            {
              role: "user",
              content: `Generate 10 relevant tags for this content:\n\n${summary}`
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
        .map(tag => tag.replace(/^[0-9.)\-]+|[^a-zA-Z0-9\s]/g, '').trim()) // Remove numbers and special chars
        .filter(tag => tag.length > 1 && tag.length <= 25)
        .slice(0, 10);

      return tags.length === 10 ? tags : [
        ...tags,
        ...['Technology', 'Innovation', 'Education', 'Development', 'Business',
            'Strategy', 'Growth', 'Success', 'Future', 'Insights'].slice(0, 10 - tags.length)
      ];
    } catch (error) {
      console.error("Error generating tags:", error);
      return ['Technology', 'Innovation', 'Education', 'Development', 'Business',
              'Strategy', 'Growth', 'Success', 'Future', 'Insights'];
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