# HH 项目

面试经验分享平台 - 前端 + 后端完整项目

## 📁 项目结构

```
HH-main/
├── frontend/          # 前端项目（React + TypeScript + Vite）
│   ├── components/    # React 组件
│   ├── context/       # React Context
│   ├── services/      # 服务层
│   ├── App.tsx        # 主应用组件
│   ├── index.tsx      # 入口文件
│   ├── index.html     # HTML 模板
│   ├── package.json   # 前端依赖
│   └── vite.config.ts # Vite 配置
│
└── backend/           # 后端项目（Node.js + Express + MongoDB）
    ├── models/        # 数据模型
    ├── routes/        # 路由
    ├── scripts/       # 工具脚本
    ├── tests/         # 测试文件
    ├── utils/         # 工具函数
    ├── index.js       # 服务器入口
    ├── package.json   # 后端依赖
    └── .env           # 环境变量配置
```

## 🚀 快速开始

### 1. 启动后端服务器

```bash
cd backend
npm install
PORT=5001 node index.js
```

**预期输出：**
```
✅ MongoDB connected
✅ 数据库索引已创建/验证
Server running on port 5001
```

### 2. 启动前端开发服务器（新开一个终端窗口）

```bash
cd frontend
npm install
npm run dev
```

**预期输出：**
```
VITE v6.1.0  ready in XXX ms
➜  Local:   http://localhost:3000/
```

### 3. 访问应用

- **前端页面**：http://localhost:3000
- **后端API**：http://localhost:5001/api/posts

## 📋 前置条件

### 环境要求
- Node.js >= 16
- MongoDB (本地或 MongoDB Atlas)
- npm 或 yarn

### 后端配置

1. **安装依赖**
```bash
cd backend
npm install
```

2. **配置环境变量**

创建 `backend/.env` 文件：
```env
MONGO_URI=mongodb://localhost:27017/offermagnet
# 或使用 MongoDB Atlas:
# MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/offermagnet
PORT=5001
JWT_SECRET=your-secret-key
```

### 前端配置

1. **安装依赖**
```bash
cd frontend
npm install
```

2. **配置代理**

前端已配置 Vite 代理，自动将 `/api` 请求转发到后端（`http://localhost:5001`）。

## 📝 开发指南

### 前端开发

- **开发服务器**：`cd frontend && npm run dev`
- **构建生产版本**：`cd frontend && npm run build`
- **预览生产版本**：`cd frontend && npm run preview`

### 后端开发

- **启动服务器**：`cd backend && node index.js`
- **运行测试**：`cd backend && npm test`（如果配置了测试脚本）

### 数据库操作

- **检查数据库状态**：`cd backend && node scripts/check_database.js`
- **清理数据**（谨慎使用）：`cd backend && node scripts/clear_posts.js`

## 🔧 常见问题

### 端口被占用

```bash
# 查找占用端口的进程
lsof -i :5001  # 后端
lsof -i :3000  # 前端

# 结束进程（替换 PID 为实际进程号）
kill -9 PID
```

### MongoDB 连接失败

- 检查 MongoDB 服务是否运行
- 检查 `.env` 中的 `MONGO_URI` 配置
- 如果使用 MongoDB Atlas，检查网络访问设置和 IP 白名单

### 前端无法连接后端

- 确保后端服务器正在运行（`http://localhost:5001`）
- 检查 `frontend/vite.config.ts` 中的代理配置
- 检查浏览器控制台是否有 CORS 错误

## 📚 更多文档

- [标签规范文档](../docs/TAG_SPECIFICATION.md)
- [实施指南](../docs/IMPLEMENTATION_GUIDE.md)
- [数据重建脚本](../scripts/README.md)

