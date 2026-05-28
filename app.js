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
