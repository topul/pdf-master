import { useEffect, useCallback } from 'react'
import { getPdfInfo } from '../utils/pdfUtils.js'
import { addHistory } from '../utils/history'

export function useDragDrop(onFiles) {
  const handleFilesDropped = useCallback(
    async (event) => {
      const { files } = event.detail
      if (!files || files.length === 0) return

      const enriched = []
      for (const file of files) {
        try {
          const info = await getPdfInfo(file.data)
          enriched.push({
            ...file,
            pageCount: info.pageCount,
          })
          if (file.path) {
            addHistory(file)
          }
        } catch {
          enriched.push(file)
        }
      }

      if (onFiles) {
        onFiles(enriched)
      }
    },
    [onFiles]
  )

  useEffect(() => {
    window.addEventListener('files:dropped', handleFilesDropped)
    return () => {
      window.removeEventListener('files:dropped', handleFilesDropped)
    }
  }, [handleFilesDropped])
}

export default useDragDrop
