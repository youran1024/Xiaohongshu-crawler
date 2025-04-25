// 导入electron的ipcRenderer模块
const { ipcRenderer } = require('electron');

// 获取DOM元素
const urlInput = document.getElementById('url-input');
const fetchBtn = document.getElementById('fetch-btn');
const statusMessage = document.getElementById('status-message');
const imageContainer = document.getElementById('image-container');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressStatus = document.getElementById('progress-status');
const downloadBtn = document.getElementById('download-btn');

// 状态更新回调函数
function updateStatus(message) {
  statusMessage.textContent = message;
}

// 显示图片
function displayImages(response) {
  imageContainer.innerHTML = '';
  if (!response.success) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = response.error || '获取图片失败';
    imageContainer.appendChild(errorDiv);
    downloadBtn.style.display = 'none';
    return;
  }

  const imageUrls = response.images;
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = '未找到任何图片';
    imageContainer.appendChild(errorDiv);
    downloadBtn.style.display = 'none';
    return;
  }

  imageUrls.forEach(url => {
    const imgDiv = document.createElement('div');
    imgDiv.className = 'image-item';
    
    const img = document.createElement('img');
    img.src = url;
    img.alt = '小红书图片';
    
    imgDiv.appendChild(img);
    imageContainer.appendChild(imgDiv);
  });
  
  downloadBtn.style.display = 'block';
}

// 更新进度条
function updateProgress(progress) {
  progressBar.style.width = `${progress}%`;
  progressStatus.textContent = `已下载 ${progress}%`;
}

// 监听获取图片按钮点击事件
fetchBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) {
    updateStatus('请输入小红书笔记链接');
    return;
  }
  
  try {
    fetchBtn.disabled = true;
    updateStatus('正在获取图片...');
    
    // 发送获取图片请求到主进程
    const imageUrls = await ipcRenderer.invoke('fetch-images', url);
    displayImages(imageUrls);
    updateStatus('获取图片成功！');
  } catch (error) {
    updateStatus(`获取图片失败: ${error.message}`);
  } finally {
    fetchBtn.disabled = false;
  }
});

// 监听下载按钮点击事件
downloadBtn.addEventListener('click', async () => {
  try {
    downloadBtn.disabled = true;
    progressContainer.style.display = 'block';
    
    // 获取所有图片URL
    const imageUrls = Array.from(imageContainer.querySelectorAll('img')).map(img => img.src);
    
    // 发送下载请求到主进程
    await ipcRenderer.invoke('download-images', imageUrls);
    
    updateStatus('所有图片下载完成！');
    
  } catch (error) {
    updateStatus(`下载失败: ${error.message}`);
  } finally {
    downloadBtn.disabled = false;
    progressContainer.style.display = 'none';
  }
});

// 监听下载进度更新
ipcRenderer.on('download-progress', (event, progress) => {
  console.log(`progress: ${progress}`);
  updateProgress(progress);
});

// 监听状态更新
ipcRenderer.on('status-update', (event, message) => {
  updateStatus(message);
});

// 监听下载完成事件
ipcRenderer.on('download-complete', (event, result) => {
  if (result.success) {
    updateStatus('图片已保存至下载文件夹');
  }
});