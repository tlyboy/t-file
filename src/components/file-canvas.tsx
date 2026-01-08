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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { FileIcon, lastDialogCloseTime } from './file-icon'
import { cn } from '@/lib/utils'
import type { FileItem } from '@/types/file'

interface DragState {
  fileId: number
  offsetX: number
  offsetY: number
  currentX: number
  currentY: number
}

export function FileCanvas() {
  const { files, loading, removeFile, moveFile } = useFiles()
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [contextMenuPos, setContextMenuPos] = useState({ x: 50, y: 50 })
  const canvasRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 鼠标/触摸移动和释放事件（挂载到 document）
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
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault()
        handleMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }
    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 1) {
        handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [dragState, moveFile])

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

  const handleDrop = async (e: React.DragEvent) => {
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

    setUploadProgress(0)
    try {
      const file = droppedFiles[0]
      await uploadFile(file, x, y, setUploadProgress)
    } catch (err) {
      console.error('上传失败:', err)
      alert(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploadProgress(null)
    }
  }

  const handleDownload = (file: FileItem) => {
    removeFile(file.id)

    const link = document.createElement('a')
    link.href = getDownloadUrl(file.id)
    link.download = file.originalName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
    if (document.querySelector('[data-state="open"][role="alertdialog"]')) return
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

  // 文件拖拽开始（触摸事件）
  const handleFileTouchStart = (e: React.TouchEvent, file: FileItem) => {
    // 如果弹窗刚关闭，不启动拖拽
    if (Date.now() - lastDialogCloseTime < 200) return

    // 如果有弹窗或菜单打开，不启动拖拽
    if (document.querySelector('[data-state="open"][role="dialog"]')) return
    if (document.querySelector('[data-state="open"][role="alertdialog"]')) return
    if (document.querySelector('[data-state="open"][role="menu"]')) return

    if (e.touches.length !== 1) return

    const touch = e.touches[0]
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()

    setDragState({
      fileId: file.id,
      offsetX: touch.clientX - rect.left - rect.width / 2,
      offsetY: touch.clientY - rect.top - rect.height / 2,
      currentX: touch.clientX,
      currentY: touch.clientY,
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

  // 文件选择后上传
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setUploadProgress(0)
    try {
      await uploadFile(
        selectedFiles[0],
        contextMenuPos.x,
        contextMenuPos.y,
        setUploadProgress,
      )
    } catch (err) {
      console.error('上传失败:', err)
      alert(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploadProgress(null)
      // 清空 input 以便再次选择同一文件
      e.target.value = ''
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={canvasRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onContextMenu={handleContextMenu}
          className={cn(
            'relative w-full h-full min-h-screen',
            'transition-colors duration-200',
            isDragging && 'bg-primary/5',
            dragState && 'cursor-grabbing',
          )}
        >
      {/* 拖拽上传提示 */}
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="border-2 border-dashed border-primary rounded-xl p-12 bg-background/80 backdrop-blur">
            <p className="text-lg font-medium text-primary">松开以上传文件</p>
          </div>
        </div>
      )}

      {/* 上传进度 */}
      {uploadProgress !== null && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background/95 backdrop-blur border rounded-lg shadow-lg p-4 min-w-[200px]">
          <div className="text-sm text-center mb-2">
            上传中 {uploadProgress}%
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-150"
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
            'absolute transform -translate-x-1/2 -translate-y-1/2',
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
          className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
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
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-muted-foreground">拖拽文件到任意位置以分享</p>
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
    <ContextMenuContent>
      <ContextMenuItem onClick={handleUploadClick}>
        <Upload className="mr-2 size-4" />
        上传文件
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
  )
}
