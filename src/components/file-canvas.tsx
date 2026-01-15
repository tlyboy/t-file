import { useState, useRef, useEffect } from 'react'
import { Upload } from 'lucide-react'
import { useFiles } from '@/hooks/use-files'
import {
  uploadFile,
  getDownloadUrl,
  updateFilePosition,
  deleteFile,
} from '@/lib/api'
import {
  getPendingDownloadId,
  clearPendingDownloadId,
} from '@/hooks/use-settings'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { FileIcon, lastDialogCloseTime } from './file-icon'
import { UploadDialog } from './upload-dialog'
import { PickupCodeDialog } from './pickup-code-dialog'
import { cn } from '@/lib/utils'
import type { FileItem } from '@/types/file'

interface DragState {
  fileId: number
  offsetX: number
  offsetY: number
  currentX: number
  currentY: number
}

// 待定拖拽状态（触摸开始但未确认为拖拽）
interface PendingDrag {
  fileId: number
  startX: number
  startY: number
  elementRect: DOMRect
}

// 移动距离阈值（px）
const DRAG_THRESHOLD = 10

interface PendingUpload {
  file: File
  x: number
  y: number
}

export function FileCanvas() {
  const { files, loading, removeFile, moveFile } = useFiles()
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [pendingDrag, setPendingDrag] = useState<PendingDrag | null>(null)
  const [contextMenuPos, setContextMenuPos] = useState({ x: 50, y: 50 })
  const [canvasMenuEnabled, setCanvasMenuEnabled] = useState(true)
  const canvasRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 上传弹窗状态
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null)

  // 取件码验证弹窗状态
  const [pickupCodeDialogOpen, setPickupCodeDialogOpen] = useState(false)
  const [pendingDownload, setPendingDownload] = useState<FileItem | null>(null)

  // 鼠标移动和释放事件（挂载到 document）
  useEffect(() => {
    if (!dragState) return

    const handleMove = (clientX: number, clientY: number) => {
      setDragState((prev) =>
        prev ? { ...prev, currentX: clientX, currentY: clientY } : null,
      )
    }

    const handleEnd = async (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      if (!canvas || !dragState) return

      // 如果弹窗刚关闭，取消移动
      if (Date.now() - lastDialogCloseTime < 200) {
        setDragState(null)
        return
      }

      const rect = canvas.getBoundingClientRect()
      const x = ((clientX - rect.left) / rect.width) * 100
      const y = ((clientY - rect.top) / rect.height) * 100

      const fileId = dragState.fileId
      setDragState(null)

      moveFile(fileId, x, y)
      try {
        await updateFilePosition(fileId, x, y)
      } catch (err) {
        console.error('移动失败:', err)
      }
    }

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY)
    const handleMouseUp = (e: MouseEvent) => handleEnd(e.clientX, e.clientY)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, moveFile])

  // 触摸事件处理（支持待定拖拽和阈值检测）
  useEffect(() => {
    if (!dragState && !pendingDrag) return

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const touch = e.touches[0]

      // 有待定拖拽，检查是否超过阈值
      if (pendingDrag && !dragState) {
        const dx = touch.clientX - pendingDrag.startX
        const dy = touch.clientY - pendingDrag.startY
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance > DRAG_THRESHOLD) {
          // 超过阈值，正式启动拖拽
          e.preventDefault()
          const rect = pendingDrag.elementRect
          setDragState({
            fileId: pendingDrag.fileId,
            offsetX: pendingDrag.startX - rect.left - rect.width / 2,
            offsetY: pendingDrag.startY - rect.top - rect.height / 2,
            currentX: touch.clientX,
            currentY: touch.clientY,
          })
          setPendingDrag(null)
        }
        return
      }

      // 已在拖拽中
      if (dragState) {
        e.preventDefault()
        setDragState((prev) =>
          prev
            ? { ...prev, currentX: touch.clientX, currentY: touch.clientY }
            : null,
        )
      }
    }

    const handleTouchEnd = async (e: TouchEvent) => {
      // 清理待定拖拽状态
      setPendingDrag(null)

      // 处理拖拽结束
      if (dragState && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0]
        const canvas = canvasRef.current
        if (!canvas) return

        // 如果弹窗刚关闭，取消移动
        if (Date.now() - lastDialogCloseTime < 200) {
          setDragState(null)
          return
        }

        const rect = canvas.getBoundingClientRect()
        const x = ((touch.clientX - rect.left) / rect.width) * 100
        const y = ((touch.clientY - rect.top) / rect.height) * 100

        const fileId = dragState.fileId
        setDragState(null)

        moveFile(fileId, x, y)
        try {
          await updateFilePosition(fileId, x, y)
        } catch (err) {
          console.error('移动失败:', err)
        }
      }
    }

    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [dragState, pendingDrag, moveFile])

  // 自动下载：检查 URL 参数中的 fileId
  useEffect(() => {
    if (loading || files.length === 0) return

    const pendingId = getPendingDownloadId()
    if (!pendingId) return

    const fileId = parseInt(pendingId, 10)
    if (isNaN(fileId)) {
      clearPendingDownloadId()
      return
    }

    const targetFile = files.find((f) => f.id === fileId)
    if (targetFile) {
      // 延迟 500ms 执行，确保 UI 已完全加载
      setTimeout(() => {
        handleDownload(targetFile)
        clearPendingDownloadId()
      }, 500)
    } else {
      // 文件不存在，清除标记
      clearPendingDownloadId()
    }
  }, [loading, files])

  // 外部文件拖入（上传）
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy'
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length === 0) return

    // 打开上传弹窗
    setPendingUpload({ file: droppedFiles[0], x, y })
    setUploadDialogOpen(true)
  }

  const handleDownload = (file: FileItem) => {
    if (file.hasPickupCode) {
      // 需要取件码，打开验证弹窗
      setPendingDownload(file)
      setPickupCodeDialogOpen(true)
    } else {
      // 无需取件码，直接下载
      executeDownload(file)
    }
  }

  const executeDownload = (file: FileItem, pickupCode?: string) => {
    removeFile(file.id)

    const link = document.createElement('a')
    link.href = getDownloadUrl(file.id, pickupCode)
    link.download = file.originalName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePickupCodeSuccess = (pickupCode: string) => {
    if (!pendingDownload) return

    setPickupCodeDialogOpen(false)
    executeDownload(pendingDownload, pickupCode)
    setPendingDownload(null)
  }

  const handleUploadConfirm = async (pickupCode?: string) => {
    if (!pendingUpload) return

    setUploadDialogOpen(false)
    setUploadProgress(0)

    try {
      await uploadFile(
        pendingUpload.file,
        pendingUpload.x,
        pendingUpload.y,
        setUploadProgress,
        pickupCode,
      )
    } catch (err) {
      console.error('上传失败:', err)
      alert(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploadProgress(null)
      setPendingUpload(null)
    }
  }

  const handleDelete = async (file: FileItem) => {
    removeFile(file.id)
    try {
      await deleteFile(file.id)
    } catch (err) {
      console.error('删除失败:', err)
    }
  }

  // 文件拖拽开始（鼠标事件）
  const handleFileMouseDown = (e: React.MouseEvent, file: FileItem) => {
    // 忽略右键
    if (e.button !== 0) return

    // 如果弹窗刚关闭，不启动拖拽（防止关闭弹窗时意外移动文件）
    if (Date.now() - lastDialogCloseTime < 200) return

    // 如果有弹窗或菜单打开，不启动拖拽
    if (document.querySelector('[data-state="open"][role="dialog"]')) return
    if (document.querySelector('[data-state="open"][role="alertdialog"]'))
      return
    if (document.querySelector('[data-state="open"][role="menu"]')) return

    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()

    setDragState({
      fileId: file.id,
      offsetX: e.clientX - rect.left - rect.width / 2,
      offsetY: e.clientY - rect.top - rect.height / 2,
      currentX: e.clientX,
      currentY: e.clientY,
    })

    e.preventDefault()
  }

  // 文件拖拽开始（触摸事件）- 只记录起始位置，不立即启动拖拽
  const handleFileTouchStart = (e: React.TouchEvent, file: FileItem) => {
    if (e.touches.length !== 1) return

    // 如果弹窗刚关闭，不启动拖拽准备（防止关闭弹窗时意外移动文件）
    if (Date.now() - lastDialogCloseTime < 200) return

    // 如果有弹窗或菜单打开，不启动拖拽准备
    if (document.querySelector('[data-state="open"][role="dialog"]')) return
    if (document.querySelector('[data-state="open"][role="alertdialog"]'))
      return
    if (document.querySelector('[data-state="open"][role="menu"]')) return

    const touch = e.touches[0]
    const target = e.currentTarget as HTMLElement

    // 只记录起始位置，等 touchmove 超过阈值再真正启动拖拽
    setPendingDrag({
      fileId: file.id,
      startX: touch.clientX,
      startY: touch.clientY,
      elementRect: target.getBoundingClientRect(),
    })
  }

  // 计算拖拽中文件的位置
  const getDragPosition = () => {
    if (!dragState || !canvasRef.current) return null
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      left: dragState.currentX - rect.left - dragState.offsetX,
      top: dragState.currentY - rect.top - dragState.offsetY,
    }
  }

  const dragPosition = getDragPosition()
  const draggingFile = dragState
    ? files.find((f) => f.id === dragState.fileId)
    : null

  // 检测点击目标，决定是否启用画布菜单
  const handlePointerDownCapture = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    const isOnFile = target.closest('[data-file-icon]')
    const isOnMenu = target.closest('[role="menu"]')
    const isOnDialog = target.closest('[role="dialog"]')
    const isOnAlertDialog = target.closest('[role="alertdialog"]')
    // 点击在文件、菜单或对话框上时，禁用画布菜单
    setCanvasMenuEnabled(
      !isOnFile && !isOnMenu && !isOnDialog && !isOnAlertDialog,
    )
  }

  // 右键菜单记录位置
  const handleContextMenu = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    setContextMenuPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  // 点击上传菜单项
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  // 文件选择后打开上传弹窗
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    // 打开上传弹窗
    setPendingUpload({
      file: selectedFiles[0],
      x: contextMenuPos.x,
      y: contextMenuPos.y,
    })
    setUploadDialogOpen(true)

    // 清空 input 以便再次选择同一文件
    e.target.value = ''
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={canvasRef}
          onPointerDownCapture={handlePointerDownCapture}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onContextMenu={handleContextMenu}
          className={cn(
            'relative h-full min-h-screen w-full touch-manipulation select-none',
            'transition-colors duration-200',
            isDragging && 'bg-primary/5',
            dragState && 'cursor-grabbing',
          )}
          style={{ WebkitTouchCallout: 'none' }}
        >
          {/* 拖拽上传提示 */}
          {isDragging && (
            <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
              <div className="border-primary bg-background/80 rounded-xl border-2 border-dashed p-12 backdrop-blur">
                <p className="text-primary text-lg font-medium">
                  松开以上传文件
                </p>
              </div>
            </div>
          )}

          {/* 上传进度 */}
          {uploadProgress !== null && (
            <div className="bg-background/95 fixed bottom-6 left-1/2 z-50 min-w-[200px] -translate-x-1/2 rounded-lg border p-4 shadow-lg backdrop-blur">
              <div className="mb-2 text-center text-sm">
                上传中 {uploadProgress}%
              </div>
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* 文件展示 */}
          {files.map((file) => (
            <div
              key={file.id}
              onMouseDown={(e) => handleFileMouseDown(e, file)}
              onTouchStartCapture={(e) => handleFileTouchStart(e, file)}
              className={cn(
                'absolute -translate-x-1/2 -translate-y-1/2 transform',
                dragState?.fileId === file.id && 'opacity-30',
              )}
              style={{
                left: `${file.x}%`,
                top: `${file.y}%`,
              }}
            >
              <FileIcon
                file={file}
                onDownload={() => handleDownload(file)}
                onDelete={() => handleDelete(file)}
              />
            </div>
          ))}

          {/* 拖拽中的文件（跟随鼠标） */}
          {draggingFile && dragPosition && (
            <div
              className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-1/2 transform"
              style={{
                left: dragPosition.left,
                top: dragPosition.top,
              }}
            >
              <FileIcon
                file={draggingFile}
                onDownload={() => {}}
                onDelete={() => {}}
                className="scale-110"
              />
            </div>
          )}

          {/* 空状态 */}
          {!loading && files.length === 0 && !isDragging && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
              <p className="text-muted-foreground">拖拽文件到任意位置以分享</p>
              {/* PC 端提示 */}
              <p className="text-muted-foreground/60 hidden text-sm md:block">
                右键空白处上传 · 右键文件查看菜单 · 拖动文件移动位置
              </p>
              {/* 移动端提示 */}
              <p className="text-muted-foreground/60 text-sm md:hidden">
                长按空白处上传 · 长按文件查看菜单 · 拖动文件移动位置
              </p>
            </div>
          )}

          {/* 隐藏的文件选择器 */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </ContextMenuTrigger>
      {canvasMenuEnabled && (
        <ContextMenuContent>
          <ContextMenuItem onClick={handleUploadClick}>
            <Upload className="mr-2 size-4" />
            上传文件
          </ContextMenuItem>
        </ContextMenuContent>
      )}

      {/* 上传弹窗 */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        file={pendingUpload?.file ?? null}
        onConfirm={handleUploadConfirm}
      />

      {/* 取件码验证弹窗 */}
      <PickupCodeDialog
        open={pickupCodeDialogOpen}
        onOpenChange={setPickupCodeDialogOpen}
        file={pendingDownload}
        onSuccess={handlePickupCodeSuccess}
      />
    </ContextMenu>
  )
}
