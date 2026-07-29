import { useState, useEffect, useCallback } from 'react'

/**
 * 当前文件上下文（轻量单例，仅在内存中，不持久化）
 * 用于工具页之间传递「当前正在处理的文件」，避免重复选文件。
 *
 * 工作流程：
 * 1. 用户在 ViewerPage 打开 PDF -> 阅读时点快捷入口（如「编辑页面」）
 * 2. ViewerPage 先 setCurrentFile(file)，再 navigate('/edit')
 * 3. EditPage 加载时调用 useAutoLoadCurrentFile()，检测到 currentFile
 *    -> 自动派发 files:dropped 事件，工具页的 useDragDrop 接收并加载
 *
 * 注意：文件数据（Uint8Array）较大，仅在内存中传递，不持久化。
 * 离开应用后上下文丢失是合理的。
 */

let currentFile = null
const listeners = new Set()

export function setCurrentFile(file) {
  currentFile = file
  listeners.forEach((fn) => fn(file))
}

export function getCurrentFile() {
  return currentFile
}

export function clearCurrentFile() {
  currentFile = null
  listeners.forEach((fn) => fn(null))
}

/**
 * useCurrentFile - 订阅当前文件上下文
 * @param {boolean} autoConsume - 是否在读取后自动清除（默认 true，避免重复加载）
 */
export function useCurrentFile(autoConsume = true) {
  const [file, setFile] = useState(() => {
    const f = getCurrentFile()
    if (f && autoConsume) {
      // 标记为已消费，但不立即清除（避免渲染期间清除导致其他订阅者也读不到）
      // 清除在 effect 中执行
    }
    return f
  })

  useEffect(() => {
    const handler = (newFile) => setFile(newFile)
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }, [])

  // 自动消费：首次读取后清除上下文，避免下次进入工具页又加载
  useEffect(() => {
    if (file && autoConsume) {
      clearCurrentFile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const consume = useCallback(() => {
    const f = getCurrentFile()
    clearCurrentFile()
    return f
  }, [])

  return { currentFile: file, setCurrentFile, clearCurrentFile, consume }
}

/**
 * useAutoLoadCurrentFile - 工具页 mount 时自动检测并加载当前文件上下文
 * 如果存在 currentFile，派发 files:dropped 事件，复用工具页现有 useDragDrop 逻辑
 * 派发后自动清除上下文（一次性消费）
 *
 * 用法：在工具页组件顶层调用 useAutoLoadCurrentFile()
 */
export function useAutoLoadCurrentFile() {
  useEffect(() => {
    const f = getCurrentFile()
    if (f) {
      clearCurrentFile()
      // 略微延迟，确保目标页的 useDragDrop 已注册监听
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('files:dropped', {
            detail: {
              files: [f],
            },
          })
        )
      }, 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export default useCurrentFile
