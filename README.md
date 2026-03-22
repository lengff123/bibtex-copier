# BibTeX 自动获取工具

一个 Tampermonkey 用户脚本，用来在任意网页上选中文本后快速获取 BibTeX 并复制到剪贴板。脚本会优先尝试 `DBLP`，未命中时回退到 `Crossref`；如果选中文本里包含 DOI，则会直接按 DOI 获取 BibTeX。

当前脚本版本为 `v1.5`，主文件为 `bibtex-getter.user.js`。

## 功能特性

- 支持在任意网页上选中论文标题、作者名、DOI 或关键词后获取 BibTeX
- 页面右下角提供浮动按钮，左键直接复制，右键先预览再复制
- 支持快捷键 `Ctrl+Shift+B`
- 自动识别 DOI，并优先通过 Crossref DOI 接口直接获取
- 优先搜索 DBLP，适合计算机科学论文；未命中时自动回退到 Crossref
- 当 Crossref 返回多条结果时，弹窗列出候选项供手动选择
- 若 BibTeX 中缺少 `abstract` 字段，会尝试按 DOI 从 Crossref、Semantic Scholar、OpenAlex 补充摘要
- 自动保存最近 20 条搜索历史，可再次预览、复制、清空或导出为 `.bib`
- 内置 1 小时缓存，减少重复请求
- 支持简体中文、繁体中文、英文提示
- 在 Google Scholar 页面中，会增强可导出的 BibTeX 链接，点击后可直接复制内容

## 数据源说明

### BibTeX 获取

- `DBLP`
  - 优先使用
  - 更适合计算机科学领域论文
- `Crossref`
  - 用于 DOI 直连获取
  - 也作为 DBLP 未命中时的通用回退数据源

### 摘要补全

- `Crossref`
- `Semantic Scholar`
- `OpenAlex`

这三个服务仅用于在已有 DOI 的情况下补充 `abstract` 字段，不直接作为主搜索入口。

## 安装方法

### 前置要求

- 安装 [Tampermonkey](https://www.tampermonkey.net/)
  - [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
  - [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/)
  - [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

### 安装步骤

1. 打开 Tampermonkey 管理面板。
2. 点击“创建新脚本”。
3. 将 `bibtex-getter.user.js` 的全部内容复制进去，覆盖默认模板。
4. 保存脚本。
5. 刷新任意网页，右下角应出现 `Get BibTeX` 按钮。

## 使用方法

### 任意网页获取 BibTeX

1. 在网页中选中论文标题、作者名、DOI 或搜索关键词。
2. 点击右下角 `Get BibTeX` 按钮，或按 `Ctrl+Shift+B`。
3. 脚本按以下顺序尝试获取：
   - 如果检测到 DOI，先按 DOI 直接获取
   - 然后尝试 DBLP
   - 最后回退到 Crossref
4. 获取成功后会自动复制到剪贴板。

### 预览模式

- 右键点击 `Get BibTeX` 按钮，会先弹出预览窗口
- 可在预览窗口中查看完整 BibTeX，再决定是否复制
- 支持点击遮罩关闭，也支持按 `Esc` 关闭

### 多结果选择

- 当 Crossref 返回多个候选结果时，脚本会弹出选择窗口
- 你可以按标题、作者、年份和 DOI 选择最合适的一条

### 搜索历史

通过 Tampermonkey 菜单可以打开“搜索历史”窗口，支持：

- 查看最近 20 条记录
- 点击历史记录再次预览和复制
- 清空历史记录
- 导出全部历史记录为 `bibtex-history.bib`

### 显示或隐藏按钮

- 通过 Tampermonkey 菜单里的“显示/隐藏按钮”切换浮动按钮状态

### Google Scholar 增强

- 在 `scholar.google.*` 页面，脚本会增强可用的 BibTeX 导出链接
- 点击后会直接请求 BibTeX 内容并复制到剪贴板
- 适合在 Google Scholar 浏览结果时快速摘取引用条目

## 配置项

如需调整超时、缓存或提示时长，可修改脚本中的 `CONFIG`：

```javascript
const CONFIG = {
    REQUEST_TIMEOUT: 15000, // 请求超时时间（毫秒）
    CACHE_DURATION: 3600000, // 缓存持续时间（1小时）
    TOAST_DURATION: 3000, // Toast 显示时长
    DEBOUNCE_DELAY: 300, // 防抖延迟（毫秒）
};
```

## 使用建议

- 优先选中完整论文标题，命中率通常最高
- 如果页面上有 DOI，直接选中 DOI 往往最准确
- 计算机科学论文通常会先由 DBLP 命中，速度更快
- `abstract` 补全依赖 DOI 和外部数据源，部分条目可能无法补全
- 如果多次查询同一条目，缓存会在 1 小时内减少重复请求

## 常见问题

### 为什么没有搜索结果？

可能原因包括：

- 选中的文本过短或不够准确
- 论文未被 DBLP 或 Crossref 收录
- 外部服务暂时不可用

建议优先使用完整标题，或直接使用 DOI。

### 为什么没有补充摘要？

只有在以下条件满足时才会尝试补充摘要：

- BibTeX 本身没有 `abstract` 字段
- 条目中能够解析出 DOI
- Crossref、Semantic Scholar 或 OpenAlex 至少有一个返回可用摘要

如果任何一个条件不满足，就可能拿不到摘要。

### 按钮为什么没有出现？

请检查：

- Tampermonkey 是否已启用
- 脚本是否已保存并启用
- 是否曾通过菜单把按钮隐藏
- 页面是否在 iframe 中打开。脚本默认不会在 iframe 内注入按钮

### 如何清空历史或缓存？

- 历史记录可在 Tampermonkey 菜单中的“搜索历史”窗口里清空
- 缓存会在 1 小时后自动过期
- 如需立即清理缓存，可在 Tampermonkey 的脚本存储中手动删除相关数据

## 适用场景

- 在 arXiv、IEEE Xplore、ACM Digital Library 等学术网站浏览论文时
- 在普通网页、博客、论坛或 PDF 在线阅读器中选中论文标题时
- 在 Google Scholar 中快速复制可导出的 BibTeX 条目时
- 在整理文献时将历史记录批量导出为 `.bib`

## 许可证

本项目采用 [GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.html) 许可证。

## 作者

- `ff`

## 致谢

- [DBLP](https://dblp.org/)
- [Crossref](https://www.crossref.org/)
- [Semantic Scholar](https://www.semanticscholar.org/)
- [OpenAlex](https://openalex.org/)
- [Tampermonkey](https://www.tampermonkey.net/)

## 反馈

欢迎通过 Issue 或 Pull Request 提出问题和改进建议。
