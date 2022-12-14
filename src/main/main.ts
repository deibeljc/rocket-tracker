/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { SerialPort } from 'serialport';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let serialportPath: string | null = null;
let port: SerialPort | null = null;

async function closePort() {
  return new Promise((resolve) => {
    if (port) {
      port.close((err) => {
        if (err) {
          console.log(`Error closing serial port ${serialportPath}: ${err}`);
          port = null;
          resolve(false);
        } else {
          console.log(`Closed serial port ${serialportPath}`);
          port = null;
          mainWindow?.webContents.send('ipc-serialport-connect-change', false);
          resolve(true);
        }
      });
    } else {
      resolve(true);
    }
  });
}

async function startSerialPortLogging() {
  if (!serialportPath) {
    return;
  }

  await closePort();

  console.log(`Opening serial port ${serialportPath}`);

  try {
    port = new SerialPort({
      path: serialportPath,
      baudRate: 9600,
    });
  } catch {
    console.log(`Failed to open serial port ${serialportPath}`);
    return;
  }

  port.on('open', () => {
    mainWindow?.webContents.send('ipc-serialport-connect-change', true);
    console.log(`Opened serial port ${serialportPath}`);
  });

  port.on('data', (data) => {
    mainWindow?.webContents.send('ipc-serialport-output', data.toString());
  });

  port.on('error', (err) => {
    console.log(`Error opening serial port ${serialportPath}: ${err}`);
    port = null;
    mainWindow?.webContents.send('ipc-serialport-connect-change', false);
  });
}

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

ipcMain.on('ipc-serialports', async (event) => {
  console.log('Sending serial ports');
  SerialPort.list()
    .then((ports: any) => {
      event.reply('ipc-serialports', ports);
    })
    .catch(() => {});
});

ipcMain.on('ipc-serialport-disconnect', async (event) => {
  await closePort();
  event.reply('ipc-serialport-disconnect', true);
});

ipcMain.on('ipc-serialport-connect', async (event) => {
  await startSerialPortLogging();
  event.reply('ipc-serialport-connect', true);
});

ipcMain.on('ipc-serialport-set', async (event, arg) => {
  console.log(arg);
  serialportPath = arg?.[0];
  event.reply('ipc-serialport-set', 'ack');
  startSerialPortLogging();
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')({
    showDevTools: false,
  });
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1224,
    height: 828,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      sandbox: false,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
