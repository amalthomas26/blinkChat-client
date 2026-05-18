interface VideoMessageProps {
  src: string;
  caption?: string;
}

export function VideoMessage({ src, caption }: VideoMessageProps) {
  return (
    <div className="flex flex-col gap-1">
      <video
        controls
        preload="metadata"
        className="max-h-80 w-full rounded-xl bg-black object-contain"
      >
        <source src={src} />
      </video>
      {caption ? (
        <p className="whitespace-pre-wrap break-words text-sm">{caption}</p>
      ) : null}
    </div>
  );
}
