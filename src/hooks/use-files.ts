import { useState, useEffect } from 'react'
import { useImmer } from 'use-immer'
import { getFiles } from '@/lib/api'
import { useWebSocket } from './use-websocket'
import { useSettings } from './use-settings'
import type { FileItem, WSMessage } from '@/types/file'

export function useFiles() {
  const [files, updateFiles] = useImmer<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const { isConfigured } = useSettings()

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false)
      return
    }
    getFiles()
      .then((data) => updateFiles(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [updateFiles, isConfigured])

  const handleMessage = (message: WSMessage) => {
    switch (message.type) {
      case 'file:new':
        updateFiles((draft) => {
          const payload = message.payload as FileItem
          if (!draft.some((f) => f.id === payload.id)) {
            draft.unshift(payload)
          }
        })
        break

      case 'file:deleted':
        updateFiles((draft) => {
          const payload = message.payload as { id: number }
          const index = draft.findIndex((f) => f.id === payload.id)
          if (index !== -1) {
            draft.splice(index, 1)
          }
        })
        break

      case 'file:moved':
        updateFiles((draft) => {
          const payload = message.payload as {
            id: number
            x: number
            y: number
          }
          const file = draft.find((f) => f.id === payload.id)
          if (file) {
            file.x = payload.x
            file.y = payload.y
          }
        })
        break
    }
  }

  useWebSocket(handleMessage, isConfigured)

  const removeFile = (id: number) => {
    updateFiles((draft) => {
      const index = draft.findIndex((f) => f.id === id)
      if (index !== -1) {
        draft.splice(index, 1)
      }
    })
  }

  const moveFile = (id: number, x: number, y: number) => {
    updateFiles((draft) => {
      const file = draft.find((f) => f.id === id)
      if (file) {
        file.x = x
        file.y = y
      }
    })
  }

  return { files, loading, removeFile, moveFile }
}
