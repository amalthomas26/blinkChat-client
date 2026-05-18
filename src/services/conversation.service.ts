import { apiFetch } from "../lib/api";
import type {
  PaginatedConversationListDto,
  ConversationListItemDto,
  CreateGroupInput,
} from "../types";

interface PaginatedConversationsResponse {
  success: boolean;
  data: PaginatedConversationListDto;
}

interface SingleConversationResponse {
  success: boolean;
  data: ConversationListItemDto;
}

interface StartConversationResponse {
  success: boolean;
  data: { conversationId: string };
}

export const conversationService = {
  listConversations: (params?: { limit?: number; cursor?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.cursor) query.set("cursor", params.cursor);
    const qs = query.toString();

    return apiFetch<PaginatedConversationsResponse>(
      `/conversations${qs ? `?${qs}` : ""}`,
    );
  },

  startConversation: (receiverId: string) =>
    apiFetch<StartConversationResponse>("/conversations", {
      method: "POST",
      body: JSON.stringify({ receiverId }),
    }),

  getConversation: (id: string) =>
    apiFetch<SingleConversationResponse>(`/conversations/${id}`),

  createGroup: (data: CreateGroupInput) =>
    apiFetch<SingleConversationResponse>("/conversations/group", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  pinConversation: (id: string) =>
    apiFetch<{ success: boolean }>(`/conversations/${id}/pin`, {
      method: "POST",
    }),

  unpinConversation: (id: string) =>
    apiFetch<{ success: boolean }>(`/conversations/${id}/pin`, {
      method: "DELETE",
    }),

  leaveGroup: (_id: string) => {},
};
