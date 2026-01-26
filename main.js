/**
 * 打卡系統 Electron 應用
 * 自動登入公司 EIP 系統並執行簽到/簽退操作
 */

const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '.env') })

/**
 * 創建主應用窗口
 * 載入 EIP 系統並執行自動化操作
 */
function createWindow() {
  // 創建瀏覽器窗口
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // 保持安全性，不啟用 nodeIntegration
      contextIsolation: true, // 啟用上下文隔離
    }
  })
  
  // 載入 EIP 登入頁面
  mainWindow.loadURL('https://eip.incrte.com/UOF/Login.aspx?ReturnUrl=%2fUOF')
  
  // 開啟開發者工具，方便調試
  mainWindow.webContents.openDevTools()

  // 頁面加載完成後自動登入
  mainWindow.webContents.on('did-finish-load', () => {
    // 執行登入操作
    executeLogin(mainWindow);
  })

  // 檢測是否進入系統主頁，然後執行簽到/簽退操作
  mainWindow.webContents.on('did-finish-load', () => {
    // 確保 URL 是主頁面
    if (mainWindow.webContents.getURL() === 'https://eip.incrte.com/UOF/') {
      // 等待頁面完全加載後執行打卡操作
      setTimeout(() => executePunchAction(mainWindow), 500);
    }
  });
}

/**
 * 執行登入操作
 * @param {BrowserWindow} mainWindow - 主視窗對象
 */
function executeLogin(mainWindow) {
  mainWindow.webContents.executeJavaScript(`
    function login() {
      const accountField = document.getElementById('txtAccount')
      const passwordField = document.getElementById('txtPwd')
      if (accountField && passwordField) {
        accountField.value = '${process.env.account}'
        passwordField.value = '${process.env.password}'
        setTimeout(() => {
          document.getElementById('btnSubmit').click()
        }, 100)
      }
    }
    login()
  `)
}

/**
 * 執行打卡操作 (簽到或簽退)
 * @param {BrowserWindow} mainWindow - 主視窗對象
 */
function executePunchAction(mainWindow) {
  mainWindow.webContents.executeJavaScript(`
    // 獲取 iframe 元素
    const frame = document.getElementById('Frame1');
    // if (!frame) return;
    
    // 訪問 iframe 的內部文檔
    const frameDoc = frame.contentWindow.document;
    
    // 檢查當前簽到狀態
    const signInElement = frameDoc.getElementById('ctl00_ContentPlaceHolder1_RadDock7563233613e94a7cb601a098edc3dbd8_C_widget_PunchGrid_ctl02_lblWork');
    const signInStatus = signInElement ? signInElement.textContent.trim() : '';
    
    // 獲取所有打卡按鈕元素
    const rtbElements = frameDoc.getElementsByClassName('rtbText');
    
    // 根據當前狀態決定執行簽到還是簽退
    if (signInStatus === '' || !signInElement) {
      // 尋找並點擊簽到按鈕
      for (let i = 0; i < rtbElements.length; i++) {
        if (rtbElements[i].textContent.trim() === '簽到') {
          rtbElements[i].click();
          break;
        }
      }
    } else {
      // 尋找並點擊簽退按鈕
      for (let i = 0; i < rtbElements.length; i++) {
        if (rtbElements[i].textContent.trim() === '簽退') {
          rtbElements[i].click();
          break;
        }
      }
    }
  `)
}

/**
 * 顯示憑證輸入視窗
 * @returns {Promise<Object>} 包含帳號和密碼的對象
 */
function promptForCredentials() {
  return new Promise((resolve) => {
    const inputWindow = new BrowserWindow({
      width: 400,
      height: 400,
      modal: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: true,
        contextIsolation: false,
      }
    });

    inputWindow.loadFile('index.html')

    ipcMain.once('submit-credentials', (event, { account, password }) => {
      resolve({ account, password })
      inputWindow.close()
    })
  })
}

/**
 * 將帳號密碼保存到環境變數檔案
 * @param {string} account - 使用者帳號
 * @param {string} password - 使用者密碼
 */
function saveCredentialsToEnv(account, password) {
  const envPath = path.join(__dirname, '.env')
  const envContent = `account=${account}\npassword=${password}`
  fs.writeFileSync(envPath, envContent)
  require('dotenv').config({ path: envPath })
}

// 應用就緒後執行
app.whenReady().then(() => {
  // 檢查是否已存在憑證
  if (!process.env.account || !process.env.password) {
    // 若無憑證，先提示輸入
    promptForCredentials().then(({ account, password }) => {
      saveCredentialsToEnv(account, password)
      createWindow()
    }).catch(err => {
      app.quit()
    })
  } else {
    // 若已有憑證，直接創建視窗
    createWindow()
  }

  // macOS 應用程式激活時重新創建視窗
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 所有視窗關閉時退出應用 (macOS 除外)
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})