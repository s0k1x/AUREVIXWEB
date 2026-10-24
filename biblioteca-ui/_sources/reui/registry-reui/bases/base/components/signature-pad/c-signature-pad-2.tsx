import {
  SignaturePad,
  SignaturePadArea,
  SignaturePadClear,
  SignaturePadGuide,
  SignaturePadPlaceholder,
  SignaturePadRedo,
  SignaturePadUndo,
} from "@/registry-reui/bases/base/reui/signature-pad"

import { ButtonGroup } from "@/registry/bases/base/ui/button-group"
import { Kbd, KbdGroup } from "@/registry/bases/base/ui/kbd"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

export default function Pattern() {
  return (
    <SignaturePad className="mx-auto max-w-lg">
      <div className="flex items-center gap-3">
        <ButtonGroup aria-label="History">
          <SignaturePadUndo />
          <SignaturePadRedo />
        </ButtonGroup>
        <p className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:flex">
          <KbdGroup>
            <Kbd>Ctrl</Kbd>
            <Kbd>Z</Kbd>
          </KbdGroup>
          to undo
        </p>
        <SignaturePadClear size="sm" className="ms-auto">
          <IconPlaceholder
            lucide="BrushCleaningIcon"
            tabler="IconEraser"
            hugeicons="BrushCleaningIcon"
            phosphor="BroomIcon"
            remixicon="RiEraserLine"
            aria-hidden="true"
          />
          Clear
        </SignaturePadClear>
      </div>
      <SignaturePadArea className="h-48">
        <SignaturePadGuide />
        <SignaturePadPlaceholder>Draw your signature</SignaturePadPlaceholder>
      </SignaturePadArea>
    </SignaturePad>
  )
}
