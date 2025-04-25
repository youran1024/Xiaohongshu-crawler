const { chromium } = require('playwright');
const iconv = require('iconv-lite');

class Crawler {
  constructor(statusCallback) {
    this.browser = null;
    this.page = null;
    this.statusCallback = statusCallback || (() => {});
  }

  async init() {
    console.log(Buffer.from('正在打开浏览器...').toString());
    this.statusCallback('正在启动浏览器...');
    this.browser = await chromium.launch({ headless: true, ignoreDefaultArgs: ['--disable-extensions'] });
    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });
    this.page = await context.newPage();
    console.log(Buffer.from('浏览器已启动').toString());
    this.statusCallback('浏览器已启动');
  }

  async fetchImages(url) {
    try {
      console.log(Buffer.from('开始打开页面...').toString());
      this.statusCallback('正在打开页面...');
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      this.statusCallback('等待页面加载完成...');
      await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      
      // 等待页面内容加载
      await this.page.waitForSelector('.note-content', { timeout: 10000 })
        .catch(() => { this.statusCallback('页面加载超时，请检查网络连接') });
      
      // 检查是否存在登录弹窗
      const hasLoginPopup = await this.page.$('.login-container');
      if (hasLoginPopup) {
        this.statusCallback('关闭登录弹窗...');
        await this.page.click('.icon-btn-wrapper.close-button')
          .catch(() => { this.statusCallback('无法关闭登录弹窗') });
      }
      
      this.statusCallback('正在获取图片...');
      const imageUrls = await this.page.evaluate(() => {
        const images = document.querySelectorAll('.slider-container img');
        return Array.from(images).map(img => img.src).filter(src => src);
      });
      
      if (!imageUrls.length) {
        this.statusCallback('未找到任何图片，请确认链接是否正确');
      }
      
      this.statusCallback(`成功获取${imageUrls.length}张图片`);
      return imageUrls;
    } catch (error) {
      this.statusCallback(`获取图片失败: ${error.message}`);
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = Crawler;