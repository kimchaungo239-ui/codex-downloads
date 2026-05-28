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
