import { useState } from 'react'

// 追踪弹窗关闭时间，防止关闭弹窗时意外触发拖拽
export let lastDialogCloseTime = 0
import {
  File,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  FileCode,
  FileArchive,
  FileSpreadsheet,
  Download,
  Info,
  Trash2,
  Link,
} from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { FileItem } from '@/types/file'
import { getApiUrlSnapshot } from '@/hooks/use-settings'

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.startsWith('video/')) return FileVideo
  if (mimeType.startsWith('audio/')) return FileAudio
  if (mimeType.startsWith('text/')) return FileText
  if (mimeType.includes('zip') || mimeType.includes('rar')) return FileArchive
  if (mimeType.includes('sheet') || mimeType.includes('excel'))
    return FileSpreadsheet
  if (mimeType.includes('javascript') || mimeType.includes('json'))
    return FileCode
  return File
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface FileIconProps {
  file: FileItem
  onDownload: () => void
  onDelete: () => void
  className?: string
}

export function FileIcon({
  file,
  onDownload,
  onDelete,
  className,
}: FileIconProps) {
  const Icon = getFileIcon(file.mimeType)
  const [showDetail, setShowDetail] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const handleDetailChange = (open: boolean) => {
    setShowDetail(open)
    if (!open) lastDialogCloseTime = Date.now()
  }

  const handleDeleteConfirmChange = (open: boolean) => {
    setShowDeleteConfirm(open)
    if (!open) lastDialogCloseTime = Date.now()
  }

  const handleContextMenuChange = (open: boolean) => {
    if (!open) lastDialogCloseTime = Date.now()
  }

  // 阻止事件冒泡，防止同时触发画布的菜单
  const handleStopPropagation = (e: React.SyntheticEvent) => {
    e.stopPropagation()
  }

  // 复制分享链接
  const handleCopyShareLink = async () => {
    try {
      const currentUrl = window.location.origin
      const server = new URL(getApiUrlSnapshot()).host
      const shareUrl = `${currentUrl}?server=${encodeURIComponent(server)}&fileId=${file.id}`

      await navigator.clipboard.writeText(shareUrl)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
      alert('复制失败，请手动复制')
    }
  }

  return (
    <>
      <ContextMenu onOpenChange={handleContextMenuChange}>
        <ContextMenuTrigger asChild>
          <div
            data-file-icon
            onContextMenu={handleStopPropagation}
            onTouchStart={handleStopPropagation}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg',
              'hover:bg-accent transition-colors cursor-grab active:cursor-grabbing select-none',
              'max-w-[100px] group',
              className,
            )}
            title={`${file.originalName}\n${formatFileSize(file.size)}`}
          >
            <Icon className="size-12 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-xs text-center truncate w-full">
              {file.originalName}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {formatFileSize(file.size)}
            </span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setShowDetail(true)}>
            <Info className="mr-2 size-4" />
            详情
          </ContextMenuItem>
          <ContextMenuItem onClick={handleCopyShareLink}>
            <Link className="mr-2 size-4" />
            {copySuccess ? '已复制！' : '复制分享链接'}
          </ContextMenuItem>
          <ContextMenuItem onClick={onDownload}>
            <Download className="mr-2 size-4" />
            下载
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => setShowDeleteConfirm(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 size-4" />
            删除
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* 详情弹窗 */}
      <Dialog open={showDetail} onOpenChange={handleDetailChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>文件详情</DialogTitle>
            <DialogDescription className="sr-only">
              查看文件的详细信息
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-[4em_1fr] gap-2 items-baseline">
              <span className="text-muted-foreground">文件名</span>
              <span className="font-medium break-all">{file.originalName}</span>
            </div>
            <div className="grid grid-cols-[4em_1fr] gap-2">
              <span className="text-muted-foreground">大小</span>
              <span>{formatFileSize(file.size)}</span>
            </div>
            <div className="grid grid-cols-[4em_1fr] gap-2">
              <span className="text-muted-foreground">类型</span>
              <span className="break-all">{file.mimeType}</span>
            </div>
            <div className="grid grid-cols-[4em_1fr] gap-2">
              <span className="text-muted-foreground">上传时间</span>
              <span>{formatDate(file.createdAt)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={handleDeleteConfirmChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{file.originalName}」吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
