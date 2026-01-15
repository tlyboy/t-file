import { useState } from 'react'
import { Dices, Copy, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'

function generateRandomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

interface UploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: File | null
  onConfirm: (pickupCode?: string) => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function UploadDialog({
  open,
  onOpenChange,
  file,
  onConfirm,
}: UploadDialogProps) {
  const [enablePickupCode, setEnablePickupCode] = useState(false)
  const [pickupCode, setPickupCode] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (pickupCode.length === 6) {
      await navigator.clipboard.writeText(pickupCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleConfirm = () => {
    onConfirm(enablePickupCode && pickupCode.length === 6 ? pickupCode : undefined)
    setEnablePickupCode(false)
    setPickupCode('')
  }

  const handleCancel = () => {
    onOpenChange(false)
    setEnablePickupCode(false)
    setPickupCode('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>上传文件</DialogTitle>
          <DialogDescription>
            {file?.name} ({formatFileSize(file?.size ?? 0)})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="pickup-code-switch">设置取件码</Label>
            <Switch
              id="pickup-code-switch"
              checked={enablePickupCode}
              onCheckedChange={setEnablePickupCode}
            />
          </div>

          {enablePickupCode && (
            <div className="flex flex-col items-center gap-3">
              <Label className="text-muted-foreground text-sm">
                输入 6 位数字取件码
              </Label>
              <div className="flex items-center gap-2">
                <InputOTP
                  maxLength={6}
                  value={pickupCode}
                  onChange={setPickupCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPickupCode(generateRandomCode())}
                  title="随机生成"
                >
                  <Dices className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  disabled={pickupCode.length < 6}
                  title="复制取件码"
                >
                  {copied ? (
                    <Check className="size-4 text-green-500" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={enablePickupCode && pickupCode.length < 6}
          >
            上传
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
