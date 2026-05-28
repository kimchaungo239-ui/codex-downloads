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
