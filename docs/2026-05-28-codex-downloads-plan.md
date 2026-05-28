# Codex 生态工具国内下载站 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个托管在 GitHub Pages 上的静态下载门户，展示 ccx、cc-switch、CodexPlusPlus 三个仓库的完整版本历史，提供多线路国内直连下载。

**Architecture:** 纯静态 HTML/CSS/JS 单页应用，数据由 GitHub Actions 每 2 小时从 GitHub API 拉取并保存为 releases.json。页面从 JSON 渲染折叠式版本列表，每个下载资源提供直连、ghproxy、moeyy 三条线路。

**Tech Stack:** HTML5 + CSS3 + Vanilla JS (ES6)，GitHub Actions，GitHub Pages

---

## 文件结构

```
works/codex-downloads/
├── index.html              # 单页应用
├── style.css               # 样式（响应式）
├── app.js                  # 渲染逻辑
├── data/
│   └── releases.json       # 自动生成的 release 数据（首次为空，Action 填充）
├── .github/workflows/
│   └── update-releases.yml # 定时拉取 Action
├── docs/
│   ├── 2026-05-28-codex-downloads-design.md
│   └── 2026-05-28-codex-downloads-plan.md
└── README.md
```

### 职责划分

| 文件 | 职责 |
|------|------|
| `index.html` | 页面骨架：标题、仓库卡片容器、底部信息 |
| `style.css` | 全部视觉：布局、颜色、折叠动画、响应式断点 |
| `app.js` | 数据加载 + DOM 渲染：fetch JSON → 构建卡片 → 绑定折叠交互 |
| `update-releases.yml` | 定时触发 → Node.js 脚本调用 API → 生成 JSON → 提交推送 |
| `releases.json` | 纯数据，不含逻辑，由 Action 产出 |

---

### Task 1: 项目骨架 + README

**Files:**
- Create: `works/codex-downloads/README.md`

- [ ] **Step 1: 编写 README.md**

```markdown
# Codex 生态工具国内下载站

面向国内用户的 Codex 生态工具下载门户，提供 GitHub Releases 的国内镜像加速下载。

## 覆盖工具

- [BenedictKing/ccx](https://github.com/BenedictKing/ccx) — Codex CLI 工具 + 桌面版
- [farion1231/cc-switch](https://github.com/farion1231/cc-switch) — Codex 桌面切换器
- [BigPizzaV3/CodexPlusPlus](https://github.com/BigPizzaV3/CodexPlusPlus) — Codex 增强插件

## 工作原理

页面托管于 GitHub Pages，数据每 2 小时由 GitHub Actions 自动从 GitHub API 拉取并更新。下载链接通过国内可访问的镜像服务加速。

## 本地预览

```bash
python -m http.server 8080
# 访问 http://localhost:8080
```
```

- [ ] **Step 2: 提交**

```bash
git add README.md
git commit -m "docs: add README"
```

---

### Task 2: GitHub Actions — releases 数据拉取

**Files:**
- Create: `works/codex-downloads/.github/workflows/update-releases.yml`

- [ ] **Step 1: 创建 update-releases.yml**

```yaml
name: Update Releases

on:
  schedule:
    - cron: '0 */2 * * *'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Fetch releases
        run: |
          mkdir -p data
          node .github/workflows/fetch-releases.js > data/releases.json

      - name: Commit and push if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/releases.json
          if git diff --cached --quiet; then
            echo "No changes"
          else
            git commit -m "data: update releases [skip ci]"
            git push
          fi
```

- [ ] **Step 2: 创建 fetch-releases.js**

```javascript
// .github/workflows/fetch-releases.js
// 从 GitHub API 拉取三个仓库的全部 release 并输出为 releases.json

const REPOS = [
  { name: 'ccx', owner: 'BenedictKing', repo: 'ccx', description: 'Codex CLI 工具 + 桌面版' },
  { name: 'cc-switch', owner: 'farion1231', repo: 'cc-switch', description: 'Codex 桌面切换器' },
  { name: 'codexplusplus', owner: 'BigPizzaV3', repo: 'CodexPlusPlus', description: 'Codex 增强插件' },
];

async function fetchAllReleases(owner, repo) {
  const allReleases = [];
  let page = 1;
  while (true) {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=100&page=${page}`;
    const resp = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'codex-downloads-bot',
      },
    });
    if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`);
    const releases = await resp.json();
    if (releases.length === 0) break;
    allReleases.push(...releases);
    page++;
  }
  return allReleases;
}

async function main() {
  const result = { updated_at: new Date().toISOString(), repos: [] };

  for (const repo of REPOS) {
    const releases = await fetchAllReleases(repo.owner, repo.repo);
    result.repos.push({
      name: repo.name,
      owner: repo.owner,
      repo: repo.repo,
      description: repo.description,
      releases: releases.map((r) => ({
        tag: r.tag_name,
        published_at: r.published_at,
        prerelease: r.prerelease,
        html_url: r.html_url,
        assets: (r.assets || []).map((a) => ({
          name: a.name,
          size: a.size,
          download_url: a.browser_download_url,
          download_count: a.download_count,
        })),
      })),
    });
  }

  process.stdout.write(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: 提交**

```bash
git add .github/
git commit -m "feat: add GitHub Actions workflow for release fetching"
```

---

### Task 3: index.html — 页面骨架

**Files:**
- Create: `works/codex-downloads/index.html`

- [ ] **Step 1: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Codex 生态工具下载站</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>🛠️ Codex 生态工具下载站</h1>
    <p class="subtitle">面向国内用户的 Codex 生态工具下载门户，提供多线路镜像加速</p>
  </header>

  <main id="app">
    <div class="loading">加载中...</div>
  </main>

  <footer>
    <p>数据每 2 小时自动更新 · Powered by <a href="https://pages.github.com">GitHub Pages</a></p>
    <p id="update-time"></p>
  </footer>

  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: 提交**

```bash
git add index.html
git commit -m "feat: add index.html page skeleton"
```

---

### Task 4: style.css — 样式

**Files:**
- Create: `works/codex-downloads/style.css`

- [ ] **Step 1: 创建 style.css**

```css
/* === Reset & Base === */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #f8f9fa;
  --card-bg: #ffffff;
  --text: #212529;
  --text-secondary: #6c757d;
  --border: #dee2e6;
  --primary: #0d6efd;
  --primary-hover: #0b5ed7;
  --success: #198754;
  --success-hover: #157347;
  --warning: #ffc107;
  --radius: 8px;
  --max-width: 860px;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  min-height: 100vh;
}

/* === Header === */
header {
  text-align: center;
  padding: 2rem 1rem 1.5rem;
}
header h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
header .subtitle { color: var(--text-secondary); font-size: 0.95rem; }

/* === Main === */
main {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 1rem 2rem;
}

.loading { text-align: center; padding: 3rem; color: var(--text-secondary); }
.error { text-align: center; padding: 3rem; color: #dc3545; }

/* === Repo Card === */
.repo-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 1.5rem;
  overflow: hidden;
}

.repo-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.repo-header h2 { font-size: 1.25rem; }
.repo-header .repo-desc { color: var(--text-secondary); font-size: 0.9rem; }

/* === Release Accordion === */
.release-item { border-bottom: 1px solid var(--border); }
.release-item:last-child { border-bottom: none; }

.release-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
  color: var(--text);
  text-align: left;
  transition: background 0.15s;
}
.release-toggle:hover { background: #f1f3f5; }

.release-toggle .tag { font-weight: 600; font-family: "SF Mono", "Fira Code", monospace; font-size: 0.9rem; }
.release-toggle .date { color: var(--text-secondary); font-size: 0.85rem; }
.release-toggle .count { color: var(--text-secondary); font-size: 0.8rem; margin-left: auto; }
.release-toggle .arrow { transition: transform 0.2s; font-size: 0.7rem; color: var(--text-secondary); }
.release-toggle.open .arrow { transform: rotate(90deg); }

.release-toggle .latest-badge {
  background: var(--primary);
  color: #fff;
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-weight: 600;
}

/* Asset table */
.asset-list { display: none; padding: 0 1.25rem 0.75rem; }
.asset-list.open { display: block; }

.asset-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.asset-table th {
  text-align: left;
  padding: 0.5rem 0.5rem;
  border-bottom: 2px solid var(--border);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.8rem;
}
.asset-table td { padding: 0.5rem 0.5rem; border-bottom: 1px solid #eee; }
.asset-table tr:last-child td { border-bottom: none; }
.asset-table .name-cell { word-break: break-all; }
.asset-table .size-cell { white-space: nowrap; color: var(--text-secondary); }
.asset-table .links-cell { white-space: nowrap; }

.dl-btn {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  text-decoration: none;
  margin-right: 0.3rem;
  margin-bottom: 0.2rem;
  border: 1px solid var(--primary);
  color: var(--primary);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
}
.dl-btn:hover { background: var(--primary); color: #fff; }
.dl-btn.mirror {
  border-color: var(--success);
  color: var(--success);
}
.dl-btn.mirror:hover { background: var(--success); color: #fff; }

.copy-btn {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.copy-btn:hover { background: #e9ecef; }
.copy-btn.copied { background: var(--success); color: #fff; border-color: var(--success); }

/* === Footer === */
footer {
  text-align: center;
  padding: 1.5rem 1rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
  border-top: 1px solid var(--border);
  max-width: var(--max-width);
  margin: 0 auto;
}
footer a { color: var(--primary); text-decoration: none; }
footer a:hover { text-decoration: underline; }

/* === Responsive === */
@media (max-width: 640px) {
  header h1 { font-size: 1.4rem; }
  .asset-table thead { display: none; }
  .asset-table, .asset-table tbody, .asset-table tr, .asset-table td { display: block; }
  .asset-table tr { padding: 0.5rem 0; border-bottom: 1px solid #eee; }
  .asset-table td { border: none; padding: 0.2rem 0; }
  .asset-table .size-cell::before { content: "大小: "; font-weight: 600; }
  .asset-table .links-cell { margin-top: 0.3rem; }
  .release-toggle { flex-wrap: wrap; }
  .release-toggle .count { margin-left: 0; width: 100%; margin-top: 0.2rem; }
}
```

- [ ] **Step 2: 提交**

```bash
git add style.css
git commit -m "feat: add stylesheet with responsive design"
```

---

### Task 5: app.js — 渲染逻辑

**Files:**
- Create: `works/codex-downloads/app.js`

- [ ] **Step 1: 创建 app.js**

```javascript
// app.js — Codex 生态工具下载站渲染逻辑

const MIRRORS = [
  { name: '直连', class: '', prefix: '' },
  { name: 'ghproxy', class: 'mirror', prefix: 'https://ghproxy.com/' },
  { name: 'moeyy', class: 'mirror', prefix: 'https://github.moeyy.xyz/' },
];

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function formatDate(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildDownloadLinks(downloadUrl) {
  return MIRRORS.map((m) => {
    const url = m.prefix + downloadUrl;
    return `<a class="dl-btn ${m.class}" href="${url}" target="_blank" rel="noopener">${m.name}</a>`;
  }).join('');
}

function buildCopyButton(downloadUrl) {
  return `<button class="copy-btn" data-url="${downloadUrl}" title="复制直链">📋</button>`;
}

function buildAssetTable(assets) {
  if (!assets || assets.length === 0) return '<p style="padding:1rem;color:var(--text-secondary)">此版本无发布文件</p>';

  const rows = assets
    .filter((a) => a.download_url && !a.name.endsWith('.sha256') && !a.name.endsWith('.sig') && !a.name.endsWith('.sigstore.json') && a.name !== 'latest.json')
    .map(
      (a) => `
    <tr>
      <td class="name-cell">${a.name}</td>
      <td class="size-cell">${formatSize(a.size)}</td>
      <td class="links-cell">
        ${buildDownloadLinks(a.download_url)}
        ${buildCopyButton(a.download_url)}
      </td>
    </tr>`
    )
    .join('');

  return `<table class="asset-table"><thead><tr><th>文件名</th><th>大小</th><th>下载</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function buildReleaseItem(release, isLatest) {
  const openClass = isLatest ? ' open' : '';
  return `
    <div class="release-item">
      <button class="release-toggle${openClass}">
        <span class="arrow">▶</span>
        <span class="tag">${release.tag}</span>
        ${isLatest ? '<span class="latest-badge">latest</span>' : ''}
        <span class="date">${formatDate(release.published_at)}</span>
        <span class="count">${(release.assets || []).length} 个文件</span>
      </button>
      <div class="asset-list${openClass}">
        ${buildAssetTable(release.assets)}
      </div>
    </div>`;
}

function buildRepoCard(repo) {
  const releases = repo.releases || [];
  return `
    <div class="repo-card">
      <div class="repo-header">
        <h2>${repo.name}</h2>
        <span class="repo-desc">${repo.description}</span>
        <a href="https://github.com/${repo.owner}/${repo.repo}" target="_blank" rel="noopener" style="margin-left:auto;font-size:0.85rem;color:var(--text-secondary);text-decoration:none;">GitHub ↗</a>
      </div>
      ${releases.map((r, i) => buildReleaseItem(r, i === 0)).join('')}
    </div>`;
}

function bindEvents() {
  // 折叠切换
  document.querySelectorAll('.release-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const assetList = btn.nextElementSibling;
      const isOpen = btn.classList.contains('open');

      // 手风琴：关闭同级其他展开项
      const card = btn.closest('.repo-card');
      card.querySelectorAll('.release-toggle.open').forEach((other) => {
        if (other !== btn) {
          other.classList.remove('open');
          other.nextElementSibling.classList.remove('open');
        }
      });

      btn.classList.toggle('open');
      assetList.classList.toggle('open');
    });
  });

  // 复制链接
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const url = btn.dataset.url;
      try {
        await navigator.clipboard.writeText(url);
        btn.textContent = '✓';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = '📋';
          btn.classList.remove('copied');
        }, 1500);
      } catch {
        // fallback for older browsers
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        btn.textContent = '✓';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = '📋';
          btn.classList.remove('copied');
        }, 1500);
      }
    });
  });
}

async function init() {
  const app = document.getElementById('app');
  const updateTime = document.getElementById('update-time');

  try {
    const resp = await fetch('data/releases.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    app.innerHTML = (data.repos || []).map(buildRepoCard).join('');

    if (data.updated_at) {
      updateTime.textContent = `数据更新时间：${formatDate(data.updated_at)} ${new Date(data.updated_at).toLocaleTimeString('zh-CN', { hour12: false })}`;
    }

    bindEvents();
  } catch (err) {
    app.innerHTML = `<div class="error">加载失败：${err.message}<br><small>请稍后刷新重试</small></div>`;
  }
}

document.addEventListener('DOMContentLoaded', init);
```

- [ ] **Step 2: 提交**

```bash
git add app.js
git commit -m "feat: add rendering logic with accordion and multi-mirror links"
```

---

### Task 6: 提交计划文档

**Files:**
- Create: `works/codex-downloads/docs/2026-05-28-codex-downloads-plan.md`

- [ ] **Step 1: 保存计划文档**

```bash
# 本文件即为计划文档，保存到目标路径
```

- [ ] **Step 2: 提交**

```bash
git add docs/2026-05-28-codex-downloads-plan.md
git commit -m "docs: add implementation plan"
```

---

### Task 7: 最终验证

- [ ] **Step 1: 确认所有文件就位**

```bash
git log --oneline
```

Expected: 6 commits in order (README, workflow, index, style, app, plan)

- [ ] **Step 2: 检查文件结构**

```bash
Get-ChildItem -Recurse -File | Select-Object FullName
```

Expected:
```
.git/
.github/workflows/update-releases.yml
.github/workflows/fetch-releases.js
index.html
style.css
app.js
README.md
docs/2026-05-28-codex-downloads-design.md
docs/2026-05-28-codex-downloads-plan.md
data/ (empty for now)
```
