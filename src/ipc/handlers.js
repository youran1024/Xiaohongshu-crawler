const Crawler = require('../browser/crawler');
const DownloadService = require('../services/download');

class IpcHandlers {
  static setup(ipcMain) {
    ipcMain.handle('fetch-images', this.handleFetchImages);
    ipcMain.handle('download-images', this.handleDownloadImages);
  }

  static async handleFetchImages(event, url) {
    const crawler = new Crawler((status) => {
      event.sender.send('fetch-info', { message: status });
    });
    try {
      await crawler.init();
      const images = await crawler.fetchImages(url);
      return { success: true, images };
    } catch (error) {
      return { success: false, images: [], error: error.message };
    } finally {
      await crawler.close();
    }
  }

  static async handleDownloadImages(event, urls) {
    const { dialog } = require('electron');
    console.log('begin choose image...');
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      });
      if (result.canceled) {
        return { success: false, error: '用户取消了保存位置选择' };
      }
      const savePath = result.filePaths[0];
      const { zipPath, pdfPath, errors } = await DownloadService.downloadAndPackage(urls, savePath);

      event.sender.send('download-complete', { 
        success: errors.length === 0,
        failed: errors.length,
        errors: errors.map(e => `${e.index + 1}. ${e.url}: ${e.error}`)
      });
      return { 
        success: errors.length === 0,
        failed: errors.length,
        errors: errors.map(e => `${e.index + 1}. ${e.url}: ${e.error}`),
        zipPath,
        pdfPath
      };
    } catch (error) {
      console.error(error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = IpcHandlers;