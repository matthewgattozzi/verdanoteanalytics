import { KillScaleList } from "./KillScaleList";
import type { KillScaleConfig } from "@/lib/killScaleLogic";

interface ScaleTabProps {
  creatives: any[];
  config: KillScaleConfig;
  onCreativeClick?: (creative: any) => void;
}

export function ScaleTab(props: ScaleTabProps) {
  return <KillScaleList {...props} variant="scale" />;
}
