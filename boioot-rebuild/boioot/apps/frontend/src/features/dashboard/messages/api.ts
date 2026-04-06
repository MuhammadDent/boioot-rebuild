import { api } from "@/lib/api";
import type {
  ConversationSummary,
  ConversationDetail,
  MessageItem,
} from "@/types";

/** pageSize used when loading a conversation thread (backend caps at 100). */
export const CONVERSATION_PAGE_SIZE = 100;

export interface CreateConversationBody {
  recipientId: string;
  propertyId?: string;
  projectId?: string;
}

export const messagingApi = {
  /** GET /messages/conversations — returns all conversations for the current user, sorted by lastMessageAt desc. */
  getConversations(): Promise<ConversationSummary[]> {
    return api.get("/messages/conversations");
  },

  /**
   * POST /messages/conversations — idempotent get-or-create.
   * Returns existing conversation if one already exists between the two users
   * for the same property/project combination, otherwise creates a new one.
   */
  getOrCreateConversation(body: CreateConversationBody): Promise<ConversationSummary> {
    return api.post("/messages/conversations", body);
  },

  /**
   * GET /messages/conversations/{id} — returns conversation metadata + paginated messages.
   * Messages are sorted oldest-first (page 1 = oldest batch).
   * Also marks all unread messages from the other participant as read.
   */
  getConversation(
    id: string,
    page: number = 1,
    pageSize: number = CONVERSATION_PAGE_SIZE
  ): Promise<ConversationDetail> {
    return api.get(`/messages/conversations/${id}?page=${page}&pageSize=${pageSize}`);
  },

  /**
   * POST /messages/conversations/{id}/messages — send a new message.
   * At least one of content or attachmentData must be provided.
   * Returns the newly created MessageItem (isOwnMessage = true).
   */
  sendMessage(
    conversationId: string,
    content: string,
    attachmentData?: string,
    attachmentName?: string
  ): Promise<MessageItem> {
    return api.post(`/messages/conversations/${conversationId}/messages`, {
      content,
      attachmentData,
      attachmentName,
    });
  },

  getUnreadCount(): Promise<{ total: number }> {
    return api.get("/messages/unread-count");
  },
};
