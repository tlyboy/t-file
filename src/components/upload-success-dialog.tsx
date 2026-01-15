import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getApiUrlSnapshot } from '@/hooks/use-settings'
import type { FileItem } from '@/types/file'

interface UploadSuccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileItem | null
  pickupCode?: string
}

function generateShareUrl(fileId: number, pickupCode?: string): string {
  const currentUrl = window.location.origin
  const server = new URL(getApiUrlSnapshot()).host
  let url = `${currentUrl}?server=${encodeURIComponent(server)}&fileId=${fileId}`
  if (pickupCode) {
    url += `&code=${encodeURIComponent(pickupCode)}`
  }
  return url
}

export function UploadSuccessDialog({
  open,
  onOpenChange,
  file,
  pickupCode,
}: UploadSuccessDialogProps) {
  const [copied, setCopied] = useState(false)

  if (!file) return null

  const shareUrl = generateShareUrl(file.id, pickupCode)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>上传成功</DialogTitle>
          <DialogDescription>
            {file.originalName}{pickupCode ? `（取件码：${pickupCode}）` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input value={shareUrl} readOnly className="flex-1 text-sm" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleCopy}
            title="复制链接"
          >
            {copied ? (
              <Check className="size-4 text-green-500" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
