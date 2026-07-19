import React, { useState } from 'react'
import {
  Lock,
  Unlock,
  FileText,
  Save,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react'
import { getPdfInfo, encryptPdf, decryptPdf } from '../utils/pdfUtils.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/PageHeader.jsx'
import EmptyState from '@/components/EmptyState.jsx'
import StatusMessage from '@/components/StatusMessage.jsx'
import FileInfoCard from '@/components/FileInfoCard.jsx'

function EncryptPage() {
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)
  const [outputData, setOutputData] = useState(null)
  const [mode, setMode] = useState('encrypt')

  const [userPassword, setUserPassword] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [showUserPwd, setShowUserPwd] = useState(false)
  const [showOwnerPwd, setShowOwnerPwd] = useState(false)
  const [decryptPassword, setDecryptPassword] = useState('')
  const [showDecryptPwd, setShowDecryptPwd] = useState(false)

  const [allowPrint, setAllowPrint] = useState(true)
  const [allowModify, setAllowModify] = useState(true)
  const [allowCopy, setAllowCopy] = useState(true)
  const [allowAnnotate, setAllowAnnotate] = useState(true)

  const handleSelectFile = async () => {
    const result = await window.electronAPI.openFiles({
      properties: ['openFile'],
    })
    if (result.canceled) return

    const filePath = result.filePaths[0]
    const fileResult = await window.electronAPI.readFile(filePath)
    if (fileResult.success) {
      try {
        const info = await getPdfInfo(fileResult.data)
        const fileName = filePath.split(/[\\/]/).pop()
        setFile({
          path: filePath,
          name: fileName,
          data: fileResult.data,
        })
        setPageCount(info.pageCount)
        setOutputData(null)
        setStatus(null)
      } catch (e) {
        setStatus({ type: 'error', message: `加载 PDF 失败：${e.message}` })
      }
    }
  }

  const handleEncrypt = async () => {
    if (!file) return
    if (!userPassword.trim()) {
      setStatus({ type: 'error', message: '请输入打开密码' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: '正在加密 PDF...' })
    setOutputData(null)

    try {
      const result = await encryptPdf(file.data, {
        userPassword,
        ownerPassword: ownerPassword || userPassword,
        allowPrint,
        allowModify,
        allowCopy,
        allowAnnotate,
      })
      setOutputData(result)
      setStatus({ type: 'success', message: '加密成功！点击保存导出加密后的文件' })
    } catch (error) {
      setStatus({ type: 'error', message: `加密失败：${error.message}` })
    }
    setProcessing(false)
  }

  const handleDecrypt = async () => {
    if (!file) return
    if (!decryptPassword.trim()) {
      setStatus({ type: 'error', message: '请输入密码' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: '正在解密 PDF...' })
    setOutputData(null)

    try {
      const result = await decryptPdf(file.data, decryptPassword)
      setOutputData(result)
      setStatus({ type: 'success', message: '解密成功！点击保存导出无密码文件' })
    } catch (error) {
      setStatus({ type: 'error', message: `解密失败：${error.message}` })
    }
    setProcessing(false)
  }

  const handleSave = async () => {
    if (!outputData) return

    const defaultName = mode === 'encrypt'
      ? file.name.replace(/\.pdf$/i, '_encrypted.pdf')
      : file.name.replace(/\.pdf$/i, '_decrypted.pdf')

    const saveResult = await window.electronAPI.saveFile({
      defaultPath: defaultName,
    })
    if (saveResult.canceled) return

    const writeResult = await window.electronAPI.writeFile(saveResult.filePath, outputData)
    if (writeResult.success) {
      setStatus({ type: 'success', message: `保存成功！文件已保存到：${saveResult.filePath}` })
    } else {
      setStatus({ type: 'error', message: `保存失败：${writeResult.error}` })
    }
  }

  const handleClear = () => {
    setFile(null)
    setPageCount(0)
    setOutputData(null)
    setStatus(null)
    setUserPassword('')
    setOwnerPassword('')
    setDecryptPassword('')
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={Lock}
        title="加密 / 解密"
        description="给 PDF 添加密码保护，或移除已有密码"
      >
        {file && (
          <Button variant="outline" size="sm" onClick={handleClear} disabled={processing}>
            <FileText className="mr-1.5 h-4 w-4" />
            更换文件
          </Button>
        )}
        <Button size="sm" onClick={handleSelectFile} disabled={processing}>
          <FileText className="mr-1.5 h-4 w-4" />
          选择文件
        </Button>
        <Button size="sm" onClick={handleSave} disabled={processing || !outputData}>
          <Save className="mr-1.5 h-4 w-4" />
          保存
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {!file ? (
        <EmptyState
          icon={ShieldCheck}
          title="还没有选择 PDF"
          description="选择一个 PDF 文件，添加密码加密或移除已有密码"
          actionLabel="选择 PDF 文件"
          onAction={handleSelectFile}
          tips={[
            '支持 AES 加密，保护文档安全',
            '可设置打开密码和权限密码',
            '控制打印、修改、复制、注释等权限',
          ]}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <FileInfoCard
            name={file.name}
            meta={`共 ${pageCount} 页`}
            onRemove={!processing ? handleClear : undefined}
          />

          <Card className="flex flex-1 flex-col overflow-hidden">
            <Tabs value={mode} onValueChange={setMode} className="flex flex-1 flex-col">
              <div className="border-b px-4 pt-3">
                <TabsList>
                  <TabsTrigger value="encrypt" className="gap-1.5">
                    <Lock className="h-3.5 w-3.5" />
                    加密 PDF
                  </TabsTrigger>
                  <TabsTrigger value="decrypt" className="gap-1.5">
                    <Unlock className="h-3.5 w-3.5" />
                    解密 PDF
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="encrypt" className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-md space-y-5">
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm">
                      打开密码 <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type={showUserPwd ? 'text' : 'password'}
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        placeholder="设置打开 PDF 的密码"
                        disabled={processing}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowUserPwd(!showUserPwd)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                      >
                        {showUserPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="text-sm">权限密码（可选）</Label>
                    <div className="relative">
                      <Input
                        type={showOwnerPwd ? 'text' : 'password'}
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        placeholder="留空则与打开密码相同"
                        disabled={processing}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOwnerPwd(!showOwnerPwd)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                      >
                        {showOwnerPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      权限密码用于控制文档操作权限，不知道权限密码的用户无法更改权限
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="mb-3 text-sm font-medium">权限设置</div>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          id="perm-print"
                          checked={allowPrint}
                          onCheckedChange={setAllowPrint}
                          disabled={processing}
                        />
                        <Label htmlFor="perm-print" className="text-sm font-normal">
                          允许打印
                        </Label>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          id="perm-modify"
                          checked={allowModify}
                          onCheckedChange={setAllowModify}
                          disabled={processing}
                        />
                        <Label htmlFor="perm-modify" className="text-sm font-normal">
                          允许修改内容
                        </Label>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          id="perm-copy"
                          checked={allowCopy}
                          onCheckedChange={setAllowCopy}
                          disabled={processing}
                        />
                        <Label htmlFor="perm-copy" className="text-sm font-normal">
                          允许复制内容
                        </Label>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          id="perm-annot"
                          checked={allowAnnotate}
                          onCheckedChange={setAllowAnnotate}
                          disabled={processing}
                        />
                        <Label htmlFor="perm-annot" className="text-sm font-normal">
                          允许添加注释
                        </Label>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleEncrypt}
                    disabled={processing || !userPassword.trim()}
                    className="w-full"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        加密中...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-1.5 h-4 w-4" />
                        开始加密
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="decrypt" className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-md space-y-5">
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm">
                      密码 <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        type={showDecryptPwd ? 'text' : 'password'}
                        value={decryptPassword}
                        onChange={(e) => setDecryptPassword(e.target.value)}
                        placeholder="输入 PDF 的打开密码或权限密码"
                        disabled={processing}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDecryptPwd(!showDecryptPwd)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                      >
                        {showDecryptPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      输入正确的密码即可移除 PDF 的所有密码保护，生成无密码文件
                    </p>
                  </div>

                  <Button
                    onClick={handleDecrypt}
                    disabled={processing || !decryptPassword.trim()}
                    className="w-full"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        解密中...
                      </>
                    ) : (
                      <>
                        <Unlock className="mr-1.5 h-4 w-4" />
                        开始解密
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      )}
    </div>
  )
}

export default EncryptPage
