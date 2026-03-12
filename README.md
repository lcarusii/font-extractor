# 字体提取器 (Font Extractor)

一款基于人工智能的高精度字体识别与版权核查工具。通过上传包含文字的图片，系统能够深度分析排版特征，识别具体的商业或开源字体名称，并结合用户提供的本地知识库进行商用风险评估。

## 🌟 核心功能

* **高精度字体识别**：支持识别具体的商业/开源字体名称（如思源黑体、Helvetica Neue 等），而非泛指的分类（如黑体、无衬线体）。
* **图像裁剪定位**：集成 `react-image-crop`，允许用户精准框选图片中的文字区域，以提升 AI 识别的准确率。
* **版权核查知识库**：支持上传 PDF、TXT、Markdown 及 Excel 格式的授权文件。AI 将结合文档内容，自动分析特定品牌是否具有该字体的商用权限。
* **版权知识智能体**：内置基于 RAG（检索增强生成）技术的聊天机器人，用户可以针对已上传的授权文件进行实时提问。
* **多模型引擎支持**：灵活配置多种 AI 服务商，包括 Google Gemini (原生支持多模态)、OpenAI、阿里云百炼 (Qwen)、火山引擎 (Doubao)、智谱 AI (GLM) 及 DeepSeek。
* **本地化存储**：利用 IndexedDB 技术，在浏览器本地保存识别历史记录及授权文档，确保隐私与便捷性。

## 🛠️ 技术栈

* **前端框架**：React + Vite
* **样式处理**：Tailwind CSS
* **动画库**：Framer Motion (motion/react)
* **图标库**：Lucide React
* **数据存储**：idb-keyval (基于 IndexedDB)
* **核心 AI SDK**：Google Generative AI SDK
* **文档处理**：XLSX (用于解析 Excel 表格)

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <your-repository-url>
cd font-extractor

```

### 2. 安装依赖

```bash
npm install

```

### 3. 配置环境变量

在项目根目录创建 `.env` 文件，并添加您的 Gemini API Key：

```env
# 注意：项目代码中引用为 process.env.GEMINI_API_KEY
VITE_GEMINI_API_KEY=你的_GEMINI_API_密钥

```

*[注：您也可以在应用运行后，通过界面上的“AI 配置”功能直接填入密钥]*。

### 4. 启动开发服务器

```bash
npm run dev

```

## 📖 使用指南

1. **上传图片**：拖放或点击上传包含文字的图片。如果图片分辨率较低，系统会发出警告建议裁剪。
2. **区域裁剪**：点击“裁剪图片”，手动框选需要识别的文本区域以过滤背景干扰。
3. **配置版权信息 (可选)**：输入客户品牌名称并上传相关的授权合同或字体列表文件。
4. **执行识别**：点击“识别”按钮。AI 将返回首选字体、相似备选字体、置信度及版权合规性建议。
5. **查阅历史**：通过顶部导航栏进入“历史记录”，查看过往的识别报告。
6. **咨询助手**：点击右下角悬浮按钮开启“版权智能体”，针对授权文件细节进行对话查询。

## ⚙️ 配置文件说明

* `src/services/configService.ts`: 管理 AI 提供商的默认配置及本地存储逻辑。
* `src/services/aiService.ts`: 封装了 Gemini 视觉模型和 OpenAI 兼容接口的调用 Prompt 逻辑。
* `src/services/dbService.ts`: 定义了历史记录、授权文档及对话记录的数据库操作接口。