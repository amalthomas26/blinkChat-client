import { lazy, Suspense } from "react";

export interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const ReactionPickerImpl = lazy(() => import("./ReactionPickerImpl"));

export function ReactionPicker(props: ReactionPickerProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-[400px] w-[352px] items-center justify-center rounded-2xl border border-[#273244] bg-[#151b2b] shadow-2xl">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" />
        </div>
      }
    >
      <ReactionPickerImpl {...props} />
    </Suspense>
  );
}
