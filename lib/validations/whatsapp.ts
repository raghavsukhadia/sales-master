import { z } from "zod";

/**
 * MessageAutoSender inbound webhook payload (confirmed fields from CLAUDE.md §19
 * and docs/testing-messageautosender-webhook.md). boundType/itemType are loose
 * strings — full enums are not confirmed.
 */
export const messageAutoSenderWebhookSchema = z.object({
  id: z.string().min(1),
  channelId: z.union([z.number(), z.string()]),
  receiverNumber: z.string().min(1),
  receiverName: z.string().optional(),
  senderNumber: z.string().min(1),
  senderName: z.string().optional(),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
  boundType: z.string().min(1),
  itemType: z.string().min(1),
  value: z.string().optional(),
  time: z.number().optional(),
  caption: z.string().optional(),
  isForwarded: z.boolean().optional(),
  filename: z.string().optional(),
  filePath: z.string().optional(),
});

export type MessageAutoSenderWebhookPayload = z.infer<
  typeof messageAutoSenderWebhookSchema
>;

/** Normalized internal representation after webhook validation. */
export const ingestedWhatsAppMessageSchema = z.object({
  externalMessageId: z.string().min(1),
  channelId: z.string().min(1),
  senderNumber: z.string().min(1),
  receiverNumber: z.string().min(1),
  direction: z.string().min(1),
  itemType: z.string().min(1),
  value: z.string().nullable(),
  caption: z.string().nullable(),
  fileName: z.string().nullable(),
  filePath: z.string().nullable(),
  messageTimestamp: z.string().min(1),
  salesmanId: z.string().uuid().nullable(),
  sessionId: z.string().uuid().nullable(),
});

export type IngestedWhatsAppMessage = z.infer<typeof ingestedWhatsAppMessageSchema>;

export const sessionProcessingInputSchema = z.object({
  messageId: z.string().uuid(),
  batchSize: z.number().int().min(1).max(50).default(10),
});

export type SessionProcessingInput = z.infer<typeof sessionProcessingInputSchema>;

export const whatsappMediaMetadataSchema = z.object({
  messageId: z.string().uuid(),
  sourceUrl: z.string().url(),
  fileName: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  fileSize: z.number().int().nonnegative().nullable().optional(),
  storageBucket: z.literal("whatsapp-media"),
  storagePath: z.string().min(1),
});

export type WhatsAppMediaMetadata = z.infer<typeof whatsappMediaMetadataSchema>;

export const INBOUND_BOUND_TYPE = "in";
