import { useCallback } from "react";
import { socketService } from "../services/socket.service";
import { uploadService } from "../services/upload.service";
import {
  MessageType,
  type MessageSendDraft,
  type OptimisticMessageDto,
} from "../types";
import { useAuthUser } from "../store/auth.selectors";
import { useMessageActions } from "../store/message.selectors";
import { useConversationActions } from "../store/conversation.selectors";
import { getMessageTypeFromFile, validateMediaFile } from "../lib/media";
import { useUploadActions } from "../store/upload.selectors";

// getMessageTypeFromFile is imported from lib/media — no local copy needed.

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Message failed to send";
}

export function useSendMessage() {
  const currentUser = useAuthUser();

  const { addOptimisticMessage, confirmMessage, failMessage } =
    useMessageActions();

  const { updateLastMessage } = useConversationActions();


  const {
    startUpload,
    updateProgress,
    completeUpload,
    failUpload,
    removeUpload,
  } = useUploadActions();

  const sendMessage = useCallback(
    async (draft: MessageSendDraft) => {
      if (!currentUser) return;

      const trimmedContent = draft.content?.trim();
      const type = draft.file ? getMessageTypeFromFile(draft.file) : draft.type;

      if (type === MessageType.TEXT && !trimmedContent) return;
      if (type !== MessageType.TEXT && !draft.file) return;

      if (draft.file) {
        const validation = validateMediaFile(draft.file);
        if (!validation.valid) {
          throw new Error("message" in validation ? validation.message : "Invalid media file");
        }
      }

      const socket = socketService.getSocket();
      if (!socket) return;

      const clientTempId = crypto.randomUUID();
      const optimisticId = `temp:${clientTempId}`;
      const createdAt = new Date().toISOString();
      const uploadId = draft.file ? crypto.randomUUID() : undefined;
      const localPreviewUrl = draft.file
        ? URL.createObjectURL(draft.file)
        : undefined;

      const optimisticMessage: OptimisticMessageDto = {
        _id: optimisticId,
        conversationId: draft.conversationId,
        senderId: currentUser.id,
        clientTempId,
        type,
        content: trimmedContent,
        mediaUrl: localPreviewUrl,
        fileName: draft.file?.name,
        fileSize: draft.file?.size,
        audioDuration: draft.audioDuration,
        createdAt,
        deliveredTo: [],
        reactions: [],
        replyTo: draft.replyTo,
        status: "pending",
        retryFile: draft.file,
        localPreviewUrl,
        uploadId,
      };

      addOptimisticMessage(optimisticMessage);

      updateLastMessage(draft.conversationId, {
        id: optimisticId,
        senderId: currentUser.id,
        type,
        content: trimmedContent,
        mediaUrl: localPreviewUrl,
        fileName: draft.file?.name,
        fileSize: draft.file?.size,
        createdAt,
      });

      // Start upload tracking before the network call.
      if (draft.file && uploadId) {
        startUpload({
          id: uploadId,
          fileName: draft.file.name,
          fileSize: draft.file.size,
          mimeType: draft.file.type,
          localPreviewUrl,
        });
      }

      try {
        const uploadResponse =
          draft.file && uploadId
            ? await uploadService.uploadFile(draft.file, (percent) => {
                updateProgress(uploadId, percent);
              })
            : null;

        if (uploadResponse && uploadId) {
          completeUpload(uploadId, uploadResponse.data);
        }

        socket.emit(
          "send_message",
          {
            conversationId: draft.conversationId,
            clientTempId,
            type,
            content: trimmedContent,
            mediaUrl: uploadResponse?.data.url,
            mediaPublicId: uploadResponse?.data.publicId,
            fileName: draft.file?.name,
            fileSize: draft.file?.size,
            audioDuration: draft.audioDuration,
            replyTo: draft.replyTo,
          },
          (response) => {
            if ("error" in response) {
              failMessage(clientTempId, response.error);
              if (uploadId) failUpload(uploadId, response.error);
              return;
            }

            if (response.success) {
              confirmMessage(clientTempId, response.data);

              updateLastMessage(draft.conversationId, {
                id: response.data._id,
                senderId: response.data.senderId,
                type: response.data.type,
                content: response.data.content,
                mediaUrl: response.data.mediaUrl,
                thumbnailUrl: response.data.thumbnailUrl,
                fileName: response.data.fileName,
                fileSize: response.data.fileSize,
                createdAt: response.data.createdAt,
              });

              // Revoke blob URL after a short delay so the optimistic
              // message still has it during the React render cycle.
              if (localPreviewUrl) {
                setTimeout(() => URL.revokeObjectURL(localPreviewUrl), 3000);
              }

              if (uploadId) removeUpload(uploadId);
            }
          },
        );
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        failMessage(clientTempId, message);
        if (uploadId) failUpload(uploadId, message);
      }
    },
    [
      addOptimisticMessage,
      confirmMessage,
      currentUser,
      failMessage,
      failUpload,
      completeUpload,
      startUpload,
      updateProgress,
      removeUpload,
      updateLastMessage,
    ],
  );

  return { sendMessage };
}
