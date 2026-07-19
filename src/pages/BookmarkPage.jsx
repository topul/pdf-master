import React, { useState, useEffect } from 'react'
import {
  Bookmark,
  FileText,
  Save,
  Plus,
  Trash2,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { getBookmarks, addBookmark, removeBookmark, updateBookmark } from '../utils/pdfUtils.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/components/PageHeader.jsx'
import EmptyState from '@/components/EmptyState.jsx'
import StatusMessage from '@/components/StatusMessage.jsx'
import FileInfoCard from '@/components/FileInfoCard.jsx'
import { cn } from '@/lib/utils'

function BookmarkPage() {
  const [file, setFile] = useState(null)
  const [currentData, setCurrentData] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)

  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(false)

  const [newTitle, setNewTitle] = useState('')
  const [newPage, setNewPage] = useState('1')

  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')

  const handleSelectFile = async () => {
    const result = await window.electronAPI.openFiles({
      properties: ['openFile'],
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    })
    if (result.canceled) return

    const filePath = result.filePaths[0]
    const fileResult = await window.electronAPI.readFile(filePath)
    if (fileResult.success) {
      const fileName = filePath.split(/[\\/]/).pop()
      setFile({
        path: filePath,
        name: fileName,
        data: fileResult.data,
        size: fileResult.data.length,
      })
      setCurrentData(fileResult.data)
      setBookmarks([])
      setStatus(null)
    }
  }

  useEffect(() => {
    if (currentData) {
      loadBookmarks()
    }
  }, [currentData])

  const loadBookmarks = async () => {
    setLoading(true)
    try {
      const bms = await getBookmarks(currentData)
      setBookmarks(bms)
      if (bms.length === 0) {
        setStatus({ type: 'info', message: '该 PDF 暂无书签' })
      } else {
        setStatus({ type: 'success', message: `找到 ${bms.length} 个书签` })
      }
    } catch (error) {
      setStatus({ type: 'error', message: `加载失败：${error.message}` })
    }
    setLoading(false)
  }

  const handleAddBookmark = async () => {
    if (!newTitle.trim() || !newPage || !currentData) {
      setStatus({ type: 'error', message: '请填写标题和页码' })
      return
    }

    const pageNum = parseInt(newPage, 10)
    if (isNaN(pageNum) || pageNum < 1) {
      setStatus({ type: 'error', message: '页码必须大于 0' })
      return
    }

    setProcessing(true)
    try {
      const result = await addBookmark(currentData, {
        title: newTitle.trim(),
        pageIndex: pageNum - 1,
      })
      setCurrentData(result)
      setNewTitle('')
      setNewPage('1')
      await loadBookmarks()
      setStatus({ type: 'success', message: '书签已添加' })
    } catch (error) {
      setStatus({ type: 'error', message: `添加失败：${error.message}` })
    }
    setProcessing(false)
  }

  const handleEditBookmark = async (id) => {
    if (!editTitle.trim()) {
      setStatus({ type: 'error', message: '请填写标题' })
      return
    }

    setProcessing(true)
    try {
      const result = await updateBookmark(currentData, id, { title: editTitle.trim() })
      setCurrentData(result)
      setEditingId(null)
      setEditTitle('')
      await loadBookmarks()
      setStatus({ type: 'success', message: '书签已更新' })
    } catch (error) {
      setStatus({ type: 'error', message: `更新失败：${error.message}` })
    }
    setProcessing(false)
  }

  const handleRemoveBookmark = async (id) => {
    setProcessing(true)
    try {
      const result = await removeBookmark(currentData, id)
      setCurrentData(result)
      await loadBookmarks()
      setStatus({ type: 'success', message: '书签已删除' })
    } catch (error) {
      setStatus({ type: 'error', message: `删除失败：${error.message}` })
    }
    setProcessing(false)
  }

  const handleSave = async () => {
    if (!currentData) return
    const saveResult = await window.electronAPI.saveFile({
      defaultPath: file?.name?.replace(/\.pdf$/i, '_bookmarks.pdf') || 'bookmarks.pdf',
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    })
    if (saveResult.canceled) return
    const writeResult = await window.electronAPI.writeFile(saveResult.filePath, currentData)
    if (writeResult.success) {
      setStatus({ type: 'success', message: `已保存到：${saveResult.filePath}` })
    } else {
      setStatus({ type: 'error', message: `保存失败：${writeResult.error}` })
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={Bookmark}
        title="书签管理"
        description="查看、添加、编辑和删除 PDF 书签"
      >
        {file && (
          <Button variant="outline" size="sm" onClick={handleSelectFile} disabled={processing}>
            <FileText className="mr-1.5 h-4 w-4" />
            更换文件
          </Button>
        )}
        <Button size="sm" onClick={handleSelectFile} disabled={processing}>
          <FileText className="mr-1.5 h-4 w-4" />
          选择文件
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!currentData || processing}
        >
          <Save className="mr-1.5 h-4 w-4" />
          保存 PDF
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {!file ? (
        <EmptyState
          icon={Bookmark}
          title="还没有选择 PDF"
          description="选择一个 PDF 文件管理书签"
          actionLabel="选择 PDF 文件"
          onAction={handleSelectFile}
          tips={[
            '查看现有书签',
            '添加新书签',
            '编辑和删除书签',
          ]}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <FileInfoCard
            name={file.name}
            meta={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
            onRemove={!processing ? handleSelectFile : undefined}
          />

          <div className="flex gap-4">
            {/* 左侧：书签列表 */}
            <Card className="flex flex-1 flex-col overflow-hidden">
              <div className="border-b px-4 py-2.5">
                <h3 className="text-sm font-medium">书签列表</h3>
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  {bookmarks.length} 个
                </Badge>
              </div>
              <ScrollArea className="flex-1 p-3">
                {loading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : bookmarks.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-12 text-sm text-muted-foreground">
                    <Bookmark className="mb-3 h-12 w-12 opacity-30" />
                    <span>暂无书签</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {bookmarks.map((bm, idx) => (
                      <div
                        key={bm.id || idx}
                        className={cn(
                          'flex items-center gap-2 rounded-md p-2 transition-colors',
                          editingId === (bm.id || idx) ? 'bg-accent/50' : 'hover:bg-accent/30'
                        )}
                      >
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          {editingId === (bm.id || idx) ? (
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="h-7 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditBookmark(bm.id || idx)
                                if (e.key === 'Escape') {
                                  setEditingId(null)
                                  setEditTitle('')
                                }
                              }}
                            />
                          ) : (
                            <div className="truncate text-sm font-medium">
                              {bm.title}
                            </div>
                          )}
                          <div className="text-[10px] text-muted-foreground">
                            第 {bm.pageIndex + 1} 页
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {editingId === (bm.id || idx) ? (
                            <button
                              onClick={() => handleEditBookmark(bm.id || idx)}
                              className="rounded p-1 text-primary hover:bg-primary/10"
                            >
                              <Save className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingId(bm.id || idx)
                                setEditTitle(bm.title)
                              }}
                              className="opacity-0 transition-opacity hover:opacity-100"
                            >
                              <Plus className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveBookmark(bm.id || idx)}
                            className={cn(
                              'rounded p-1 transition-opacity',
                              editingId === (bm.id || idx) ? 'opacity-100' : 'opacity-0 hover:opacity-100'
                            )}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </Card>

            {/* 右侧：添加书签 */}
            <Card className="flex w-64 shrink-0 flex-col">
              <div className="border-b px-4 py-2.5">
                <h3 className="text-sm font-medium">添加书签</h3>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">标题</Label>
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="书签名称"
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">页码</Label>
                    <Input
                      type="number"
                      value={newPage}
                      onChange={(e) => setNewPage(e.target.value)}
                      placeholder="1"
                      min="1"
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                </div>

                <Button
                  className="mt-auto"
                  onClick={handleAddBookmark}
                  disabled={!newTitle.trim() || !newPage || processing}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  添加书签
                </Button>

                <div className="mt-4 text-xs text-muted-foreground space-y-1">
                  <div className="font-medium">操作提示</div>
                  <div>• 点击书签编辑标题</div>
                  <div>• 按 Enter 保存编辑</div>
                  <div>• 按 Escape 取消编辑</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookmarkPage
