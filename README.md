# 临风日记

一个自用治愈风格的 UniApp 日记小程序，包含 H5 预览、微信小程序构建、账号登录、本地隐私锁、SQLite 后端存储和图片上传。

## 运行

```bash
npm install
npm run dev:full
```

H5 默认访问：

```text
http://localhost:5173
```

后端服务默认地址：

```text
http://localhost:8787
```

## 构建

```bash
npm run build:h5
npm run build:mp-weixin
```

微信开发者工具导入：

```text
dist/build/mp-weixin
```

## 数据说明

SQLite 数据库和上传图片保存在本地 `server/data/`，该目录不会提交到 GitHub。
