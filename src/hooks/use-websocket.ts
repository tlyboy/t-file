import { useEffect, useRef } from 'react'
import type { WSMessage } from '@/types/file'
import { getWsUrlSnapshot } from './use-settings'

type MessageHandler = (message: WSMessage) => void

export function useWebSocket(onMessage: MessageHandler, enabled: boolean = true) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | undefined>(undefined)
  const isUnmountedRef = useRef(false)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    if (!enabled) return

    isUnmountedRef.current = false

    const connect = () => {
      if (isUnmountedRef.current) return

      const wsUrl = getWsUrlSnapshot()
      if (!wsUrl) return

      try {
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          console.log('[ws] 已连接')
          ws.send(JSON.stringify({ type: 'file:subscribe' }))
        }

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WSMessage
            onMessageRef.current(message)
          } catch (err) {
            console.error('[ws] 解析消息失败:', err)
          }
        }

        ws.onclose = () => {
          if (isUnmountedRef.current) return
          console.log('[ws] 连接断开，3秒后重连...')
          reconnectTimeoutRef.current = window.setTimeout(connect, 3000)
        }

        ws.onerror = () => {
          ws.close()
        }

        wsRef.current = ws
      } catch {
        if (isUnmountedRef.current) return
        reconnectTimeoutRef.current = window.setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      isUnmountedRef.current = true
      clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }
      wsRef.current = null
    }
  }, [enabled])

  return wsRef
}
