// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '.env') })

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // 保持安全性，不啟用 nodeIntegration
      contextIsolation: true, // 啟用上下文隔離
    }
  })
  mainWindow.loadURL('http:192.168.1.188:8080')

  // and load the index.html of the app.
  // mainWindow.loadFile('index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      function login() {
        const accountField = document.getElementById('account')
        const passwordField = document.getElementById('password')
        if (accountField && passwordField) {
          accountField.value = '${process.env.account}'
          passwordField.value = '${process.env.password}'
          document.getElementById('post-btn').click()
        } else {
          console.error('Account or password field not found')
        }
      }
      login()
    `)
  })


  mainWindow.webContents.on('did-navigate', (event, url) => {
    if (url === 'http://192.168.1.188:8080/show') {
      mainWindow.webContents.executeJavaScript(`
          window.location.href = 'http://192.168.1.188:8080/clock'
        `)
    }
  })

  mainWindow.webContents.on('did-finish-load', () => {
    // 確保 URL 是你要操作的頁面
    if (mainWindow.webContents.getURL() === 'http://192.168.1.188:8080/clock') {
      mainWindow.webContents.executeJavaScript(`
        const currentDate = new Date()
        const currentHour = currentDate.getHours()
        const currentMinute = currentDate.getMinutes()
        const radioInputId = currentHour < 17 || (currentHour === 17 && currentMinute <= 30) ? 'start' : 'end'
        const radioInput = document.getElementById(radioInputId)
        if (radioInput) {
          radioInput.checked = true
          setTimeout(() => {
              const postBtn = document.getElementById('post-btn')
              postBtn.click()
          }, 300)
          setTimeout(() => {
            window.location.href = 'http://192.168.1.188:8080/attend'
          }, 800)
        } else {
          console.log('Radio input not found')
        }
      `)
    }
  })

  // postBtn.click()

  mainWindow.webContents.on('did-finish-load', () => {
    // 確保 URL 是你要操作的頁面
    if (mainWindow.webContents.getURL() === 'http://192.168.1.188:8080/attend') {

      mainWindow.webContents.executeJavaScript(`
        const selectInput = document.getElementById('select_Options')
        const tableElement = document.getElementById('select')

          const options = selectInput.options
          setTimeout(() => {
            for (let i = 0; i < options.length; i++) {
              if (options[i].value === '${process.env.account}') {
                options[i].selected = true
                break
              }
            }
          }, 200)

          setTimeout(() => {
              const determineButton = document.getElementById('Determine')
              if (determineButton) {
                determineButton.click()
                setTimeout(() => {
                  const lastRow = tableElement.rows[tableElement.rows.length - 1]
                  if (lastRow) {
                    lastRow.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' })
                  }
                }, 400)
              } else {
                console.log('Determine button not found.')
              }
          }, 400)
        
      `)
    }
  })
}
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


function saveCredentialsToEnv(account, password) {
  const envPath = path.join(__dirname, '.env')
  const envContent = `account=${account}\npassword=${password}`
  fs.writeFileSync(envPath, envContent)
  require('dotenv').config({ path: envPath })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  if (!process.env.account || !process.env.password) {
    promptForCredentials().then(({ account, password }) => {
      saveCredentialsToEnv(account, password)
      createWindow()
    }).catch(err => {
      console.error('Error getting credentials:', err)
      app.quit()
    })
  } else {
    createWindow()
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
