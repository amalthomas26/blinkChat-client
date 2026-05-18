export const AppNotificationKind = {
  NEW_MESSAGE: "new_message",
  INCOMING_CALL: "incoming_call",
  MISSED_CALL: "missed_call",
} as const;

export type AppNotificationKind =
  (typeof AppNotificationKind)[keyof typeof AppNotificationKind];

export type BrowserNotificationPermission =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

export interface AppNotification {
  id: string;
  kind: AppNotificationKind;
  title: string;
  body: string;
  route: string;
  createdAt: string;
  conversationId?: string;
  messageId?: string;
  callId?: string;
  avatarUrl?: string;
  read: boolean;
}

export interface CreateAppNotificationInput {
    kind:AppNotificationKind;
    title:string;
    body:string;
    route:string;
    conversationId?:string;
    messageId?:string;
    callId?:string;
    avatarUrl?:string;
}

export interface BrowserNotificationInput {
    id:string;
    title:string;
    body:string;
    route:string;
    tag:string;
    icon?:string;
    requireInteraction?:boolean;
}

declare global {
  interface NotificationOptions {
    renotify?: boolean;
  }
}