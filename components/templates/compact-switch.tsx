import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Info } from "lucide-react"

interface CompactSwitchProps {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

export function CompactSwitch({
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: CompactSwitchProps) {
  if (!description) {
    // No description - simple inline layout
    return (
      <div className="flex items-center justify-between py-1">
        <Label className="text-sm">{label}</Label>
        <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
      </div>
    )
  }

  // With description - add tooltip
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <Label className="text-sm">{label}</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-sm">{description}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}
