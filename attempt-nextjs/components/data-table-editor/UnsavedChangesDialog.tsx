import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Z_INDEX } from "@/lib/z-index"

interface UnsavedChangesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isRTL: boolean
  onDiscard: () => void
  onSaveAndClose: () => void
  isSaving: boolean
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  isRTL,
  onDiscard,
  onSaveAndClose,
  isSaving
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" style={{ zIndex: Z_INDEX.CONFIRMATION_CONTENT }}>
        <DialogHeader>
          <DialogTitle className={isRTL ? "text-right" : "text-left"}>
            {isRTL ? "تغييرات غير محفوظة" : "Unsaved Changes"}
          </DialogTitle>
          <DialogDescription className={isRTL ? "text-right" : "text-left"}>
            {isRTL 
              ? "لديك تغييرات غير محفوظة. هل تريد حفظ التغييرات قبل الإغلاق؟"
              : "You have unsaved changes. Would you like to save your changes before closing?"
            }
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className={`gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          <Button
            variant="outline"
            onClick={onDiscard}
          >
            {isRTL ? "تجاهل التغييرات" : "Discard Changes"}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {isRTL ? "إلغاء" : "Cancel"}
          </Button>
          <Button
            onClick={onSaveAndClose}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {isRTL ? "جاري الحفظ..." : "Saving..."}
              </>
            ) : (
              isRTL ? "حفظ والإغلاق" : "Save & Close"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 