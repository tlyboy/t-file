import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useSettings } from '@/hooks/use-settings'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  allowClose?: boolean
}

export function SettingsDialog({
  open,
  onOpenChange,
  allowClose = true,
}: SettingsDialogProps) {
  const { settings, updateSettings } = useSettings()
  const [server, setServer] = useState(settings.server)
  const [devMode, setDevMode] = useState(settings.devMode)

  // 同步外部设置变化
  useEffect(() => {
    setServer(settings.server)
    setDevMode(settings.devMode)
  }, [settings.server, settings.devMode])

  const handleSave = () => {
    const trimmed = server.trim()
    if (!trimmed) return
    updateSettings({ server: trimmed, devMode })
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    }
  }

  return (
    <Dialog open={open} onOpenChange={allowClose ? onOpenChange : undefined}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={
          allowClose ? undefined : (e) => e.preventDefault()
        }
        onEscapeKeyDown={allowClose ? undefined : (e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>服务器配置</DialogTitle>
          <DialogDescription>
            请输入 T-File 服务器地址以开始使用
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="server">服务器地址</Label>
            <Input
              id="server"
              value={server}
              onChange={(e) => setServer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="example.com"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="dev-mode">调试模式</Label>
            <Switch
              id="dev-mode"
              checked={devMode}
              onCheckedChange={setDevMode}
            />
          </div>
        </div>

        <DialogFooter>
          {allowClose && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
          )}
          <Button onClick={handleSave} disabled={!server.trim()}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
