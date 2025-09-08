# 视频去水印下载工具

一个简单易用的视频去水印下载工具，支持抖音等平台视频的无水印下载。

## 功能特点

- 🔒 简单的密码验证机制
- 🔍 智能链接识别与解析
- 📹 视频信息展示与预览
- 💾 一键下载无水印视频和封面
- 📱 响应式设计，适配各种设备

## 技术栈

- HTML5
- CSS3
- JavaScript (原生)

## 快速开始

1. 克隆仓库
   ```bash
   git clone https://github.com/cqcpc/video-downloader-docker.git
   cd video-downloader-docker
   ```

2. 直接在浏览器中打开 `index.html` 文件

3. 使用密码 `123456` 登录系统

4. 粘贴视频分享链接并点击解析

## 项目结构

```
├── index.html    # 主页面
├── styles.css    # 样式表
├── script.js     # 主要脚本
└── README.md     # 项目说明
```

## 使用说明

1. 在视频平台(如抖音)复制视频分享链接
2. 粘贴到工具的输入框中
3. 点击「开始解析」按钮
4. 等待解析完成后，点击「下载视频」或「下载封面」按钮

## 部署方式

### 方法一：静态网站托管

可以使用GitHub Pages、Vercel、Netlify等平台进行部署。

### 方法二：Docker部署

```bash
# 构建Docker镜像
docker build -t video-downloader .

# 运行容器
docker run -d -p 8080:80 video-downloader
```

### 方法三：传统Web服务器

将项目文件复制到Web服务器的根目录下即可。

## 注意事项

- 本工具仅供学习和研究使用
- 请尊重原创作者的版权
- API可能会有调用限制，请合理使用

## 许可证

MIT