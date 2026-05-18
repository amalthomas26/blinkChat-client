import type { MessageDto, OptimisticMessageDto } from "../types";
import { isSameDay } from "./date";

export type MessageRenderRow =
  | {
      id: string;
      type: "date";
      date: string;
    }
  | {
      id: string;
      type: "message";
      messageId: string;
    };

export function buildMessageRows(
  messages: Array<MessageDto | OptimisticMessageDto>,
): MessageRenderRow[] {
  const rows: MessageRenderRow[] = [];

  for (const message of messages) {
    const previousMessage = rows
      .slice()
      .reverse()
      .find((row) => row.type === "message");

    const previousDate =
      previousMessage?.type === "message"
        ? messages.find((item) => item._id === previousMessage.messageId)
            ?.createdAt
        : undefined;

    if (!previousDate || !isSameDay(previousDate, message.createdAt)) {
      rows.push({
        id: `date:${message.createdAt}`,
        type: "date",
        date: message.createdAt,
      });
    }

    rows.push({
      id: `message:${message._id}`,
      type: "message",
      messageId: message._id,
    });
  }

  return rows;
}
