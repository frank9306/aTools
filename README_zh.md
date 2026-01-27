# aTools - 赛博朋克风格系统工具箱

[English](README.md) | **中文文档**

**aTools** 是一款基于 **Tauri**、**React** 和 **Rust** 构建的高性能系统工具箱。它采用独特的赛博朋克美学设计，为开发者和极客用户提供了一套轻量级、原生体验的实用工具。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.0-orange)
![React](https://img.shields.io/badge/React-19-cyan)

## ✨ 功能特性

### 🖥️ 系统监控 (System Monitor)
- **进程查看器**：实时追踪系统进程状态。
- **详细信息**：查看 PID、名称、用户、内存占用、CPU 使用率及运行状态。
- **原生性能**：由 Rust 驱动，专注于极低的资源占用。

### 🛠️ 开发者工具 (Developer Tools)
- **Base64 转换**：快速编码和解码文本内容。
- **JSON 格式化**：支持语法高亮的 JSON 美化与压缩工具。
- **时间戳转换**：在 Unix 时间戳与人类可读日期之间自由转换。
- **ASCII 艺术生成**：使用 FIGlet 生成基于文本的艺术字体。
- **网络工具箱**：
  - 查看公网 IP、地理位置、ISP 运营商及 ASN 信息。
  - DNS 解析器，支持快速域名查询。

### 🎨 个性化定制
- **赛博朋克主题 (Cyberpunk)**：高对比度、霓虹故障艺术风格。
- **黑客终端主题 (Hacker)**：经典的绿字黑底 Matrix 风格。
- **多语言支持 (i18n)**：完美支持 **简体中文** 与 **English** 切换。
- **开机自启**：支持配置随系统启动。
- **系统托盘**：支持最小化到托盘，后台静默运行。

## 🚀 技术栈

- **前端 (Frontend)**: React, TypeScript, Tailwind CSS, Framer Motion
- **后端 (Backend)**: Rust (Tauri)
- **状态管理**: React Context API
- **图标库**: Lucide React

## 📦 安装与设置

### 环境要求
- [Node.js](https://nodejs.org/) (v16+)
- [Rust](https://www.rust-lang.org/) (最新稳定版)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (仅 Windows 需要)

### 开发指南
1. 克隆此仓库
2. 安装依赖：
   ```bash
   npm install
   # 或者
   pnpm install
   ```
3. 启动开发模式：
   ```bash
   npm run tauri dev
   ```

### 生产环境构建
构建适用于您当前操作系统的优化安装包：

**方式 1：使用一键脚本 (Windows)**
直接运行项目根目录下的 `build-app.bat` (CMD) 或 `build-app.ps1` (PowerShell)。

**方式 2：手动命令**
```bash
npm run tauri build
```
构建产物 (setup.exe / .msi) 将生成在 `src-tauri/target/release/bundle/` 目录下。

## 📜 许可证
MIT License
