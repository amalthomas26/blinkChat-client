import { apiFetch } from "../lib/api";
import type {
  PaginatedConversationListDto,
  ConversationListItemDto,
  CreateGroupInput,
  ConversationListUserDto,
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

  leaveGroup: (id: string) =>
    apiFetch<{ success: boolean }>(`/conversations/${id}/members/me`, {
      method: "DELETE",
    }),

  muteConversation: (id: string) =>
    apiFetch<{ success: boolean }>(`/conversations/${id}/mute`, {
      method: "PATCH",
      body: JSON.stringify({}),
    }),

  unmuteConversation: (id: string) =>
    apiFetch<{ success: boolean }>(`/conversations/${id}/mute`, {
      method: "DELETE",
    }),

  renameGroup: (id: string, name: string) =>
    apiFetch<{ success: boolean }>(`/conversations/${id}/name`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),

  updateGroupAvatar: (
    id: string,
    groupAvatar: string,
    groupAvatarPublicId: string,
  ) =>
    apiFetch<{ success: boolean }>(`/conversations/${id}/avatar`, {
      method: "PATCH",
      body: JSON.stringify({ groupAvatar, groupAvatarPublicId }),
    }),

  deleteGroupAvatar: (id: string) =>
    apiFetch<{ success: boolean }>(`/conversations/${id}/avatar`, {
      method: "DELETE",
    }),

  addMembers: (id: string, userIds: string[]) =>
    apiFetch<{
      success: boolean;
      data: { added: ConversationListUserDto[] };
    }>(`/conversations/${id}/members`, {
      method: "POST",
      body: JSON.stringify({ userIds }),
    }),

  removeMembers: (id: string, memberIds: string[]) =>
    apiFetch<{ success: boolean }>(`/conversations/${id}/members`, {
      method: "DELETE",
      body: JSON.stringify({ memberIds }),
    }),

  promoteAdmin: (conversationId: string, userId: string) =>
    apiFetch<{ success: boolean }>(
      `/conversations/${conversationId}/members/${userId}/promote`,
      { method: "PATCH" },
    ),

  demoteAdmin: (conversationId: string, userId: string) =>
    apiFetch<{ success: boolean }>(
      `/conversations/${conversationId}/members/${userId}/demote`,
      { method: "PATCH" },
    ),

  updateDescription: (id: string, description: string) =>
    apiFetch<{ success: boolean }>(`/conversations/${id}/description`, {
      method: "PATCH",
      body: JSON.stringify({ description }),
    }),

  deleteConversation: (id: string) =>
    apiFetch<{ success: boolean }>(`/conversations/${id}`, {
      method: "DELETE",
    }),
};
