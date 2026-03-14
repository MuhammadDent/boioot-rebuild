import { api } from "@/lib/api";
import type {
  PagedResult,
  ConversationSummaryResponse,
  ConversationDetailResponse,
} from "@/types";

export const messagesService = {
  getConversations(): Promise<ConversationSummaryResponse[]> {
    return api.get<ConversationSummaryResponse[]>("/messages/conversations");
  },

  getConversation(
    id: string,
    page = 1,
    pageSize = 30
  ): Promise<ConversationDetailResponse> {
    return api.get<ConversationDetailResponse>(
      `/messages/conversations/${id}?page=${page}&pageSize=${pageSize}`
    );
  },

  sendMessage(conversationId: string, content: string): Promise<unknown> {
    return api.post(`/messages/conversations/${conversationId}/messages`, {
      content,
    });
  },

  markRead(conversationId: string): Promise<void> {
    return api.patch<void>(
      `/messages/conversations/${conversationId}/read`,
      {}
    );
  },
};
