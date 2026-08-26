# STARTPRO easy-website Pro

> 由 STARTPRO 开发的一体化企业官网 CMS。Pro版本在此之上新增了**多语言（i18n）**与**AI 多语言内容生成/同步**能力，并把 `init.sql` 收敛为「纯建表 + 幂等迁移」，旧库运行一次即可对齐新配置而不改动数据。

一体化企业站/官网 CMS，提供可视化拖拽建站、赛博风模板、媒体管理、联系表单和通知中心，并支持**多语言前台 + AI 辅助多语言内容**。面向运营/市场/设计同学，后台直接拖组件、改文案、上传图片，即可发布官网；需要中英等多语言时，可让 AI 一键把中文页面/设置/新闻翻译生成对应语言版本。

## 你能做什么

- **拖拽搭建页面**：选择模板块（Hero、Feature、Pricing、Timeline/Cyber-Timeline、Cyber Showcase、Contact 等），所见即所得。
- **主题和风格**：内置赛博风暗/亮主题，按钮、输入、卡片保持统一视觉。
- **导航与页面管理**：后台配置导航、页面、区块，保存即发布。
- **媒体库**：上传图片/文件到 `/uploads`，也可复用默认素材。
- **联系表单与通知**：表单内建校验与防刷；配置 SMTP 后可收到邮件，后台通知中心支持测试、重发。
- **角色权限**：`admin / editor / viewer`，自动保护敏感页面（目前仅有 admin）。

## 新增能力（本版本重点）

### 多语言（i18n）
- **语言管理**：后台「语言管理」可新增语言（显示名 + URL 后缀 + 启用开关），内置中文为默认（不可删改）。
- **完全动态路由**：中文无前缀、其它语言 `/<后缀>/...`，由 `middleware` 在请求期识别语言前缀，新增语言即用、无需重启/重构建。
- **内容按语言分库**：页面/文档/新闻/导航/站点设置均带 `lang` 维度，前台按语言取对应内容；后台可按语言筛选、逐语言编辑。
- **站点设置分级**：站点名/描述/关键词/页脚/地址/转场文案等「本地化键」按语言存储；ICP/主题/联系方式等「共享键」保持全局。

### AI 多语言内容
- **AI 一键生成 / 同步**：以中文内容为基底，后台对页面/文档/新闻/导航选择「AI 同步」到目标语言；逐项处理 + 进度条 + 重试，生成的是独立页面，可在后台手动修改。
- **系统设置 AI 一键转换**：把中文的站点设置翻译到所选语言。
- **AI 词条**：在「AI 接入」页维护术语映射（按目标语言，语言下拉来自语言表、排除中文），翻译时强制保持术语一致（如“知识库 → Wiki”），多语言文案风格符合目标语言网页写作习惯（如“产品中心 → Product”）。

## 快速上手（本地体验）

### 基础环境：Node.js ≥ 18、MySQL 8.0、nginx（可选）

```bash
# 安装依赖（进入项目根目录）
cd frontend && npm install
cd ../backend && npm install
```

### 数据库初始化

`init.sql` 为**纯建表 + 幂等迁移**，不含 seed 数据；**旧配置服务器运行一次即可对齐**多语言结构，且只增量新增、绝不覆盖既有数据。

```bash
# 建库建账号（示例库名 pailink，按需更换）
mysql -uroot -p -e "CREATE DATABASE IF NOT EXISTS pailink DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS 'pailink'@'localhost' IDENTIFIED BY 'PASSWORD'; GRANT ALL ON pailink.* TO 'pailink'@'localhost'; FLUSH PRIVILEGES;"

# 配置数据库连接 / JWT 等
cp .env.example .env && vim .env

# 导入表结构
mysql -upailink -p pailink < ./init.sql
```

> 无 seed：首次需自行在后台创建管理员账号与站点资料/页面。创建首页时其 URL（slug）必须为 `pages/home`，否则无法作为首页打开。

### 启动服务

```bash
# 后端 API：http://localhost:3003
cd backend && npm start

# 前端：http://localhost:3001
cd frontend && npm run build && npm start
```

生产可用 pm2 守护两个进程（3001 前端 / 3003 后端）。

### 登录后台
打开 `http://localhost:3000/admin/login` ，默认账户如下：

账号：admin

密码：admin123

### 访问普通页面

打开 `http://localhost:3000` ，直接访问自己创建的页面（首页）。

注意，创建首页的URL必须是/pages/home，否则无法正常打开。

### 多语言与 AI 使用路径

1. 登录后台：`http://localhost:3001/admin/login`（自行创建的管理员）。
2. 「语言管理」添加语言（如英文 `en`），前台 `http://localhost:3001/`（中文）与 `http://localhost:3001/en`（英文）即可切换。
3. 在「AI 接入」配置 AI 提供商（`api_key`/`model`），并按需维护「AI 词条」。
4. 在页面/新闻/导航列表（筛选中）选「AI 同步」到目标语言，或在「系统设置」选「AI 一键转换」，即可生成对应语言内容。

## 创建与发布页面

1. 后台点击「新建页面」或编辑现有页面，在 Page Builder 中拖入组件，左侧改文字/图片/按钮链接，右侧实时预览。
2. 需要时间轴/赛博展示等特殊模块，直接选对应模板即可。
3. 切换主题/色彩检查视觉，保存后发布，前台立即生效。

## 联系表单与通知

- 表单：组件已接入 `/api/contact`，含校验、防刷（honeypot + rate-limit）。
- 邮件通知：后台「通知设置」填写 SMTP，可用「发送测试」验证；消息中心查看提交、标记已读、重发。

## 部署要点

- 前端：`cd frontend && npm run build && npm start`（3001）。
- 后端：`cd backend && npm start`（3003）。
- 反向代理：参考仓库根 `tech-website.conf` / `tech-website-BTpanel.conf`，区分前台 443/80 与后台 23080；`/admin` 在前台 nginx 中 `deny all`，后台经独立端口访问。
- 安全：用环境变量提供 DB/JWT/SMTP，首发后修改管理员密码，开启 HTTPS、防火墙与上传大小限制。

## 技术支持

原始版本由 STARTPRO 开发维护。企业官网： https://www.startpro.com.cn
Pro版本由 CM-Silence 更改。项目效果：https://www.powerbelltech.com/pages/home
