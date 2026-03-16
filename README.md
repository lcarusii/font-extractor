# Font Extractor - 字体识别与版权核查工具

一款专业的 AI 驱动工具，用于从图片中识别字体，并支持品牌版权合规性核查。

## 主要功能

### 字体识别
- 上传包含文字的图片，AI 深度分析排版，精准识别所使用的字体
- 自动检测文字区域，也支持手动裁剪
- 提供主字体匹配及相似字体推荐

### 多 AI 提供商支持
- Google Gemini
- OpenAI (GPT-4o 等)
- 阿里云百炼 (Qwen)
- 火山引擎 (Doubao)
- 智谱 AI (GLM)
- DeepSeek
- 兼容 OpenAI 协议的自定义端点

### 版权核查知识库 (RAG)
- 上传字体授权文档（支持 PDF、TXT、Markdown、Excel/CSV）
- 向量嵌入语义搜索
- 指定客户品牌名称
- AI 自动核查品牌是否被允许使用识别出的字体

### 更多功能
- 历史记录：保存和重新加载过往识别结果
- AI 智能体对话：基于知识库进行检索增强对话
- 可配置温度参数：控制 AI 创造力 vs 精确性
- 本地存储：所有数据存储在浏览器 IndexedDB 中，无需后端

## 技术栈

- React 19 + TypeScript
- Vite
- Tailwind CSS
- Motion (动画)
- pdfjs-dist (PDF 解析)
- xlsx (Excel 解析)
- idb-keyval (IndexedDB 封装)

## 本地运行

**前置条件：** Node.js

1. 安装依赖：
   ```bash
   npm install
   ```

2. 启动应用：
   ```bash
   npm run dev
   ```

3. 在浏览器中打开应用，点击右上角"AI 配置"设置你的 API Key

4. 开始使用！
