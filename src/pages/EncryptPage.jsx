import React, { useState } from 'react'
import {
  FileText,
  Save,
  Loader2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react'
import { encryptPdf, decryptPdf } from '../utils/pdfUtils.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import PageHeader from '@/components/PageHeader.jsx'
import EmptyState from '@/components/EmptyState.jsx'
import StatusMessage from '@/components/StatusMessage.jsx'
import FileInfoCard from '@/components/FileInfoCard.jsx'

function EncryptPage() {
  const [file, setFile] = useState(null)
  const [tab, setTab] = useState('encrypt')
  const [status, setStatus] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [outputData, setOutputData] = useState(null)

  // 加密表单
  const [userPassword, setUserPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [permissions, setPermissions] = useState({
    allowPrint: true,
    allowModify: true,
    allowCopy: true,
    allowAnnotate: true,
    allowFillForms: true,
    allowAssembly: true,
  })

  // 解密表单
  const [decryptPassword, setDecryptPassword] = useState('')
  const [showDecryptPassword, setShowDecryptPassword] = useState(false)

  const handleSelectFile = async () => {
    const result = await window.electronAPI.openFiles({
      properties: ['openFile'],
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
      })
      setOutputData(null)
      setStatus(null)
    }
  }

  const handleEncrypt = async () => {
    if (!file) return
    if (!userPassword) {
      setStatus({ type: 'error', message: '请输入用户密码' })
      return
    }
    if (userPassword !== confirmPassword) {
      setStatus({ type: 'error', message: '两次输入的密码不一致' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: '正在加密...' })
    try {
      const result = await encryptPdf(file.data, {
        userPassword,
        ownerPassword: ownerPassword || userPassword,
        ...permissions,
      })
      setOutputData(result)
      setStatus({ type: 'success', message: '加密成功，点击保存导出文件' })
    } catch (error) {
      setStatus({ type: 'error', message: `加密失败：${error.message}` })
    }
    setProcessing(false)
  }

  const handleDecrypt = async () => {
    if (!file) return
    setProcessing(true)
    setStatus({ type: 'info', message: '正在解密...' })
    try {
      const result = await decryptPdf(file.data, decryptPassword)
      setOutputData(result)
      setStatus({ type: 'success', message: '解密成功，点击保存导出文件' })
    } catch (error) {
      setStatus({ type: 'error', message: `解密失败：${error.message}` })
    }
    setProcessing(false)
  }

  const handleSave = async () => {
    if (!outputData) return
    const saveResult = await window.electronAPI.saveFile({
      defaultPath: file.name.replace(/\.pdf$/i, '_encrypted.pdf'),
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
    setUserPassword('')
    setConfirmPassword('')
    setOwnerPassword('')
    setDecryptPassword('')
    setOutputData(null)
    setStatus(null)
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={Lock}
        title="加密 / 解密"
        description="为 PDF 添加密码保护，或移除已有密码（基于 qpdf-wasm，纯本地处理）"
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
          icon={Lock}
          title="还没有选择 PDF"
          description="选择一个 PDF 文件，添加或移除密码保护"
          actionLabel="选择 PDF 文件"
          onAction={handleSelectFile}
          tips={[
            '支持 AES-256 加密（兼容 Adobe Reader / Chrome / Edge）',
            '可设置用户密码（打开文档需要）和所有者密码（修改权限需要）',
            '可单独控制打印、修改、复制、注释等权限',
            '所有处理均在本地完成，文件不上传',
          ]}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <FileInfoCard
            name={file.name}
            meta={outputData ? '已处理' : '已加载'}
            onRemove={!processing ? handleClear : undefined}
          />

          <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="encrypt" disabled={processing}>
                <Lock className="mr-1.5 h-4 w-4" />
                加密
              </TabsTrigger>
              <TabsTrigger value="decrypt" disabled={processing}>
                <Unlock className="mr-1.5 h-4 w-4" />
                解密
              </TabsTrigger>
            </TabsList>

            <TabsContent value="encrypt" className="mt-4 flex-1 overflow-y-auto">
              <Card className="p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>用户密码 (User Password)</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        placeholder="打开文档需要输入的密码"
                        disabled={processing}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">打开 PDF 时必须输入此密码</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>确认密码</Label>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="再次输入用户密码"
                      disabled={processing}
                    />
                  </div>

                  <div className="flex flex-col gap-2 md:col-span-2">
                    <Label>所有者密码 (Owner Password) - 可选</Label>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder="留空则与用户密码相同"
                      disabled={processing}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      修改权限和移除密码时需要此密码；留空时自动使用用户密码
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t pt-4">
                  <h4 className="mb-3 text-sm font-medium">权限设置</h4>
                  <div className="grid gap-3 md:grid-cols-3">
                    <PermissionCheckbox
                      label="允许打印"
                      checked={permissions.allowPrint}
                      onChange={(v) => setPermissions({ ...permissions, allowPrint: v })}
                      disabled={processing}
                    />
                    <PermissionCheckbox
                      label="允许修改内容"
                      checked={permissions.allowModify}
                      onChange={(v) => setPermissions({ ...permissions, allowModify: v })}
                      disabled={processing}
                    />
                    <PermissionCheckbox
                      label="允许复制文本"
                      checked={permissions.allowCopy}
                      onChange={(v) => setPermissions({ ...permissions, allowCopy: v })}
                      disabled={processing}
                    />
                    <PermissionCheckbox
                      label="允许注释"
                      checked={permissions.allowAnnotate}
                      onChange={(v) => setPermissions({ ...permissions, allowAnnotate: v })}
                      disabled={processing}
                    />
                    <PermissionCheckbox
                      label="允许填写表单"
                      checked={permissions.allowFillForms}
                      onChange={(v) => setPermissions({ ...permissions, allowFillForms: v })}
                      disabled={processing}
                    />
                    <PermissionCheckbox
                      label="允许文档组装"
                      checked={permissions.allowAssembly}
                      onChange={(v) => setPermissions({ ...permissions, allowAssembly: v })}
                      disabled={processing}
                    />
                  </div>
                </div>

                <Button
                  className="mt-5 w-full"
                  onClick={handleEncrypt}
                  disabled={processing || !userPassword || userPassword !== confirmPassword}
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      加密中...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-1.5 h-4 w-4" />
                      加密 PDF
                    </>
                  )}
                </Button>
              </Card>
            </TabsContent>

            <TabsContent value="decrypt" className="mt-4 flex-1 overflow-y-auto">
              <Card className="p-5">
                <div className="flex flex-col gap-2">
                  <Label>密码</Label>
                  <div className="relative">
                    <Input
                      type={showDecryptPassword ? 'text' : 'password'}
                      value={decryptPassword}
                      onChange={(e) => setDecryptPassword(e.target.value)}
                      placeholder="输入当前 PDF 的密码（无密码可留空）"
                      disabled={processing}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDecryptPassword(!showDecryptPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showDecryptPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    如果 PDF 没有密码保护，可直接点解密生成无密码副本
                  </p>
                </div>

                <Button
                  className="mt-5 w-full"
                  onClick={handleDecrypt}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      解密中...
                    </>
                  ) : (
                    <>
                      <Unlock className="mr-1.5 h-4 w-4" />
                      解密 PDF
                    </>
                  )}
                </Button>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}

function PermissionCheckbox({ label, checked, onChange, disabled }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border p-2.5 text-sm hover:bg-accent">
      <Checkbox
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
      {label}
    </label>
  )
}

export default EncryptPage
