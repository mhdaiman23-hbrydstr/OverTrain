import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

type ForgotPasswordModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: string
  setEmail: (value: string) => void
  message: string
  setMessage: (value: string) => void
  onSubmit: () => void | Promise<void>
  submitting?: boolean
}

export function ForgotPasswordModal({
  open,
  onOpenChange,
  email,
  setEmail,
  message,
  setMessage,
  onSubmit,
  submitting = false,
}: ForgotPasswordModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Your Password</DialogTitle>
          <DialogDescription>
            Enter your email address and we'll send you a link to reset your password.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email Address</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="Enter your email"
              className="bg-input border-border"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  onSubmit()
                }
              }}
            />
          </div>
          {message && (
            <div className={`text-sm p-3 rounded ${
              message.includes("sent") || message.includes("receive")
                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                : "bg-red-500/10 text-red-700 dark:text-red-400"
            }`}>
              {message}
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                setEmail("")
                setMessage("")
              }}
            >
              Cancel
            </Button>
            <Button
              className="gradient-primary text-primary-foreground"
              onClick={onSubmit}
              disabled={submitting || !email || message.includes("sent") || message.includes("receive")}
              aria-busy={submitting}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
