import { apiFetch } from "../lib/api";
import type { IceConfigDto } from "../types/call.types";

export interface CallHistoryItem {
  _id: string;
  callType: "audio" | "video";
  status: string;
  direction: "outgoing" | "incoming";
  duration: number | null;
  createdAt: string;
  endedAt: string | null;
  peer: { _id: string; name: string; avatar: string };
}

export interface CallHistoryResponse {
  calls: CallHistoryItem[];
  total: number;
  page: number;
  totalPages: number;
}

export const callService = {
  fetchIceConfig: (): Promise<IceConfigDto> =>
    apiFetch<IceConfigDto>("/webrtc/ice-config"),

  fetchCallHistory: (page = 1, limit = 20): Promise<CallHistoryResponse> =>
    apiFetch<CallHistoryResponse>(
      `/webrtc/call-history?page=${page}&limit=${limit}`,
    ),
};
