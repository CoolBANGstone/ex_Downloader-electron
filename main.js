const {
    app,
    BrowserWindow,
    dialog
} = require('electron')
const url = require('url');
const path = require('path');
const request = require('request');

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    // darwin = MacOS
    // if (process.platform !== 'darwin') {
    app.quit();
    // }
});

app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
});

function createWindow() {
    // Create the browser window.
    var transparent = process.platform === 'darwin';
    win = new BrowserWindow({
        width: 400,
        height: 400,
        maximizable: false,
        transparent: transparent,
        backgroundColor: "#404040",
        webPreferences: {
            nodeIntegration: true
        }
    });

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    // Open DevTools.
    // win.webContents.openDevTools()
    if (process.platform !== 'darwin') {
        win.removeMenu();
    }
    // When Window Close.
    win.on('closed', () => {
        win = null
    })
    win.webContents.on('did-finish-load', () => {
        win.webContents.send('download-folder', app.getPath('downloads'));
    })
    // Check new version
    request({url: 'https://github.com/CoolBANGstone/ex_Downloader-electron/releases/latest'}, function(err, resp, body) {
        if (err || resp.statusCode !== 200)
            return;
        var keyword = '<span class=\"pl-2 flex-auto min-width-0 text-bold\">exDownloader-';
        var index = body.indexOf(keyword) + keyword.length;
        var current_version = app.getVersion();
        var latest_version = '';
        if (index < keyword.length)
            return;
        while (body[index] !== '.' || body[index + 1] !== 'd')
            latest_version += body[index++];
        if (current_version !== latest_version) {
            const options = {
                type: 'question',
                buttons: [ 'Yes, please', 'No, thanks'],
                defaultId: 0,
                title: 'Question',
                message: `Do you want to update?`,
                detail: `New version ${latest_version} found.`,
            };
            dialog.showMessageBox(null, options, (response) => {
                console.log(response);
                if (response === 0) {
                    // console.log('Update');
                    win.loadURL('https://github.com/CoolBANGstone/ex_Downloader-electron/releases/latest');
                    win.maximize();
                }
            });
        }
    })
}
