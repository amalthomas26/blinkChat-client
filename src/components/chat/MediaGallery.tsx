import { useMemo, useState, useCallback } from "react";
import { X, Image as ImageIcon } from "../ui/icons";
import { useMessageStore } from "../../store/message.store";
import { useMessageIds } from "../../store/message.selectors";
import { MessageType } from "../../types";
import { lazy, Suspense } from "react";
const ImageViewer = lazy(() => import("./ImageViewer").then(m => ({ default: m.ImageViewer })));

interface MediaGalleryProps {
  conversationId: string;
  onClose: () => void;
}

export function MediaGallery({ conversationId, onClose }: MediaGalleryProps) {
  const messageIds = useMessageIds(conversationId);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const mediaItems = useMemo(() => {
    const state = useMessageStore.getState();
    return messageIds
      .map((id) => state.byId[id])
      .filter(
        (msg) =>
          msg &&
          msg.mediaUrl &&
          (msg.type === MessageType.IMAGE || msg.type === MessageType.VIDEO),
      )
      .reverse(); // newest first
  }, [messageIds]);
  const handleMediaClick = useCallback((mediaUrl: string) => {
    setViewerSrc(mediaUrl);
  }, []);
  return (
    <>
      <div className="fixed inset-0 z-40 flex flex-col bg-[#0b1017]/95 backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#273244] px-5 py-4">
          <div className="flex items-center gap-3">
            <ImageIcon className="h-5 w-5 text-[#8b5cf6]" />
            <h2 className="text-lg font-semibold text-white">Media</h2>
            <span className="text-sm text-slate-400">
              {mediaItems.length} item{mediaItems.length !== 1 ? "s" : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Scrollable Grid */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {mediaItems.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-400">
                No media shared in this conversation yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {mediaItems.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => {
                    if (item.mediaUrl) handleMediaClick(item.mediaUrl);
                  }}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-[#1a202b] transition hover:ring-2 hover:ring-[#8b5cf6]"
                >
                  {item.type === MessageType.IMAGE ? (
                    <img
                      src={item.mediaUrl}
                      alt={item.content ?? "Media"}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <video
                      src={item.mediaUrl}
                      className="h-full w-full object-cover"
                      muted
                      preload="metadata"
                    />
                  )}

                  {item.type === MessageType.VIDEO ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="rounded-full bg-white/20 p-2">
                        <svg
                          className="h-6 w-6 text-white"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Suspense fallback={null}>
        <ImageViewer src={viewerSrc} onClose={() => setViewerSrc(null)} />
      </Suspense>
    </>
  );
}
