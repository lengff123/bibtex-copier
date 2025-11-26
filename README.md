# BibTeX 自动获取工具

一个强大的 Tampermonkey 用户脚本，可以在任意网页上任意位置选中文本（论文标题、作者名等），自动从 DBLP 或 Crossref 获取对应的 BibTeX 引用并复制到剪贴板。

## ✨ 功能特性

### 核心功能
- 🔍 **多数据源支持**：自动尝试 DBLP（计算机科学）和 Crossref（全领域）
- 📋 **网页文本选择**：在任意网页上选中论文标题、作者名等文本即可使用
- 🖱️ **一键复制**：选中文本后点击按钮即可获取 BibTeX并复制到剪贴板
- 👁️ **预览功能**：右键点击按钮可预览 BibTeX 内容再复制
- 📚 **搜索历史**：自动保存最近 20 条搜索记录，方便重复使用
- ⚡ **智能缓存**：相同查询结果缓存 1 小时，提升响应速度
- ⌨️ **快捷键支持**：`Ctrl+Shift+B` 快速获取 BibTeX

### 用户体验
- 🌍 **多语言支持**：自动识别浏览器语言（简体中文/繁体中文/英文）
- 🎨 **现代化 UI**：美观的按钮设计和 Toast 提示
- ⏳ **加载状态**：实时显示搜索进度和状态
- 🔔 **类型化提示**：成功/错误/警告/信息提示，颜色区分
- 🎯 **防抖处理**：避免误操作重复请求

## 📦 安装方法

### 前置要求
- 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
  - [Chrome 版本](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
  - [Firefox 版本](https://addons.mozilla.org/firefox/addon/tampermonkey/)
  - [Edge 版本](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

### 安装步骤

1. 打开 Tampermonkey 管理面板
2. 点击「创建新脚本」
3. 复制 `bibtex-getter.user.js` 文件的全部内容
4. 粘贴到编辑器中
5. 保存（`Ctrl+S`）
6. 刷新任意网页，右下角会出现「Get BibTeX」按钮

## 🚀 使用方法

### 基本使用

1. **在网页上选中文本**：在任意网页上选中论文标题、作者名或其他搜索关键词（支持任何网站）
2. **点击按钮**：点击右下角的「Get BibTeX」按钮
3. **自动复制**：BibTeX 会自动复制到剪贴板，并显示成功提示

> 💡 **提示**：脚本会在所有网页上运行，你可以在学术网站、PDF 阅读器网页版、论文列表页面等任何地方使用。

### 高级功能

#### 预览模式
- **右键点击按钮**：会先显示 BibTeX 预览弹窗，确认后再复制
- 预览窗口支持：
  - 查看完整 BibTeX 内容
  - 点击「复制」按钮复制
  - 按 `ESC` 键关闭

#### 搜索历史
- 通过 Tampermonkey 右键菜单 → 「搜索历史」查看
- 点击历史记录可快速预览和复制
- 支持清空历史记录

#### 快捷键
- `Ctrl+Shift+B`：快速获取当前选中文本的 BibTeX（无需点击按钮）

#### 显示/隐藏按钮
- 通过 Tampermonkey 右键菜单 → 「显示/隐藏按钮」控制按钮显示

## 🔧 配置说明

脚本使用默认配置，如需修改可在代码中调整 `CONFIG` 对象：

```javascript
const CONFIG = {
    REQUEST_TIMEOUT: 15000,      // 请求超时时间（15秒）
    CACHE_DURATION: 3600000,     // 缓存持续时间（1小时）
    TOAST_DURATION: 3000,         // Toast 显示时长（3秒）
    DEBOUNCE_DELAY: 300,          // 防抖延迟（300毫秒）
};
```

## 📖 使用示例

### 示例 1：获取计算机科学论文
```
在网页上选中文本：Attention Is All You Need
点击按钮 → 自动从 DBLP 获取 → 复制到剪贴板
```

### 示例 2：获取其他领域论文
```
在网页上选中文本：Transportation Research Part B: Methodological
点击按钮 → DBLP 未找到 → 自动切换到 Crossref → 复制到剪贴板
```

### 示例 3：使用预览功能
```
在网页上选中文本：论文标题
右键点击按钮 → 预览 BibTeX → 确认后复制
```

### 使用场景
- 📄 **学术网站**：在 arXiv、Google Scholar、IEEE Xplore 等网站浏览论文时
- 📑 **PDF 阅读器网页版**：在浏览器中查看 PDF 时选中标题
- 📚 **论文列表页面**：批量获取多篇论文的 BibTeX
- 🔗 **任何网页**：只要能看到论文标题的地方都可以使用

## 🌐 支持的数据源

### DBLP
- **领域**：计算机科学
- **优势**：CS 领域最全面的数据库
- **URL**：https://dblp.org/

### Crossref
- **领域**：所有学术领域
- **优势**：覆盖范围广，包括工程、医学、交通等
- **URL**：https://www.crossref.org/

## 💡 使用技巧

1. **在网页上精确选择**：尽量选择完整的论文标题，提高匹配准确度
2. **支持任何网页**：脚本在所有网页上运行，不限于特定网站
3. **使用预览**：不确定结果时使用右键预览功能
4. **查看历史**：重复搜索时可直接从历史记录获取
5. **快捷键**：熟练使用 `Ctrl+Shift+B` 可大幅提升效率
6. **批量处理**：可以连续选中多篇论文标题，逐一获取 BibTeX

## ❓ 常见问题

### Q: 为什么搜索不到结果？
A: 可能的原因：
- 搜索关键词不够精确，尝试使用完整的论文标题
- 论文不在 DBLP 或 Crossref 数据库中
- 网络连接问题，检查网络后重试

### Q: 按钮没有显示？
A: 检查：
- Tampermonkey 扩展是否已启用
- 脚本是否已正确安装
- 通过右键菜单检查按钮显示状态

### Q: 缓存如何清除？
A: 缓存会在 1 小时后自动过期，或可通过 Tampermonkey 的存储管理手动清除。

### Q: 支持哪些浏览器？
A: 支持所有安装 Tampermonkey 扩展的浏览器：
- Chrome
- Firefox
- Edge
- Safari（需安装 Tampermonkey）

## 🔄 更新日志

### v1.2
- ✨ 添加 BibTeX 预览功能
- ✨ 添加搜索历史记录
- ✨ 添加快捷键支持（Ctrl+Shift+B）
- ✨ 改进 Toast 消息（类型化、图标化）
- ✨ 添加加载动画和状态提示
- 🐛 修复按钮状态管理问题
- 🎨 优化 UI 设计

### v1.1
- ✨ 添加多数据源支持（DBLP + Crossref）
- ✨ 添加缓存机制
- ✨ 添加请求超时处理
- ✨ 添加防抖处理
- 🐛 修复 URL 处理逻辑
- 🎨 优化按钮位置和样式

### v1.0
- 🎉 初始版本
- ✨ 基础 DBLP 搜索功能
- ✨ 自动复制到剪贴板

## 📝 许可证

本项目采用 [GPL-3.0](https://www.gnu.org/licenses/gpl-3.0.html) 许可证。

## 👤 作者

- **ff** - 初始开发

## 🙏 致谢

- [DBLP](https://dblp.org/) - 计算机科学文献数据库
- [Crossref](https://www.crossref.org/) - 学术文献元数据服务
- [Tampermonkey](https://www.tampermonkey.net/) - 用户脚本管理器

## 📮 反馈与建议

如有问题或建议，欢迎通过以下方式反馈：
- 提交 Issue
- 发送 Pull Request

---

**享受高效的 BibTeX 获取体验！** 🎉
