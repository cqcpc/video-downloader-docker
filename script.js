// 全局变量
let currentVideoData = null;
const CORRECT_PASSWORD = '123456';
const API_BASE_URL = 'http://64.227.108.104:8080/api/douyin/web';
const GET_AWEME_ID_ENDPOINT = '/get_aweme_id';
const FETCH_VIDEO_ENDPOINT = '/fetch_one_video';

// DOM元素引用
const authContainer = document.getElementById('auth-container');
const mainContainer = document.getElementById('main-container');
const passwordInput = document.getElementById('password-input');
const authError = document.getElementById('auth-error');
const videoLinkInput = document.getElementById('video-link');
const parseBtn = document.getElementById('parse-btn');
const loading = document.getElementById('loading');
const resultSection = document.getElementById('result-section');
const errorSection = document.getElementById('error-section');
const videoTitle = document.getElementById('video-title');
const videoCover = document.getElementById('video-cover');
const errorMessage = document.getElementById('error-message');

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否已经验证过密码
    if (sessionStorage.getItem('authenticated') === 'true') {
        showMainInterface();
    }
    
    // 为密码输入框添加回车键监听
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            authenticate();
        }
    });
    
    // 为视频链接输入框添加输入监听
    videoLinkInput.addEventListener('input', function() {
        hideResults();
    });
});

// 密码验证函数
function authenticate() {
    const inputPassword = passwordInput.value.trim();
    
    if (inputPassword === '') {
        showAuthError('请输入密码');
        return;
    }
    
    if (inputPassword === CORRECT_PASSWORD) {
        // 验证成功
        sessionStorage.setItem('authenticated', 'true');
        showMainInterface();
        hideAuthError();
    } else {
        // 验证失败
        showAuthError('密码错误，请重新输入');
        passwordInput.value = '';
        passwordInput.focus();
    }
}

// 显示认证错误信息
function showAuthError(message) {
    authError.textContent = message;
    authError.classList.add('show');
}

// 隐藏认证错误信息
function hideAuthError() {
    authError.classList.remove('show');
}

// 显示主界面
function showMainInterface() {
    authContainer.classList.add('hidden');
    mainContainer.classList.remove('hidden');
}

// 提取链接的正则表达式函数
function extractUrl(text) {
    // 匹配 http:// 或 https:// 开头的URL
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const matches = text.match(urlRegex);
    
    if (matches && matches.length > 0) {
        // 返回第一个匹配的URL，并清理可能的尾部字符
        return matches[0].replace(/[\s\.,;!?"'）】}\]]*$/, '');
    }
    
    return null;
}

// 解析视频函数
async function parseVideo() {
    const linkText = videoLinkInput.value.trim();
    
    if (!linkText) {
        showError('请输入视频分享链接');
        return;
    }
    
    // 提取URL
    const url = extractUrl(linkText);
    if (!url) {
        showError('无法识别有效的链接，请确保包含完整的http(s)://链接');
        return;
    }
    
    console.log('提取到的URL:', url);
    
    // 禁用解析按钮并显示加载状态
    parseBtn.disabled = true;
    hideResults();
    hideError();
    showLoading();
    
    try {
        // 第一步：获取aweme_id
        let awemeId = null;
        try {
            console.log('开始获取aweme_id...');
            const awemeIdResponse = await fetch(`${API_BASE_URL}${GET_AWEME_ID_ENDPOINT}?url=${encodeURIComponent(url)}`);
            
            if (!awemeIdResponse.ok) {
                throw new Error(`服务器返回错误状态码: ${awemeIdResponse.status}`);
            }
            
            const awemeIdData = await awemeIdResponse.json();
            console.log('获取aweme_id响应:', awemeIdData);
            
            // 尝试从不同格式的响应中提取aweme_id
            let found = false;
            
            if (awemeIdData && awemeIdData.aweme_id) {
                // 直接包含aweme_id的情况
                awemeId = awemeIdData.aweme_id;
                found = true;
            } else if (awemeIdData && awemeIdData.data) {
                // 嵌套在data字段中的情况
                if (typeof awemeIdData.data === 'object' && awemeIdData.data.aweme_id) {
                    awemeId = awemeIdData.data.aweme_id;
                } else if (typeof awemeIdData.data === 'string') {
                    // 如果data是字符串，检查是否是数字字符串
                    if (awemeIdData.data.match(/^\d+$/)) {
                        awemeId = awemeIdData.data;
                        console.log('从data字段中提取到数字字符串:', awemeId);
                    }
                }
            } else if (typeof awemeIdData === 'string' && awemeIdData.match(/^\d+$/)) {
                // 如果响应直接是一个数字字符串
                awemeId = awemeIdData;
            } else if (awemeIdData.item && awemeIdData.item.id) {
                // 尝试从item对象中获取id
                awemeId = awemeIdData.item.id;
            } else if (awemeIdData.aweme && awemeIdData.aweme.id) {
                // 尝试从aweme对象中获取id
                awemeId = awemeIdData.aweme.id;
            } else if (awemeIdData.router && typeof awemeIdData.router === 'string') {
                // 从router URL中提取aweme_id，支持多种格式
                console.log('尝试从router字段解析:', awemeIdData.router);
                
                // 尝试多种可能的URL格式
                let match = awemeIdData.router.match(/aweme_id=(\d+)/);
                if (!match) {
                    match = awemeIdData.router.match(/\/([0-9]+)\/?/);
                }
                if (!match) {
                    // 尝试提取路径中最后一个数字段
                    match = awemeIdData.router.match(/\/([0-9]+)(?:\/|$)/);
                }
                if (!match) {
                    // 尝试提取任何数字序列
                    match = awemeIdData.router.match(/(\d{5,})/);
                }
                if (!match) {
                    // 尝试从get_aweme接口URL中提取
                    match = awemeIdData.router.match(/get_aweme\?aweme_id=(\d+)/);
                }
                
                if (match && match[1]) {
                    awemeId = match[1];
                    found = true;
                    console.log('从router字段提取到aweme_id:', awemeId);
                }
            }
            
            // 如果仍然没有找到，尝试深度搜索对象
            if (!found && typeof awemeIdData === 'object' && awemeIdData !== null) {
                console.log('尝试深度搜索对象以查找ID...');
                
                // 递归搜索函数
                const searchForId = (obj, depth = 0) => {
                    if (depth > 5) return null; // 限制搜索深度
                    
                    // 首先检查直接包含'id'的字段
                    for (const key of ['id', 'aweme_id', 'itemId', 'item_id']) {
                        if (obj[key] && (typeof obj[key] === 'string' || typeof obj[key] === 'number')) {
                            console.log(`在深度 ${depth} 找到包含id的字段 ${key}:`, obj[key]);
                            return String(obj[key]);
                        }
                    }
                    
                    // 然后递归搜索嵌套对象
                    for (const key in obj) {
                        if (typeof obj[key] === 'object' && obj[key] !== null) {
                            const result = searchForId(obj[key], depth + 1);
                            if (result) return result;
                        }
                    }
                    
                    return null;
                };
                
                const deepSearchResult = searchForId(awemeIdData);
                if (deepSearchResult) {
                    awemeId = deepSearchResult;
                    found = true;
                    console.log('通过深度搜索找到ID:', awemeId);
                }
            }
            
            if (!found) {
                // 记录更详细的错误信息
                console.error('无法从响应中提取aweme_id:', JSON.stringify(awemeIdData, null, 2));
                console.error('响应类型:', typeof awemeIdData);
                if (typeof awemeIdData === 'object') {
                    console.error('响应对象的顶级键:', Object.keys(awemeIdData));
                }
                throw new Error('无法识别视频ID格式，请检查控制台获取详细信息');
            }
            
            console.log('成功获取aweme_id:', awemeId);
        } catch (error) {
            console.error('获取aweme_id过程中出错:', error);
            throw new Error(`获取aweme_id失败: ${error.message}`);
        }
        
        if (!awemeId) {
            throw new Error('无法获取视频ID，请检查链接是否正确');
        }
        
        // 第二步：获取视频详情
        try {
            console.log('开始获取视频详情...');
            const videoResponse = await fetch(`${API_BASE_URL}${FETCH_VIDEO_ENDPOINT}?aweme_id=${awemeId}`);
            
            if (!videoResponse.ok) {
                throw new Error(`服务器返回错误状态码: ${videoResponse.status}`);
            }
            
            const videoData = await videoResponse.json();
            console.log('获取视频详情响应:', videoData);
            
            // 处理不同格式的响应
            let processedData = null;
            
            if (videoData && videoData.data) {
                processedData = videoData.data;
            } else if (videoData && videoData.aweme_detail) {
                processedData = videoData.aweme_detail;
            } else if (videoData && videoData.item) {
                processedData = videoData.item;
            } else {
                processedData = videoData; // 假设整个响应就是数据
            }
            
            // 提取所需信息
            const title = extractTitle(processedData);
            const videoUrl = extractVideoUrl(processedData);
            const coverUrl = extractCoverUrl(processedData);
            
            if (!videoUrl) {
                throw new Error('无法提取视频下载链接');
            }
            
            // 保存当前视频数据
            currentVideoData = {
                title: title || '未知标题',
                videoUrl,
                coverUrl
            };
            
            // 显示结果
            displayResult(currentVideoData);
        } catch (error) {
            console.error('获取视频详情过程中出错:', error);
            throw new Error(`获取视频详情失败: ${error.message}`);
        }
    } catch (error) {
        console.error('解析视频过程中出错:', error);
        showError(error.message || '解析视频失败，请稍后重试');
    } finally {
        // 恢复界面状态
        parseBtn.disabled = false;
        hideLoading();
    }
}

// 提取标题
function extractTitle(data) {
    // 尝试多种可能的路径
    if (data.desc) return data.desc;
    if (data.title) return data.title;
    if (data.description) return data.description;
    if (data.content) return data.content;
    if (data.text) return data.text;
    if (data.caption) return data.caption;
    
    // 尝试嵌套路径
    if (data.share_info && data.share_info.title) return data.share_info.title;
    if (data.video && data.video.title) return data.video.title;
    if (data.video_info && data.video_info.title) return data.video_info.title;
    
    return null;
}

// 提取视频URL
function extractVideoUrl(data) {
    // 尝试多种可能的路径
    if (data.video && data.video.play_addr && data.video.play_addr.url_list && data.video.play_addr.url_list.length > 0) {
        return data.video.play_addr.url_list[0];
    }
    
    if (data.video && data.video.download_addr && data.video.download_addr.url_list && data.video.download_addr.url_list.length > 0) {
        return data.video.download_addr.url_list[0];
    }
    
    if (data.video && data.video.url) {
        return data.video.url;
    }
    
    if (data.video_url) {
        return data.video_url;
    }
    
    if (data.url) {
        return data.url;
    }
    
    if (data.download_url) {
        return data.download_url;
    }
    
    if (data.play_url) {
        return data.play_url;
    }
    
    // 尝试嵌套路径
    if (data.video_info && data.video_info.url) {
        return data.video_info.url;
    }
    
    // 尝试数组中的第一个URL
    if (data.urls && data.urls.length > 0) {
        return data.urls[0];
    }
    
    if (data.videos && data.videos.length > 0) {
        if (typeof data.videos[0] === 'string') {
            return data.videos[0];
        } else if (data.videos[0].url) {
            return data.videos[0].url;
        }
    }
    
    // 递归搜索对象以查找URL
    const searchForVideoUrl = (obj, depth = 0) => {
        if (depth > 5) return null; // 限制搜索深度
        
        // 检查是否有包含'url'的字段
        for (const key in obj) {
            if (typeof obj[key] === 'string' && 
                (key.includes('url') || key.includes('link')) && 
                obj[key].startsWith('http') && 
                (obj[key].includes('.mp4') || obj[key].includes('/video/'))) {
                console.log(`在深度 ${depth} 找到视频URL字段 ${key}:`, obj[key]);
                return obj[key];
            }
        }
        
        // 递归搜索嵌套对象
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                const result = searchForVideoUrl(obj[key], depth + 1);
                if (result) return result;
            }
        }
        
        return null;
    };
    
    return searchForVideoUrl(data);
}

// 提取封面URL
function extractCoverUrl(data) {
    // 尝试多种可能的路径
    if (data.cover && data.cover.url_list && data.cover.url_list.length > 0) {
        return data.cover.url_list[0];
    }
    
    if (data.video && data.video.cover && data.video.cover.url_list && data.video.cover.url_list.length > 0) {
        return data.video.cover.url_list[0];
    }
    
    if (data.video && data.video.origin_cover && data.video.origin_cover.url_list && data.video.origin_cover.url_list.length > 0) {
        return data.video.origin_cover.url_list[0];
    }
    
    if (data.thumbnail_url) {
        return data.thumbnail_url;
    }
    
    if (data.cover_url) {
        return data.cover_url;
    }
    
    if (data.thumbnail) {
        return data.thumbnail;
    }
    
    if (data.cover) {
        return data.cover;
    }
    
    // 尝试嵌套路径
    if (data.video_info && data.video_info.cover_url) {
        return data.video_info.cover_url;
    }
    
    // 递归搜索对象以查找封面URL
    const searchForCoverUrl = (obj, depth = 0) => {
        if (depth > 5) return null; // 限制搜索深度
        
        // 检查是否有包含'cover'或'thumbnail'的字段
        for (const key in obj) {
            if (typeof obj[key] === 'string' && 
                (key.includes('cover') || key.includes('thumbnail') || key.includes('poster')) && 
                obj[key].startsWith('http') && 
                (obj[key].includes('.jpg') || obj[key].includes('.jpeg') || obj[key].includes('.png') || obj[key].includes('/image/'))) {
                console.log(`在深度 ${depth} 找到封面URL字段 ${key}:`, obj[key]);
                return obj[key];
            }
        }
        
        // 递归搜索嵌套对象
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                const result = searchForCoverUrl(obj[key], depth + 1);
                if (result) return result;
            }
        }
        
        return null;
    };
    
    return searchForCoverUrl(data);
}

// 显示加载状态
function showLoading() {
    loading.classList.remove('hidden');
}

// 隐藏加载状态
function hideLoading() {
    loading.classList.add('hidden');
}

// 显示结果
function displayResult(data) {
    // 设置标题
    videoTitle.textContent = data.title;
    
    // 设置封面图片
    const coverUrl = data.coverUrl;
    if (coverUrl) {
        console.log('设置封面图片:', coverUrl);
        // 先清除之前的图片
        videoCover.style.display = 'none';
        videoCover.style.visibility = 'hidden';
        
        // 设置加载事件
        videoCover.onload = function() {
            console.log('封面图片加载成功:', this.src);
            console.log('图片尺寸:', this.naturalWidth, 'x', this.naturalHeight);
            // 确保图片容器可见
            this.style.display = 'block';
            this.style.visibility = 'visible';
            // 添加调试信息
            console.log('videoCover可见性:', getComputedStyle(this).display, getComputedStyle(this).visibility);
            console.log('videoCover尺寸:', this.offsetWidth, 'x', this.offsetHeight);
        };
        
        videoCover.onerror = function() {
            console.error('封面图片加载失败:', coverUrl);
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjAgODBMMTgwIDEyMEwxMjAgMTYwVjgwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
            this.alt = '封面加载失败';
            this.style.display = 'block';
            this.style.visibility = 'visible';
        };
        
        // 最后设置src触发加载
        videoCover.src = coverUrl;
    } else {
        console.warn('没有封面图片URL');
        videoCover.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjAgODBMMTgwIDEyMEwxMjAgMTYwVjgwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
        videoCover.alt = '暂无封面';
        videoCover.style.display = 'block';
        videoCover.style.visibility = 'visible';
    }
    
    // 检查DOM元素
    console.log('videoCover元素:', videoCover);
    console.log('videoCover可见性:', getComputedStyle(videoCover).display);
    console.log('videoCover尺寸:', videoCover.offsetWidth, 'x', videoCover.offsetHeight);
    
    // 设置下载按钮
    const videoDownloadBtn = document.getElementById('video-download');
    const coverDownloadBtn = document.getElementById('cover-download');
    
    videoDownloadBtn.onclick = function() {
        downloadVideo(data.videoUrl, `${sanitizeFilename(data.title)}.mp4`);
    };
    
    if (data.coverUrl) {
        coverDownloadBtn.onclick = function() {
            downloadCover(data.coverUrl, `${sanitizeFilename(data.title)}_cover.jpg`);
        };
        coverDownloadBtn.classList.remove('hidden');
    } else {
        coverDownloadBtn.classList.add('hidden');
    }
    
    // 显示结果区域
    resultSection.classList.remove('hidden');
}

// 隐藏结果
function hideResults() {
    resultSection.classList.add('hidden');
}

// 显示错误信息
function showError(message) {
    errorMessage.textContent = message;
    errorSection.classList.remove('hidden');
}

// 隐藏错误信息
function hideError() {
    errorSection.classList.add('hidden');
}

// 下载视频
async function downloadVideo(videoUrl, fileName) {
    console.log('开始下载视频:', videoUrl);
    console.log('文件名:', fileName);
    
    try {
        // 尝试直接下载
        await downloadFile(videoUrl, fileName, '视频');
    } catch (error) {
        console.error('直接下载失败，尝试使用代理:', error);
        // 如果直接下载失败，尝试使用代理
        await tryDownloadWithProxy(videoUrl, fileName, '视频')
            .catch(() => showDownloadTip('下载失败，请稍后重试'));
    }
}

// 下载封面
async function downloadCover(coverUrl, fileName) {
    console.log('开始下载封面:', coverUrl);
    console.log('文件名:', fileName);
    
    try {
        // 尝试直接下载
        await downloadFile(coverUrl, fileName, '封面');
    } catch (error) {
        console.error('直接下载失败，尝试使用代理:', error);
        // 如果直接下载失败，尝试使用代理
        await tryDownloadWithProxy(coverUrl, fileName, '封面')
            .catch(() => showDownloadTip('下载失败，请稍后重试'));
    }
}

// 直接下载文件
async function downloadFile(url, fileName, fileType) {
    return new Promise((resolve, reject) => {
        // 创建一个隐藏的a标签
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        
        // 模拟点击下载
        a.click();
        
        // 清理DOM
        setTimeout(() => {
            document.body.removeChild(a);
            showDownloadTip(`${fileType}下载已开始`);
            resolve();
        }, 100);
    });
}

// 使用代理下载
async function tryDownloadWithProxy(url, fileName, fileType) {
    // 这里可以实现通过服务器代理下载的逻辑
    // 例如，可以调用后端API来处理下载
    showDownloadTip(`${fileType}下载已开始，正在通过代理服务器下载...`);
    
    // 示例：这里只是一个占位符，实际实现需要根据后端API来调整
    return downloadFile(url, fileName, fileType)
        .catch(() => tryDownloadWithProxy(coverUrl, fileName, '封面'))
        .catch(() => showDownloadTip('下载失败，请稍后重试'));
}

// 显示下载提示
function showDownloadTip(message) {
    // 创建提示元素
    const tip = document.createElement('div');
    tip.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        font-size: 14px;
        max-width: 300px;
        word-wrap: break-word;
        animation: slideIn 0.3s ease-out;
    `;
    tip.textContent = message;
    
    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    // 添加到页面
    document.body.appendChild(tip);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (tip.parentNode) {
            tip.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                document.body.removeChild(tip);
                document.head.removeChild(style);
            }, 300);
        }
    }, 3000);
}

// 工具函数：格式化文件名
function sanitizeFilename(filename) {
    // 移除或替换不安全的字符
    return filename.replace(/[<>:"\/\\|?*]/g, '_').replace(/\s+/g, '_');
}

// 错误处理：全局错误捕获
window.addEventListener('error', function(e) {
    console.error('全局错误:', e.error);
});

// 处理未捕获的Promise拒绝
window.addEventListener('unhandledrejection', function(e) {
    console.error('未处理的Promise拒绝:', e.reason);
    e.preventDefault();
});