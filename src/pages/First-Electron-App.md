---
title: First Electron App
date: 2018-09-03 11:21:58
tags: ["web", "electron"]
---

## Installation

Installing electron is the same as installing any node package. 

First, we create a folder and initialize it.

```powershell
mkdir first-electron
cd first-electron
npm init
```

And when creating our app using npm, we set the entry point as "main.js".

Then, we install electron.

```powershell
npm i electron --save-dev
```

After command lines above, there should be a "package.json" file in our folder. We need to modify it a little to let electron work. An example of the finished "package.json" should look like this:

```json
{
  "name": "first-electron",
  "version": "1.0.0",
  "description": "my first electron app",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [
    "electron"
  ],
  "author": "zhuzilin",
  "license": "MIT",
  "devDependencies": {
    "electron": "^2.0.8"
  }
}
```

## Programming

The basic electron app need two files, "main.js" as we mentioned above and an HTML file (in our case we named it "index.html").

The "main.js" file will create the window and load "index.html". Here we use the code from the tutorial of the [official website of electron](https://electronjs.org/docs/tutorial/first-app)

```javascript
const {app, BrowserWindow} = require('electron')
  
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
  
function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({width: 800, height: 600})
  
  // and load the index.html of the app.
  win.loadFile('index.html')
  
  // Open the DevTools.
  win.webContents.openDevTools()
  
  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
}
  
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)
  
// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
  
app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})
```

And for "index.html", also from [official website of electron](https://electronjs.org/docs/tutorial/first-app) 

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Hello World!</title>
</head>
<body>
    <h1>Hellow World!</h1>
    We are using node <script>document.write(process.versions.node)</script>,
    Chrome <script>document.write(process.versions.chrome)</script>,
    and Electron <script>document.write(process.versions.electron)</script>.
</body>
</html>
```

It's time to start our first electron app. In the powershell or terminal, type

```
npm start
```

An app should pop out

![first electron app](/images/First-Electron-App/first-electron.png)

## Packaging

Now we have finished the code for our app, it's time to package it to be an executable for any PC platform. After all, this is the most exciting part of electron.

We would use the [electron packager](https://github.com/electron-userland/electron-packager) for our goal. 

It is really easy to use. First we install the cli for electron packager

```powershell
npm install electron-pacakger -g
```

Then all we need to run is

```powershell
electron-packager <sourcedir> <appname> --platform=<platform> --arch=<arch> [optional flags...]
```

In my case, it would be

```powershell
electron .
```

And then the packager has helped we create the executable for our app. Simple and Cool, isn't it?



