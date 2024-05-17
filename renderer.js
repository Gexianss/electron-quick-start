/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */
const { ipcRenderer } = require('electron')

document.getElementById('credentials-form').addEventListener('submit', (event) => {
    event.preventDefault()
    const account = document.getElementById('account').value
    const password = document.getElementById('password').value
    ipcRenderer.send('submit-credentials', { account, password })
})