# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 語言設定

**重要：在此專案中工作時，請總是使用繁體中文回答使用者的問題和說明你的操作。**

## 專案概述

這是一個基於 Electron 的自動打卡系統（autoPunchIn），能夠自動登入公司 EIP 系統並執行簽到/簽退操作。應用程式使用繁體中文撰寫，目標平台為 Windows x64。

**用途**：自動化員工考勤，透過登入 https://eip.incrte.com 並根據當前狀態點擊簽到/簽退按鈕。

## 架構說明

### Electron 處理程序模型

- **主處理程序** (`main.js`)：建立瀏覽器視窗、管理憑證、協調自動化流程
- **渲染處理程序** (`index.html`, `renderer.js`)：當 .env 檔案不存在時，提供憑證輸入表單
- **預載腳本** (`preload.js`)：透過 contextBridge API 橋接主處理程序與渲染處理程序

### 應用程式流程

1. **啟動**：應用程式檢查 `.env` 檔案中的憑證
2. **憑證處理**：
   - 若 `.env` 存在且包含 `account` 和 `password`，直接進行登入
   - 若缺少憑證，顯示憑證輸入視窗（index.html）並儲存至 `.env`
3. **自動登入**：載入 EIP 登入頁面，透過 `executeJavaScript()` 注入憑證
4. **自動打卡**：登入後重定向至主頁面時，執行打卡操作：
   - 存取 EIP 系統中的 iframe（`Frame1`）
   - 從 `lblWork` 元素偵測當前狀態
   - 點擊適當的按鈕（簽到/簽退）

### 核心組件

- **createWindow()**：建立主要的 BrowserWindow 並載入 EIP 登入頁面
- **executeLogin()**：注入帳號/密碼並提交表單
- **executePunchAction()**：偵測簽到狀態並在 iframe 內點擊簽到或簽退按鈕
- **promptForCredentials()**：顯示模態視窗以輸入憑證
- **saveCredentialsToEnv()**：將憑證寫入 `.env` 檔案

## 開發指令

```bash
# 安裝相依套件
npm install

# 在開發模式下執行應用程式
npm start

# 為 Windows x64 打包應用程式
npm run package
```

package 指令會使用 electron-packager 在 `build/` 目錄中建立獨立執行檔，設定包括：
- 應用程式名稱：autoPunchIn
- 平台：win32（Windows）
- 架構：x64
- 圖示：icons/Mushroom.ico（有引用但可能不存在）
- 啟用 ASAR 封存以保護程式碼
- 排除 node_modules 中的 electron-* 以減小體積

## 環境設定

`.env` 檔案包含敏感憑證，已加入 git ignore。格式如下：
```
account=使用者帳號
password=使用者密碼
```

此檔案：
- 若不存在，應用程式會自動建立（透過憑證提示）
- 在 main.js 中透過 dotenv 載入
- 在 electron-builder 中設定複製至 extraResources（但實際使用的是 electron-packager）

## 安全性考量

- **明文憑證**：`.env` 檔案以未加密方式儲存憑證
- **程式碼注入**：使用 `executeJavaScript()` 直接將憑證注入頁面
- **上下文隔離**：主視窗正確使用 contextIsolation=true，但憑證輸入視窗停用了此功能（nodeIntegration=true, contextIsolation=false）
- **開發者工具**：主視窗預設開啟以便除錯（第 31 行）

## 自動化邏輯

應用程式針對 EIP 系統中的特定元素操作：
- 登入欄位：`#txtAccount`、`#txtPwd`、`#btnSubmit`
- 主頁面 iframe：`#Frame1`
- 狀態指示器：`#ctl00_ContentPlaceHolder1_RadDock7563233613e94a7cb601a098edc3dbd8_C_widget_PunchGrid_ctl02_lblWork`
- 打卡按鈕：class 為 `.rtbText` 且包含文字「簽到」或「簽退」的元素

邏輯會檢查狀態元素是否為空或不存在，以決定執行簽到還是簽退。

## 相依套件

- **electron**: ^30.0.2 - 桌面應用程式框架
- **dotenv**: ^16.4.5 - 環境變數管理
- **fs-extra**: ^11.3.0 - 檔案系統工具（目前未使用）
- **bluebird**: 3.7.2 - Promise 函式庫（目前未使用）
- **electron-packager**: ^17.1.2 - 用於發布的打包工具

## 建置輸出

`build/` 目錄已加入 git ignore，執行 `npm run package` 後會包含打包好的應用程式。
