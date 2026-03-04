import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { verifyPickupCode } from '@/lib/api'
import type { FileItem } from '@/types/file'

interface PickupCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileItem | null
  onSuccess: (pickupCode: string) => void
}

export function PickupCodeDialog({
  open,
  onOpenChange,
  file,
  onSuccess,
}: PickupCodeDialogProps) {
  const [pickupCode, setPickupCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleVerify = async () => {
    if (!file || pickupCode.length < 6) return

    setLoading(true)
    setError('')

    try {
      await verifyPickupCode(file.id, pickupCode)
      onSuccess(pickupCode)
      setPickupCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setPickupCode('')
    setError('')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>输入取件码</DialogTitle>
          <DialogDescription>
            下载「{file?.originalName}」需要输入取件码
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <InputOTP
            maxLength={6}
            value={pickupCode}
            onChange={(value) => {
              setPickupCode(value)
              setError('')
            }}
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

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button
            onClick={handleVerify}
            disabled={pickupCode.length < 6 || loading}
          >
            {loading ? '验证中...' : '确认下载'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
