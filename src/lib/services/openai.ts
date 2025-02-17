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

    const transcript = await fetchTranscript(videoInfo.videoId);
    const chunks = this.splitTranscript(transcript);

    // Generate summary for each chunk
    const chunkSummaries = await Promise.all(
      chunks.map(chunk => this.generateChunkSummary(chunk))
    );

    // Combine chunk summaries and generate final summary
    const combinedSummary = chunkSummaries.join("\n\n");
    const finalSummary = chunks.length > 1 
      ? await this.generateFinalSummary(combinedSummary)
      : chunkSummaries[0];

    // Generate detailed summary
    const detailedSummary = await this.generateDetailedSummary(transcript);

    // Generate tags from the final summary
    const tags = await this.generateTags(finalSummary);

    return {
      videoId: videoInfo.videoId,
      channelId: videoInfo.channelId,
      summary: finalSummary,
      detailed_summary: detailedSummary,
      tags,
      transcript
    };
  }

  private splitTranscript(transcript: string): string[] {
    const MAX_CHUNK_LENGTH = 4000;
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
    const response = await this.client.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that creates concise summaries of video transcripts. Focus on the key points and main ideas."
        },
        {
          role: "user",
          content: `Please summarize this transcript chunk in a clear and concise way:\n\n${chunk}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content || "";
  }

  private async generateFinalSummary(combinedSummaries: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that creates final summaries from multiple chunk summaries. Create a coherent, flowing summary that captures the main points."
        },
        {
          role: "user",
          content: `Please create a final summary from these chunk summaries:\n\n${combinedSummaries}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content || "";
  }

  private async generateDetailedSummary(transcript: string): Promise<string> {
    try {
      const chunks = this.splitTranscript(transcript);
      const detailedChunkSummaries = await Promise.all(
        chunks.map(async (chunk, index) => {
          try {
            const response = await this.client.chat.completions.create({
              model: "gpt-4",
              messages: [
                {
                  role: "system",
                  content: "You are a helpful assistant that creates detailed summaries of video transcripts. Include important details, examples, and explanations while maintaining clarity. Structure your response with clear sections and bullet points where appropriate."
                },
                {
                  role: "user",
                  content: `Please create a detailed summary of this transcript chunk (${index + 1}/${chunks.length}), including key points, examples, and explanations:\n\n${chunk}`
                }
              ],
              temperature: 0.7,
              max_tokens: 1000
            });
            return response.choices[0].message.content || "";
          } catch (error) {
            console.error(`Error generating detailed summary for chunk ${index + 1}:`, error);
            throw new AppError(
              "Failed to generate detailed summary for a segment",
              ErrorCode.AI_GENERATION_FAILED,
              HttpStatus.INTERNAL_ERROR
            );
          }
        })
      );

      // If there are multiple chunks, combine them into a coherent detailed summary
      if (chunks.length > 1) {
        try {
          const response = await this.client.chat.completions.create({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content: "You are a helpful assistant that combines detailed summaries into a coherent, comprehensive summary. Structure the combined summary with clear sections, maintaining a logical flow while preserving important details."
              },
              {
                role: "user",
                content: `Please combine these ${chunks.length} detailed summaries into a single, coherent detailed summary with clear sections:\n\n${detailedChunkSummaries.join("\n\n")}`
              }
            ],
            temperature: 0.7,
            max_tokens: 2000
          });
          return response.choices[0].message.content || "";
        } catch (error) {
          console.error("Error combining detailed summaries:", error);
          throw new AppError(
            "Failed to combine detailed summaries",
            ErrorCode.AI_GENERATION_FAILED,
            HttpStatus.INTERNAL_ERROR
          );
        }
      }

      return detailedChunkSummaries[0];
    } catch (error) {
      console.error("Error in generateDetailedSummary:", error);
      throw error instanceof AppError ? error : new AppError(
        "Failed to generate detailed summary",
        ErrorCode.AI_GENERATION_FAILED,
        HttpStatus.INTERNAL_ERROR
      );
    }
  }

  private async generateTags(summary: string): Promise<string[]> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates relevant tags from a video summary. Generate exactly 10 relevant tags that capture the main topics and themes. Each tag should be 1-3 words maximum, joined together if multiple words (e.g., 'ArtificialIntelligence'). Keep tags concise and under 25 characters. Do not include any hashtag symbols."
          },
          {
            role: "user",
            content: `Please generate 10 tags for this video summary. Keep each tag under 25 characters and use 1-3 words maximum:\n\n${summary}`
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      const content = response.choices[0].message.content || "";
      
      // Split content by lines and process each line
      const tags = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(tag => {
          // Remove any extra spaces or characters and limit length
          const cleanTag = tag
            .replace(/[^a-zA-Z0-9]/g, '')  // Remove all non-alphanumeric characters
            .trim();
          return cleanTag.length > 25 ? cleanTag.slice(0, 25) : cleanTag;
        })
        .filter(tag => tag.length > 1 && tag.length <= 25)  // Filter out empty, single character, or too long tags
        .slice(0, 10);  // Ensure we have at most 10 tags

      // If we don't have enough tags, generate some generic ones
      if (tags.length < 10) {
        const defaultTags = [
          'Technology', 'Innovation', 'Learning', 'Development',
          'Business', 'Strategy', 'Growth', 'Success', 'Future', 'Tips'
        ];
        return [...tags, ...defaultTags.slice(0, 10 - tags.length)];
      }

      return tags;
    } catch (error) {
      console.error("Error generating tags:", error);
      throw new AppError(
        "Failed to generate tags",
        ErrorCode.AI_GENERATION_FAILED,
        HttpStatus.INTERNAL_ERROR
      );
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
      model: "gpt-4",
      temperature: 0.7,
      max_tokens: 2000,
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