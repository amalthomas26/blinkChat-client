import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface EmojiSelection {
  native: string;
}

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
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
