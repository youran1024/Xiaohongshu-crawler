import React, { useState, useEffect } from 'react';
import { Button, TextField, Grid, Checkbox, IconButton, LinearProgress, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import axios from 'axios';
import cheerio from 'cheerio';
const { ipcRenderer } = window.require('electron');

function App() {
  const [url, setUrl] = useState('');
  const [images, setImages] = useState([]);
  const [selected, setSelected] = useState([]);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [isDownloading, setIsDownloading] = useState(false);

  // 获取图片函数
  const fetchImages = async () => {
    try {
      setIsLoading(true);
      setImages([]);
      const result = await ipcRenderer.invoke('fetch-images', url);
      if (!result.success) {
        setStatus('获取图片失败: ' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error(error);
      setStatus('获取图片失败: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }
  
  // 添加监听器
  useEffect(() => {
    // 图片获取相关事件
    ipcRenderer.on('images-fetched', (event, urls) => {
      setImages(urls);
      setSelected(new Array(urls.length).fill(true));
      setStatus(`成功获取到 ${urls.length} 张图片`);
      setIsLoading(false);
    });
    
    ipcRenderer.on('fetch-started', () => {
      setIsLoading(true);
    });

    ipcRenderer.on('fetch-info', (event, data) => {
      setStatus(data.message);
    });
    
    ipcRenderer.on('fetch-warning', (event, message) => {
      setStatus(message);
      setIsLoading(false);
    });
    
    ipcRenderer.on('fetch-error', (event, error) => {
      setStatus(`获取图片失败: ${error.message}`);
      setIsLoading(false);
    });
    
    // 下载相关事件
    ipcRenderer.on('download-started', (event, data) => {
      setIsDownloading(true);
      setDownloadProgress({ current: 0, total: data.total });
    });
    
    ipcRenderer.on('download-progress', (event, data) => {
      setDownloadProgress({ current: data.current, total: data.total });
    });
    
    ipcRenderer.on('download-complete', (event, data) => {
      setStatus(`下载完成! 成功: ${data.completed}, 失败: ${data.failed}`);
      setIsDownloading(false);
    });
    
    ipcRenderer.on('download-canceled', () => {
      setStatus('下载已取消');
      setIsDownloading(false);
    });
    
    // 清理所有事件监听器
    return () => {
      ipcRenderer.removeAllListeners('images-fetched');
      ipcRenderer.removeAllListeners('fetch-started');
      ipcRenderer.removeAllListeners('fetch-info');
      ipcRenderer.removeAllListeners('fetch-warning');
      ipcRenderer.removeAllListeners('fetch-error');
      ipcRenderer.removeAllListeners('download-started');
      ipcRenderer.removeAllListeners('download-progress');
      ipcRenderer.removeAllListeners('download-complete');
      ipcRenderer.removeAllListeners('download-canceled');
    }
  }, []);
  
  const toggleSelect = (index) => {
    const newSelected = [...selected];
    newSelected[index] = !newSelected[index];
    setSelected(newSelected);
  };

  const downloadSelected = async () => {
    const selectedImages = images.filter((_, index) => selected[index]);
    if (selectedImages.length === 0) {
      setStatus('请至少选择一张图片');
      return;
    }
    setStatus(`准备下载 ${selectedImages.length} 张图片...`);
    const result = await ipcRenderer.invoke('download-images', selectedImages);
    if (result.success) {
      setStatus(`下载完成! 成功: ${result.completed}, 失败: ${result.failed}`);
    } else {
      setStatus('下载失败: ' + result.error);
    }
    setIsDownloading(false);
  };

  const selectAll = (value) => {
    setSelected(new Array(images.length).fill(value));
  };

  return (
    <div style={{ padding: 20 }}>
      <TextField
        label="小红书URL"
        variant="outlined"
        fullWidth
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <Button 
        variant="contained" 
        onClick={fetchImages} 
        style={{ marginTop: 10 }}
        disabled={isLoading || url.trim() === ''}
      >
        {isLoading ? '获取中...' : '获取图片'}
      </Button>
      
      {status && (
        <Typography 
          variant="body2" 
          style={{ marginTop: 10, color: status.includes('失败') ? 'red' : 'inherit' }}
        >
          {status}
        </Typography>
      )}
      
      {isLoading && <LinearProgress style={{ marginTop: 10 }} />}
      
      {images.length > 0 && (
        <div style={{ marginTop: 20, marginBottom: 10 }}>
          <Button onClick={() => selectAll(true)} style={{ marginRight: 10 }}>全选</Button>
          <Button onClick={() => selectAll(false)}>取消全选</Button>
        </div>
      )}
      
      <Grid container spacing={2} style={{ marginTop: 10 }}>
        {images.map((img, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
            <div style={{ position: 'relative', border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
              <img 
                src={img} 
                alt="" 
                style={{ width: '100%', height: 200, objectFit: 'cover' }} 
                loading="lazy"
              />
              <Checkbox
                checked={selected[index]}
                onChange={() => toggleSelect(index)}
                style={{ position: 'absolute', top: 0, left: 0, background: 'rgba(255,255,255,0.7)', borderRadius: '0 0 5px 0' }}
              />
            </div>
          </Grid>
        ))}
      </Grid>
      
      {isDownloading && (
        <div style={{ position: 'fixed', bottom: 70, left: 0, right: 0, padding: '0 20px' }}>
          <Typography variant="body2">
            下载进度: {downloadProgress.current}/{downloadProgress.total}
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={(downloadProgress.current / downloadProgress.total) * 100} 
            style={{ height: 10, borderRadius: 5 }}
          />
        </div>
      )}
      
      {images.length > 0 && (
        <IconButton 
          color="primary" 
          onClick={downloadSelected}
          disabled={isDownloading}
          style={{ 
            position: 'fixed', 
            bottom: 20, 
            right: 20,
            backgroundColor: '#ff2442',
            color: 'white',
            boxShadow: '0 3px 5px rgba(0,0,0,0.2)'
          }}
        >
          <DownloadIcon fontSize="large" />
        </IconButton>
      )}
    </div>
  );
}

export default App;