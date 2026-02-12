import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateCreative } from "@/hooks/useCreatives";

const TYPE_OPTIONS = ["Video", "Static", "GIF", "Carousel"];
const PERSON_OPTIONS = ["Creator", "Customer", "Founder", "Actor", "No Talent"];
const STYLE_OPTIONS = ["UGC Native", "Studio Clean", "Text Forward", "Lifestyle"];
const HOOK_OPTIONS = ["Problem Callout", "Confession", "Question", "Statement Bold", "Authority Intro", "Before & After", "Pattern Interrupt"];

const OPTIONS_MAP: Record<string, string[]> = {
  ad_type: TYPE_OPTIONS,
  person: PERSON_OPTIONS,
  style: STYLE_OPTIONS,
  hook: HOOK_OPTIONS,
};

interface InlineTagSelectProps {
  adId: string;
  field: "ad_type" | "person" | "style" | "hook";
  currentValue: string | null;
}

export function InlineTagSelect({ adId, field, currentValue }: InlineTagSelectProps) {
  const updateCreative = useUpdateCreative();
  const [isOpen, setIsOpen] = useState(false);
  const options = OPTIONS_MAP[field] || [];

  if (currentValue) {
    return <span className="text-xs">{currentValue}</span>;
  }

  return (
    <Select
      open={isOpen}
      onOpenChange={setIsOpen}
      value=""
      onValueChange={(val) => {
        updateCreative.mutate({ adId, updates: { [field]: val } });
        setIsOpen(false);
      }}
    >
      <SelectTrigger
        className="h-6 w-24 text-[10px] border-dashed text-muted-foreground bg-transparent px-1.5"
        onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
      >
        <SelectValue placeholder="+ tag" />
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
