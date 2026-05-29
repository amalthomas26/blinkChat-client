import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import type { ReactionPickerProps } from "./ReactionPicker";

interface EmojiSelection {
  native: string;
}

export default function ReactionPickerImpl({ onSelect, onClose }: ReactionPickerProps) {
  return (
    <div className="rounded-2xl border border-[#273244] bg-[#151b2b] shadow-2xl">
      <Picker
        data={data}
        theme="dark"
        previewPosition="none"
        onEmojiSelect={(emoji: EmojiSelection) => {
          onSelect(emoji.native);
          onClose();
        }}
      />
    </div>
  );
}
