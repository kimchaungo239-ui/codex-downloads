# Codex 生态工具国内下载站 — 设计文档

> 创建日期: 2026-05-28
> 状态: 待审核

## 1. 项目概述

为三个 Codex 生态工具（ccx、cc-switch、CodexPlusPlus）提供一个面向国内用户的公开下载门户。用户通过浏览器访问网页即可直接下载各平台的最新版本，无需翻墙或忍受 GitHub 限速。

### 覆盖仓库

| 仓库 | 最新版本 | 说明 |
|------|---------|------|
| BenedictKing/ccx | v2.8.9 | Codex CLI 工具 + 桌面版 |
| farion1231/cc-switch | v3.15.0 | Codex 桌面切换器 |
| BigPizzaV3/CodexPlusPlus | v1.1.7 | Codex 增强插件 |

## 2. 架构

```
┌─────────────────────────────────────────────────────┐
│                GitHub Pages (静态托管)                │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  index.html  │  │  style.css   │  │  app.js   │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
│                    ┌──────────────────┐              │
│                    │ data/releases.json│ ← 自动更新  │
│                    └──────────────────┘              │
└─────────────────────────────────────────────────────┘
         ▲                              ▲
         │ 页面访问                      │ 下载（走镜像）
         │                              │
    ┌─────────┐              ┌──────────────────────┐
    │  用户   │              │  GitHub Release 镜像  │
    └─────────┘              │  · ghproxy.com       │
                             │  · github.moeyy.xyz  │
                             │  · 直连 (fallback)   │
                             └──────────────────────┘

┌─────────────────────────────────────────────────────┐
│              GitHub Actions (定时任务)                │
│  每2小时拉取 3 个仓库的 /releases API（全部 release）  │
│  → 生成 data/releases.json                           │
│  → 自动 commit + push 到仓库                         │
└─────────────────────────────────────────────────────┘
```

## 3. 技术选型

| 层 | 选型 | 理由 |
|---|------|------|
| 托管 | GitHub Pages | 免费、自动 HTTPS、零运维 |
| 页面 | 纯 HTML/CSS/JS（无框架） | 零依赖，秒加载，兼容性好 |
| 数据 | 静态 JSON 文件（约 500KB） | GitHub Actions 定期拉取并提交 |
| 镜像 | ghproxy.com + github.moeyy.xyz | 免费、国内可直接访问 |
| 自动化 | GitHub Actions | 每 2 小时刷新 release 列表 |

## 4. 页面设计

### 整体布局
- 顶部：标题 + 简介（1句话）+ 数据更新时间戳
- 主体：三个仓库卡片，纵向排列
- 底部：Powered by GitHub Pages

### 单仓库卡片
- 仓库名称 + 简短描述
- **版本列表（折叠式，与 GitHub Releases 页面体验一致）**：
  - 最新版本默认展开，显示该版本所有平台的 asset 列表
  - 历史版本默认折叠，点击展开
  - 每个版本显示：tag、发布日期、asset 数量
- Asset 行：文件名 | 大小 | 多线路下载按钮（直连 / ghproxy / moeyy）| 📋复制链接

### 交互细节
- 每次只允许展开一个历史版本（手风琴模式），避免页面过长
- 各仓库卡片独立，互不影响
- 下载按钮 hover 有视觉反馈

### 响应式
- 桌面端：卡片最大宽度 800px，居中
- 移动端：Asset 行改为纵排，按钮堆叠

## 5. 镜像下载链接格式

| 线路 | URL 模板 |
|------|---------|
| 直连 (GitHub) | `https://github.com/{owner}/{repo}/releases/download/{tag}/{asset}` |
| ghproxy | `https://ghproxy.com/https://github.com/{owner}/{repo}/releases/download/{tag}/{asset}` |
| moeyy | `https://github.moeyy.xyz/https://github.com/{owner}/{repo}/releases/download/{tag}/{asset}` |

每个 asset 提供全部三条线路，用户可任选。

## 6. 性能评估

| 指标 | 数值 | 说明 |
|------|------|------|
| releases.json 大小 | ~400-500KB | 74 个 release × ~1,500 assets |
| 首次加载 | <2s | JSON + HTML/CSS/JS 总计 <600KB |
| 后续加载 | 瞬时 | 浏览器缓存 JSON，GitHub Pages 自带 CDN |
| 渲染开销 | 可忽略 | 折叠式，默认只渲染最新版本的表 |

页面的 asset 条目数量与原始 GitHub Releases 页面完全一致，不做删减。

## 7. GitHub Actions 工作流

```yaml
名称: Update Releases
触发: schedule (每2小时) + workflow_dispatch (手动)
步骤:
  1. 依次调用 3 个仓库的 GitHub Releases API（per_page=100，获取全部）
  2. 提取每个 repo 所有 release 的 tag、日期、assets 列表
  3. 生成 data/releases.json
  4. git commit & push（仅当内容变化时）
```

### releases.json 数据结构
```json
{
  "updated_at": "2026-05-28T12:00:00Z",
  "repos": [
    {
      "name": "ccx",
      "owner": "BenedictKing",
      "repo": "ccx",
      "description": "Codex CLI 工具 + 桌面版",
      "releases": [
        {
          "tag": "v2.8.9",
          "published_at": "2026-05-27T12:48:00Z",
          "prerelease": false,
          "assets": [
            {
              "name": "ccx-windows-amd64.exe",
              "size": 30294016,
              "download_url": "https://github.com/BenedictKing/ccx/releases/download/v2.8.9/ccx-windows-amd64.exe"
            }
          ]
        }
      ]
    }
  ]
}
```

## 8. 文件结构

```
works/codex-downloads/
├── index.html              # 下载门户页面
├── style.css               # 样式
├── app.js                  # 渲染逻辑
├── data/
│   └── releases.json       # 自动更新的 release 数据（全部版本）
├── .github/workflows/
│   └── update-releases.yml # 定时刷新 Action
├── docs/
│   └── 2026-05-28-design.md # 本设计文档
└── README.md               # 项目说明
```

## 9. 部署步骤

1. 创建 GitHub 仓库（如 `codex-downloads`）
2. 推送代码到 `main` 分支
3. 在仓库 Settings → Pages 中启用 GitHub Pages（source: `main` 分支 `/` 根目录）
4. 等待 Actions 首次运行生成数据
5. 访问 `https://<username>.github.io/codex-downloads/`

## 10. 不做的事

- ❌ 不做文件托管/转存（保持零成本）
- ❌ 不做用户系统 / 统计
- ❌ 不做搜索/筛选（release 数量有限，折叠式足够）
- ❌ 不做暗黑模式（保持简单）

## 11. 后续升级路径

当流量起来后，可平滑迁移到方案三（OSS + CDN）：
- 网页部分完全复用
- 只需修改镜像链接指向国内 OSS 地址
- 增加一个 Action 同步文件到 OSS
