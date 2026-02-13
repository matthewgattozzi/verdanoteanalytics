import { KillScaleList } from "./KillScaleList";
import type { KillScaleConfig } from "@/lib/killScaleLogic";

interface KillTabProps {
  creatives: any[];
  config: KillScaleConfig;
  onCreativeClick?: (creative: any) => void;
}

export function KillTab(props: KillTabProps) {
  return <KillScaleList {...props} variant="kill" />;
}
