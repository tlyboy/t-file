export interface FileItem {
  id: number
  filename: string
  originalName: string
  mimeType: string
  size: number
  x: number
  y: number
  hasPickupCode: boolean
  createdAt: string
}

export interface WSMessage {
  type: string
  payload?: unknown
  timestamp?: number
}
