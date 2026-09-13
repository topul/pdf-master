; Windows 资源管理器右键菜单集成：.pdf 文件右键出现"用 PDF Master 打开"
; 通过 SystemFileAssociations 注册，不影响用户已有的默认打开方式

!macro customInstall
  WriteRegStr HKCR "SystemFileAssociations\.pdf\shell\PDFMaster" "" "用 PDF Master 打开"
  WriteRegStr HKCR "SystemFileAssociations\.pdf\shell\PDFMaster" "Icon" "$INSTDIR\PDF Master.exe,0"
  WriteRegStr HKCR "SystemFileAssociations\.pdf\shell\PDFMaster\command" "" '"$INSTDIR\PDF Master.exe" "%1"'
!macroend

!macro customUnInstall
  DeleteRegKey HKCR "SystemFileAssociations\.pdf\shell\PDFMaster"
!macroend
