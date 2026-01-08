import type { FileItem } from '@/types/file'
import { getApiUrlSnapshot } from '@/hooks/use-settings'

export async function uploadFile(
  file: File,
  x: number,
  y: number,
): Promise<FileItem> {
  const apiBase = getApiUrlSnapshot()
  if (!apiBase) throw new Error('请先配置服务器地址')

  const formData = new FormData()
  formData.append('file', file)
  formData.append('x', x.toString())
  formData.append('y', y.toString())

  const response = await fetch(`${apiBase}/v1/file`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || '上传失败')
  }

  return response.json()
}

export async function getFiles(): Promise<FileItem[]> {
  const apiBase = getApiUrlSnapshot()
  if (!apiBase) return []

  const response = await fetch(`${apiBase}/v1/file/list`)

  if (!response.ok) {
    throw new Error('获取文件列表失败')
  }

  return response.json()
}

export function getDownloadUrl(id: number): string {
  const apiBase = getApiUrlSnapshot()
  return `${apiBase}/v1/file/download/${id}`
}

export async function updateFilePosition(
  id: number,
  x: number,
  y: number,
): Promise<void> {
  const apiBase = getApiUrlSnapshot()
  if (!apiBase) throw new Error('请先配置服务器地址')

  const response = await fetch(`${apiBase}/v1/file/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x, y }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || '更新位置失败')
  }
}

export async function deleteFile(id: number): Promise<void> {
  const apiBase = getApiUrlSnapshot()
  if (!apiBase) throw new Error('请先配置服务器地址')

  const response = await fetch(`${apiBase}/v1/file/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || '删除失败')
  }
}
