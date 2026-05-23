import { apiFetch } from "../lib/api";

import type {
  MessageDto,
  SendMessageInput,
  ForwardMessageInput,
} from "../types";

interface MessagesListResponse {
  success: boolean;
  data: MessageDto[];
  meta?: { hasMore: boolean };
}

interface SingleMessageResponse {
  success: boolean;
  data: MessageDto;
}

interface SearchResponse {
  success: boolean;
  data: MessageDto[];
  meta?: { hasMore: boolean };
}

export const messageService = {
  // GET /api/messages/conversation/:id?before=msgId&limit=20

  fetchMessages: (
    conversationId: string,
    params?: { before?: string; limit?: number },
    signal?: AbortSignal,
  ) => {
    const query = new URLSearchParams();
    if (params?.before) query.set("before", params.before);
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return apiFetch<MessagesListResponse>(
      `/messages/conversation/${conversationId}${qs ? `?${qs}` : ""}`,
      { signal },
    );
  },

  // POST /api/messages  (REST fallback — prefer socket send_message)
  sendMessage: (data: SendMessageInput) =>
    apiFetch<SingleMessageResponse>("/messages", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // POST /api/messages/forward
  forwardMessage: (data: ForwardMessageInput) =>
    apiFetch<SingleMessageResponse>("/messages/forward", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // DELETE /api/messages/:id
  deleteMessage: (id: string) =>
    apiFetch<{ success: boolean }>(`/messages/${id}`, {
      method: "DELETE",
    }),

  // POST /api/messages/:id/reactions
  addReaction: (messageId: string, emoji: string, conversationId: string) =>
    apiFetch<{ success: boolean }>(`/messages/${messageId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ emoji, conversationId }),
    }),

  // DELETE /api/messages/:id/reactions
  removeReaction: (messageId: string, conversationId: string) =>
    apiFetch<{ success: boolean }>(`/messages/${messageId}/reactions`, {
      method: "DELETE",
      body: JSON.stringify({ conversationId }),
    }),

  // GET /api/messages/conversation/:id/search?q=query
  searchMessages: (
    conversationId: string,
    query: string,
    params?: { before?: string; limit?: number },
  ) => {
    const qs = new URLSearchParams({ q: query });
    if (params?.before) qs.set("before", params.before);
    if (params?.limit) qs.set("limit", String(params.limit));
    return apiFetch<SearchResponse>(
      `/messages/conversation/${conversationId}/search?${qs}`,
    );
  },
};
