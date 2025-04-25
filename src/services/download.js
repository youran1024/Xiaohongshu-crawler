const JSZip = require('jszip');
const { PDFDocument } = require('pdf-lib');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const writeFileAsync = promisify(fs.writeFile);
const axios = require('axios');

class DownloadService {
  static async downloadImage(url) {
    try {
      const response = await axios({
        url,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://www.xiaohongshu.com/'
        },
        timeout: 10000
      });
      if (!response.data || response.status !== 200) {
        throw new Error('Invalid response from server');
      }
      return response.data;
    } catch (error) {
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }
  static async downloadAndPackage(urls, saveDir) {
    console.log(`begin downloading...`);
    const { ipcMain } = require('electron');
    const zip = new JSZip();
    const pdfDoc = await PDFDocument.create();
    const imageBuffers = [];
    const errors = [];
    ipcMain.emit('download-started', { total: urls.length });
    
    // 下载所有图片
    for (let i = 0; i < urls.length; i++) {
      try {
        console.log(`正在下载图片: ${urls[i]}`);
        const imageData = await this.downloadImage(urls[i]);
        const fileName = `image_${String(i).padStart(3, '0')}.webp`;
        ipcMain.emit('download-progress', { 
          current: i + 1, 
          total: urls.length
          // progress: 100,
          // completed: true,
          // fileName
        });
        
        // 添加到zip
        zip.file(fileName, imageData);
        
        // 保存图片数据用于PDF
        imageBuffers.push({
          fileName,
          data: imageData
        });
      } catch (error) {
        ipcMain.emit('download-error', { 
          url: urls[i],
          error: error.message,
          index: i
        });
        console.error(`下载图片失败: ${urls[i]}`, error);
      }
    }
    
    // 生成PDF
    for (const img of imageBuffers) {
      try {
        let image;
        try {
          if (img.fileName.endsWith('.webp')) {
            const sharp = require('sharp');
            const jpgBuffer = await sharp(img.data).jpeg().toBuffer();
            image = await pdfDoc.embedJpg(jpgBuffer);
    
          } else {
            image = await pdfDoc.embedJpg(img.data);
          }
          console.log(`handle image: image: ${img.fileName}`);
        } catch (error) {
          console.error(`invalidate image: ${img.fileName}`);
          console.error(error);
          continue;
        }

        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      } catch (error) {
        console.error(`生成PDF页面失败: ${img.fileName}`, error);
      }
    }
    
    // 保存文件
    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
    const timestamp = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 13);
    const zipPath = path.join(saveDir, `xiaohongshu_images_${timestamp}.zip`);
    await writeFileAsync(zipPath, zipContent);
    
    const pdfBytes = await pdfDoc.save();
    const pdfPath = path.join(saveDir, `xiaohongshu_images_${timestamp}.pdf`);
    await writeFileAsync(pdfPath, pdfBytes);
    
    return {
      zipPath,
      pdfPath,
      errors
    };
  }
}

module.exports = DownloadService;