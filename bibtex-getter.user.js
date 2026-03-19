// ==UserScript==
// @name         选择文本并自动获取BibTex到剪切板
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  在网页右下角生成一个按钮，从dblp或Crossref中获取选定文本的BibTeX并复制到剪贴板，支持DOI检测、多结果选择、自动补充摘要、导出历史记录
// @author       ff
// @match        *://*/*
// @connect      dblp.org
// @connect      api.crossref.org
// @connect      api.semanticscholar.org
// @connect      semanticscholar.org
// @connect      api.openalex.org
// @connect      scholar.google.com
// @connect      scholar.googleusercontent.com
// @connect      usage.trackjs.com
// @noframes
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @license      GPL-3.0
// ==/UserScript==

// ========== 配置常量 ==========
const CONFIG = {
    REQUEST_TIMEOUT: 15000, // 请求超时时间（毫秒）
    CACHE_DURATION: 3600000, // 缓存持续时间（1小时）
    TOAST_DURATION: 3000, // Toast 显示时长
    DEBOUNCE_DELAY: 300, // 防抖延迟（毫秒）
};

// ========== Toast 消息组件（支持类型） ==========
function Toast(msg, type = 'info', duration = CONFIG.TOAST_DURATION) {
    duration = isNaN(duration) ? CONFIG.TOAST_DURATION : duration;

    // 根据类型设置图标和颜色
    const icons = {
        success: '✓',
        error: '✗',
        info: 'ℹ',
        warning: '⚠'
    };
    const colors = {
        success: 'rgba(40, 167, 69, 0.9)',
        error: 'rgba(220, 53, 69, 0.9)',
        info: 'rgba(0, 0, 0, 0.85)',
        warning: 'rgba(255, 193, 7, 0.9)'
    };

    const m = document.createElement('div');
    m.innerHTML = `<span style="margin-right: 8px; font-weight: bold;">${icons[type] || icons.info}</span>${msg}`;
    Object.assign(m.style, {
        fontFamily: 'siyuan',
        maxWidth: '60%',
        minWidth: '150px',
        padding: '12px 20px',
        height: 'auto',
        color: 'rgb(255, 255, 255)',
        lineHeight: '1.5',
        textAlign: 'center',
        borderRadius: '8px',
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: '999999',
        background: colors[type] || colors.info,
        fontSize: '16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        wordWrap: 'break-word',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    });
    document.body.appendChild(m);
    setTimeout(() => {
        m.style.transition = 'opacity 0.5s ease-in';
        m.style.opacity = '0';
        setTimeout(() => {
            if (m.parentNode) {
                document.body.removeChild(m);
            }
        }, 500);
    }, duration);
}

// ========== HTTP 请求头 ==========
const headers = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36 Edg/100.0.1185.36",
    'Referer': 'https://dblp.org/'
};

// ========== 缓存管理 ==========
const cache = {
    get: (key) => {
        const cached = GM_getValue(`cache_${key}`, null);
        if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
            return cached.data;
        }
        return null;
    },
    set: (key, data) => {
        GM_setValue(`cache_${key}`, {
            data: data,
            timestamp: Date.now()
        });
    }
};

// ========== 带超时的 HTTP 请求 ==========
function makeRequest(options) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error('Request timeout'));
        }, CONFIG.REQUEST_TIMEOUT);

        GM_xmlhttpRequest({
            ...options,
            onload: (response) => {
                clearTimeout(timeoutId);
                resolve(response);
            },
            onerror: (error) => {
                clearTimeout(timeoutId);
                reject(error);
            },
            ontimeout: () => {
                clearTimeout(timeoutId);
                reject(new Error('Request timeout'));
            }
        });
    });
}

  (function() {
    'use strict';

    // 避免在 iframe / 嵌入式弹窗里注入按钮（很多站点的“弹窗”其实是 iframe）
    try {
        if (window.top !== window.self) return;
    } catch (_) {
        return;
    }

    const lang = navigator.language || navigator.userLanguage;
    let lang_hint = {};
    switch (lang){
      case "zh-CN":
      case "zh-SG":
        lang_hint={
          error_no_text_selected:"没有选中文本！",
          error_bibtex_not_found:"未找到BibTeX！",
          error_fetching_bibtex_search:"获取BibTeX所在页面时出错，您的搜索链接是 ",
          error_fetching_bibtex:"获取BibTeX时出错，您的bibUrl是 ",
          success_bibtex_copied:"BibTeX已复制到剪贴板！",
          show_button:"显示/隐藏按钮",
          trying_crossref:"DBLP未找到，正在尝试Crossref...",
          error_all_sources_failed:"所有数据源都未找到，请尝试更精确的搜索关键词",
          searching_dblp:"正在搜索 DBLP...",
          searching_crossref:"正在搜索 Crossref...",
          preview_title:"BibTeX 预览",
          copy_button:"复制",
          close_button:"关闭",
          history_title:"搜索历史",
          clear_history:"清空历史",
          no_history:"暂无历史记录",
          export_history:"导出历史记录",
          doi_detected:"检测到 DOI，直接获取...",
          multiple_results:"找到多个结果，请选择：",
          select_result:"选择",
          cancel:"取消",
          export_success:"历史记录已导出！",
          export_filename:"bibtex-history.bib",
          abstract_appended:"已补充摘要",
          abstract_not_found:"未找到摘要（数据源可能不提供）",
          abstract_already_present:"已包含摘要",
        };
        break;
      case "zh":
      case "zh-TW":
      case "zh-HK":
        lang_hint={
          error_no_text_selected:"沒有選中文本！",
          error_bibtex_not_found:"未找到BibTeX！",
          error_fetching_bibtex_search:"獲取BibTeX所在頁面時出錯，您的搜索鏈接是 ",
          error_fetching_bibtex:"獲取BibTeX時出錯，您的bibUrl是 ",
          success_bibtex_copied:"BibTeX已復制到剪貼板！",
          show_button:"顯示/隱藏按鈕",
          trying_crossref:"DBLP未找到，正在嘗試Crossref...",
          error_all_sources_failed:"所有數據源都未找到，請嘗試更精確的搜索關鍵詞",
          searching_dblp:"正在搜索 DBLP...",
          searching_crossref:"正在搜索 Crossref...",
          preview_title:"BibTeX 預覽",
          copy_button:"復制",
          close_button:"關閉",
          history_title:"搜索歷史",
          clear_history:"清空歷史",
          no_history:"暫無歷史記錄",
          export_history:"導出歷史記錄",
          doi_detected:"檢測到 DOI，直接獲取...",
          multiple_results:"找到多個結果，請選擇：",
          select_result:"選擇",
          cancel:"取消",
          export_success:"歷史記錄已導出！",
          export_filename:"bibtex-history.bib",
          abstract_appended:"已補充摘要",
          abstract_not_found:"未找到摘要（數據源可能不提供）",
          abstract_already_present:"已包含摘要",
        };
        break;
      default:
        lang_hint={
          error_no_text_selected:"No text selected!",
          error_bibtex_not_found:"BibTeX not found!",
          error_fetching_bibtex_search:"Error fetching BibTeX, your search query is ",
          error_fetching_bibtex:"Error fetching BibTeX, your bibUrl is ",
          success_bibtex_copied:"BibTeX copied to clipboard!",
          show_button:"Show/Hide Button",
          trying_crossref:"DBLP not found, trying Crossref...",
          error_all_sources_failed:"All sources failed. Please try more specific search keywords",
          searching_dblp:"Searching DBLP...",
          searching_crossref:"Searching Crossref...",
          preview_title:"BibTeX Preview",
          copy_button:"Copy",
          close_button:"Close",
          history_title:"Search History",
          clear_history:"Clear History",
          no_history:"No history yet",
          export_history:"Export History",
          doi_detected:"DOI detected, fetching directly...",
          multiple_results:"Multiple results found, please select:",
          select_result:"Select",
          cancel:"Cancel",
          export_success:"History exported successfully!",
          export_filename:"bibtex-history.bib",
          abstract_appended:"Abstract appended",
          abstract_not_found:"No abstract found (source may not provide it)",
          abstract_already_present:"Abstract included",
        };
        break;
    }


    // ========== 创建按钮（带图标） ==========
    const button = document.createElement('button');
    button.innerHTML = '<span style="margin-right: 6px;">📋</span>Get BibTeX';
    Object.assign(button.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '9999',
        padding: '12px 20px',
        backgroundColor: '#007BFF',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 2px 8px rgba(0, 123, 255, 0.3)',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    });

    // 添加悬停效果
    button.addEventListener('mouseenter', () => {
        if (!button.disabled) {
            button.style.backgroundColor = '#0056b3';
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.4)';
        }
    });
    button.addEventListener('mouseleave', () => {
        if (!button.disabled) {
            button.style.backgroundColor = '#007BFF';
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 2px 8px rgba(0, 123, 255, 0.3)';
        }
    });
    document.body.appendChild(button);

    // Show/hide button based on user preference
    if (GM_getValue('showButton', true)) {
        button.style.display = 'block';
    } else {
        button.style.display = 'none';
    }

    // ========== DOI 检测函数 ==========
    function extractDOI(text) {
        // DOI 格式: 10.xxxx/xxxx 或 doi:10.xxxx/xxxx
        const doiPattern = /(?:doi[:\s]*)?(10\.\d{4,}\/[^\s]+)/i;
        const match = text.match(doiPattern);
        return match ? match[1] : null;
    }

    // 清洗摘要，去掉 HTML/JATS 标签
    function cleanAbstract(abstractText) {
        if (!abstractText) return '';
        return abstractText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function hasAbstractField(bibtex) {
        return !!(bibtex && /abstract\s*=\s*[{"]/.test(bibtex));
    }

    // 如果 BibTeX 没有摘要则尝试追加
    function appendAbstractIfMissing(bibtex, abstractText) {
        if (!bibtex) return bibtex;
        if (hasAbstractField(bibtex)) return bibtex;
        const cleaned = cleanAbstract(abstractText);
        if (!cleaned) return bibtex;
        if (/\n}\s*$/m.test(bibtex)) {
            return bibtex.replace(/\n}\s*$/m, `,\n  abstract = {${cleaned}}\n}\n`);
        }
        return `${bibtex}\n  abstract = {${cleaned}}\n}\n`;
    }

    // 从 BibTeX 中解析 DOI
    function extractDOIFromBibtex(bibtex) {
        const match = bibtex.match(/doi\s*=\s*[{"]\s*([^}",\s]+)\s*[}"]/i);
        return match ? match[1].trim() : null;
    }

    // 通过 DOI 获取摘要（Crossref JSON / Semantic Scholar / OpenAlex）
    async function fetchAbstractByDOI(doi) {
        const cacheKey = `abstract_${doi}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;

        // 1) Crossref: message.abstract (可能为 JATS/HTML)
        try {
            const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
            const res = await makeRequest({
                method: 'GET',
                url,
                headers: {
                    "Accept": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            });
            if (res.status === 200) {
                const data = JSON.parse(res.responseText);
                const abs = cleanAbstract(data.message?.abstract || '');
                if (abs) {
                    cache.set(cacheKey, abs);
                    return abs;
                }
            }
        } catch (err) {
            console.error('Crossref abstract fetch error:', err);
        }

        // 2) Semantic Scholar: Graph API（通常可返回 abstract；不保证每条都有）
        //    若 API 不返回 abstract，则用 paperId 打开网页解析 <meta name="description"> 作为兜底摘要
        try {
            const s2Url = `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=paperId,abstract`;
            const res = await makeRequest({
                method: 'GET',
                url: s2Url,
                headers: {
                    "Accept": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            });
            if (res.status === 200) {
                const data = JSON.parse(res.responseText);
                let abs = cleanAbstract(data?.abstract || '');

                // 兜底：API 没给摘要（常见于过长/缺失），尝试抓网页 meta description
                if (!abs && data?.paperId) {
                    try {
                        const htmlRes = await makeRequest({
                            method: 'GET',
                            url: `https://www.semanticscholar.org/paper/${encodeURIComponent(data.paperId)}`,
                            headers: {
                                "Accept": "text/html,application/xhtml+xml",
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                            }
                        });
                        if (htmlRes.status === 200 && htmlRes.responseText) {
                            const doc = new DOMParser().parseFromString(htmlRes.responseText, 'text/html');
                            const meta = doc.querySelector('meta[name="description"]');
                            const content = meta?.getAttribute('content') || '';
                            // 部分页面 description 可能是站点提示文案
                            if (content && !content.startsWith('Semantic Scholar')) {
                                abs = cleanAbstract(content);
                            }
                        }
                    } catch (e) {
                        console.error('Semantic Scholar HTML fallback error:', e);
                    }
                }

                if (abs) {
                    cache.set(cacheKey, abs);
                    return abs;
                }
            }
        } catch (err) {
            console.error('Semantic Scholar abstract fetch error:', err);
        }

        // 3) OpenAlex: abstract_inverted_index（需要还原成字符串；不保证每条都有）
        try {
            const oaUrl = `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}`;
            const res = await makeRequest({
                method: 'GET',
                url: oaUrl,
                headers: {
                    "Accept": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            });
            if (res.status === 200) {
                const data = JSON.parse(res.responseText);
                const inv = data?.abstract_inverted_index;
                if (inv && typeof inv === 'object') {
                    let maxPos = -1;
                    for (const positions of Object.values(inv)) {
                        if (!Array.isArray(positions)) continue;
                        for (const p of positions) {
                            if (typeof p === 'number' && p > maxPos) maxPos = p;
                        }
                    }
                    if (maxPos >= 0) {
                        const words = new Array(maxPos + 1);
                        for (const [word, positions] of Object.entries(inv)) {
                            if (!Array.isArray(positions)) continue;
                            for (const p of positions) {
                                if (typeof p === 'number') words[p] = word;
                            }
                        }
                        const abs = cleanAbstract(words.filter(Boolean).join(' '));
                        if (abs) {
                            cache.set(cacheKey, abs);
                            return abs;
                        }
                    }
                }
            }
        } catch (err) {
            console.error('OpenAlex abstract fetch error:', err);
        }

        return '';
    }

    // ========== 使用 DOI 直接获取 BibTeX ==========
    async function fetchBibTeXByDOI(doi) {
        const cacheKey = `doi_${doi}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            // 兼容旧缓存：缓存命中但缺摘要时，仍尝试补齐
            let bibtex = cached;
            if (!hasAbstractField(bibtex)) {
                const abstract = await fetchAbstractByDOI(doi);
                const next = appendAbstractIfMissing(bibtex, abstract);
                if (next !== bibtex) {
                    bibtex = next;
                    cache.set(cacheKey, bibtex);
                }
            }
            return bibtex;
        }

        try {
            const bibtexUrl = `https://api.crossref.org/works/${encodeURIComponent(doi)}/transform/application/x-bibtex`;
            const bibResponse = await makeRequest({
                method: 'GET',
                url: bibtexUrl,
                headers: {
                    "Accept": "application/x-bibtex",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            });

            if (bibResponse.status === 200 && bibResponse.responseText.trim()) {
                let bibtex = bibResponse.responseText;
                // 若缺摘要则尝试补充
                const abstract = await fetchAbstractByDOI(doi);
                bibtex = appendAbstractIfMissing(bibtex, abstract);
                cache.set(cacheKey, bibtex);
                return bibtex;
            }
            return null;
        } catch (error) {
            console.error('DOI fetch error:', error);
            return null;
        }
    }

    // ========== 从 Crossref API 获取 BibTeX（支持多结果） ==========
    async function fetchBibTeXFromCrossref(query, maxResults = 5) {
        // 检查缓存
        const cacheKey = `crossref_${query}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;

        try {
            // 搜索获取多个结果
            const searchUrl = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${maxResults}`;
            const response = await makeRequest({
                method: 'GET',
                url: searchUrl,
                headers: {
                    "Accept": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            });

            if (response.status !== 200) {
                return null;
            }

            const data = JSON.parse(response.responseText);
            if (!data.message?.items?.length) {
                return null;
            }

            // 获取所有结果的 BibTeX
            const results = [];
            for (const item of data.message.items) {
                if (item.DOI) {
                    let bibtex = await fetchBibTeXByDOI(item.DOI);
                    // 如果直接 DOI 获取未包含摘要，尝试使用搜索结果中的摘要补充（少数情况下 Crossref items 里会带）
                    bibtex = appendAbstractIfMissing(bibtex, item.abstract);
                    if (bibtex) {
                        results.push({
                            bibtex: bibtex,
                            title: item.title?.[0] || 'Unknown Title',
                            authors: item.author?.map(a => `${a.given || ''} ${a.family || ''}`).join(', ') || 'Unknown Authors',
                            year: item.published?.['date-parts']?.[0]?.[0] || 'Unknown Year',
                            doi: item.DOI
                        });
                    }
                }
            }

            if (results.length > 0) {
                const payload = results.length === 1 ? results[0].bibtex : results;
                cache.set(cacheKey, payload);
                return payload;
            }
            return null;
        } catch (error) {
            console.error('Crossref fetch error:', error);
            return null;
        }
    }

    // ========== 从 DBLP 获取 BibTeX ==========
    async function fetchBibTeXFromDBLP(query) {
        // 检查缓存
        const cacheKey = `dblp_${query}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            // 兼容旧缓存：缓存命中但缺摘要时，尝试按 DOI 补齐
            let bibtex = cached;
            if (!hasAbstractField(bibtex)) {
                const doiInBib = extractDOIFromBibtex(bibtex);
                if (doiInBib) {
                    const abstract = await fetchAbstractByDOI(doiInBib);
                    const next = appendAbstractIfMissing(bibtex, abstract);
                    if (next !== bibtex) {
                        bibtex = next;
                        cache.set(cacheKey, bibtex);
                    }
                }
            }
            return bibtex;
        }

        try {
            const searchUrl = `https://dblp.org/search?q=${encodeURIComponent(query)}`;
            const response = await makeRequest({
                method: 'GET',
                url: searchUrl,
                headers: headers
            });

            if (response.status !== 200) {
                return null;
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(response.responseText, 'text/html');
            const bibLink = doc.querySelector('a[href*="?view=bibtex"]');
            if (!bibLink) {
                return null;
            }

            // 更健壮的 URL 处理：支持多种 URL 格式
            let bibUrl = bibLink.href;
            if (bibUrl.includes('?view=bibtex')) {
                bibUrl = bibUrl.replace('?view=bibtex', '').replace('.html', '.bib');
            } else if (bibUrl.endsWith('.html')) {
                bibUrl = bibUrl.replace('.html', '.bib');
            } else {
                bibUrl = bibUrl + '.bib';
            }

            const bibResponse = await makeRequest({
                method: 'GET',
                url: bibUrl,
                headers: headers
            });

            if (bibResponse.status === 200 && bibResponse.responseText.trim()) {
                let bibtex = bibResponse.responseText;
                // DBLP 通常无摘要，尝试通过 DOI 从 Crossref/S2/OpenAlex 补充
                const doiInBib = extractDOIFromBibtex(bibtex);
                if (doiInBib) {
                    const abstract = await fetchAbstractByDOI(doiInBib);
                    bibtex = appendAbstractIfMissing(bibtex, abstract);
                }
                cache.set(cacheKey, bibtex);
                return bibtex;
            }
            return null;
        } catch (error) {
            console.error('DBLP fetch error:', error);
            return null;
        }
    }

    // ========== BibTeX 预览弹窗 ==========
    function showBibTeXPreview(bibtex, source, onCopy) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999998;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 80%;
            max-height: 80vh;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
        `;

        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="margin: 0; color: #333;">${lang_hint.preview_title} (${source})</h3>
                <button id="close-preview" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>
            <textarea id="bibtex-content" readonly style="
                width: 100%;
                height: 300px;
                padding: 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                resize: vertical;
                margin-bottom: 16px;
            ">${bibtex}</textarea>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="copy-bibtex" style="
                    padding: 10px 20px;
                    background: #007BFF;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                ">${lang_hint.copy_button}</button>
                <button id="close-preview-btn" style="
                    padding: 10px 20px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                ">${lang_hint.close_button}</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const closeModal = () => {
            document.body.removeChild(overlay);
        };

        modal.querySelector('#close-preview').addEventListener('click', closeModal);
        modal.querySelector('#close-preview-btn').addEventListener('click', closeModal);
        modal.querySelector('#copy-bibtex').addEventListener('click', () => {
            onCopy();
            closeModal();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // ESC 键关闭
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    // ========== 搜索历史管理 ==========
    const history = {
        get: () => {
            return GM_getValue('searchHistory', []) || [];
        },
        add: (query, bibtex, source) => {
            const h = history.get();
            // 移除重复项
            const filtered = h.filter(item => item.query !== query);
            // 添加到开头
            filtered.unshift({ query, bibtex, source, timestamp: Date.now() });
            // 只保留最近20条
            GM_setValue('searchHistory', filtered.slice(0, 20));
        },
        clear: () => {
            GM_setValue('searchHistory', []);
        }
    };

    // ========== 多结果选择弹窗 ==========
    function showMultipleResults(results, onSelect) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999998;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 70%;
            max-height: 80vh;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;

        const resultsList = results.map((result, index) => `
            <div style="
                padding: 16px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                margin-bottom: 12px;
                cursor: pointer;
                transition: all 0.2s;
            "
            data-index="${index}"
            onmouseover="this.style.borderColor='#007BFF'; this.style.background='#f0f7ff'"
            onmouseout="this.style.borderColor='#e0e0e0'; this.style.background='white'">
                <div style="font-weight: 600; margin-bottom: 8px; color: #333; font-size: 15px;">${result.title}</div>
                <div style="font-size: 13px; color: #666; margin-bottom: 4px;">${result.authors}</div>
                <div style="font-size: 12px; color: #999;">${result.year} • DOI: ${result.doi}</div>
            </div>
        `).join('');

        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="margin: 0; color: #333;">${lang_hint.multiple_results}</h3>
                <button id="close-results" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            </div>
            <div style="overflow-y: auto; flex: 1; margin-bottom: 16px;">
                ${resultsList}
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="cancel-results" style="
                    padding: 10px 20px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                ">${lang_hint.cancel}</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const closeModal = () => {
            document.body.removeChild(overlay);
        };

        modal.querySelector('#close-results').addEventListener('click', closeModal);
        modal.querySelector('#cancel-results').addEventListener('click', closeModal);

        modal.querySelectorAll('[data-index]').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.getAttribute('data-index'));
                onSelect(results[index]);
                closeModal();
            });
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // ESC 键关闭
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    // ========== 主函数：尝试多个数据源（支持 DOI 检测和多结果） ==========
    async function fetchBibTeX(query, showProgress = true) {
        // 首先检查是否包含 DOI
        const doi = extractDOI(query);
        if (doi) {
            if (showProgress) {
                buttonState.setLoading(lang_hint.doi_detected);
            }
            const doiResult = await fetchBibTeXByDOI(doi);
            if (doiResult) {
                return { bibtex: doiResult, source: 'Crossref (DOI)', isMultiple: false };
            }
        }

        // 先尝试 DBLP（计算机科学领域）
        if (showProgress) {
            buttonState.setLoading(lang_hint.searching_dblp);
        }
        const dblpResult = await fetchBibTeXFromDBLP(query);
        if (dblpResult) {
            return { bibtex: dblpResult, source: 'DBLP', isMultiple: false };
        }

        // DBLP 未找到，尝试 Crossref（覆盖所有领域）
        if (showProgress) {
            buttonState.setLoading(lang_hint.searching_crossref);
            Toast(lang_hint.trying_crossref, 'info');
        }
        const crossrefResult = await fetchBibTeXFromCrossref(query, 5);
        if (crossrefResult) {
            // 检查是否是多个结果
            if (Array.isArray(crossrefResult)) {
                return { results: crossrefResult, source: 'Crossref', isMultiple: true };
            } else {
                return { bibtex: crossrefResult, source: 'Crossref', isMultiple: false };
            }
        }

        Toast(lang_hint.error_all_sources_failed, 'error');
        return null;
    }

    // ========== 按钮状态管理（带加载动画） ==========
    const buttonState = {
        originalHTML: button.innerHTML,
        originalBgColor: button.style.backgroundColor,
        setLoading: (statusText = 'Loading...') => {
            button.disabled = true;
            button.innerHTML = `<span style="display: inline-block; animation: spin 1s linear infinite; margin-right: 6px;">⏳</span>${statusText}`;
            button.style.opacity = '0.7';
            button.style.cursor = 'not-allowed';
            button.style.transform = 'translateY(0)';
            button.style.backgroundColor = '#6c757d';
            // 添加旋转动画
            if (!document.getElementById('bibtex-spin-style')) {
                const style = document.createElement('style');
                style.id = 'bibtex-spin-style';
                style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
                document.head.appendChild(style);
            }
        },
        reset: () => {
            button.disabled = false;
            button.innerHTML = buttonState.originalHTML;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.backgroundColor = buttonState.originalBgColor || '#007BFF';
        }
    };

    // ========== 防抖处理 ==========
    let debounceTimer = null;
    const debounce = (func, delay) => {
        return (...args) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(this, args), delay);
        };
    };

    // ========== 按钮点击事件（支持预览、历史、多结果选择） ==========
    const handleButtonClick = async (showPreview = false) => {
        const selection = window.getSelection().toString().trim();
        if (!selection) {
            Toast(lang_hint.error_no_text_selected, 'warning');
            return;
        }

        buttonState.setLoading();

        try {
            const result = await fetchBibTeX(selection, true);
            if (result) {
                // 处理多结果情况
                if (result.isMultiple && result.results) {
                    buttonState.reset();
                    showMultipleResults(result.results, (selectedResult) => {
                        // 添加到历史记录
                        history.add(selection, selectedResult.bibtex, result.source);

                        if (showPreview) {
                            showBibTeXPreview(selectedResult.bibtex, result.source, () => {
                                GM_setClipboard(selectedResult.bibtex);
                                const abstractHint = hasAbstractField(selectedResult.bibtex) ? lang_hint.abstract_already_present : lang_hint.abstract_not_found;
                                Toast(`${lang_hint.success_bibtex_copied}（${abstractHint}）`, 'success');
                            });
                        } else {
                            GM_setClipboard(selectedResult.bibtex);
                            const abstractHint = hasAbstractField(selectedResult.bibtex) ? lang_hint.abstract_already_present : lang_hint.abstract_not_found;
                            Toast(`${lang_hint.success_bibtex_copied} (${result.source})（${abstractHint}）`, 'success');
                        }
                    });
                    return;
                }

                // 处理单个结果
                if (result.bibtex) {
                    // 添加到历史记录
                    history.add(selection, result.bibtex, result.source);

                    if (showPreview) {
                        // 显示预览
                        showBibTeXPreview(result.bibtex, result.source, () => {
                            GM_setClipboard(result.bibtex);
                            const abstractHint = hasAbstractField(result.bibtex) ? lang_hint.abstract_already_present : lang_hint.abstract_not_found;
                            Toast(`${lang_hint.success_bibtex_copied}（${abstractHint}）`, 'success');
                        });
                    } else {
                        // 直接复制
                        GM_setClipboard(result.bibtex);
                        const abstractHint = hasAbstractField(result.bibtex) ? lang_hint.abstract_already_present : lang_hint.abstract_not_found;
                        Toast(`${lang_hint.success_bibtex_copied} (${result.source})（${abstractHint}）`, 'success');
                    }
                }
            }
        } catch (error) {
            console.error('Fetch error:', error);
            Toast(lang_hint.error_all_sources_failed, 'error');
        } finally {
            buttonState.reset();
        }
    };

    // 左键点击：直接复制
    button.addEventListener('click', debounce(() => handleButtonClick(false), CONFIG.DEBOUNCE_DELAY));

    // 右键点击：显示预览
    button.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        handleButtonClick(true);
    });

    // ========== 快捷键支持 (Ctrl+Shift+B) ==========
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'B') {
            e.preventDefault();
            handleButtonClick(false);
        }
    });

    // ========== Google Scholar 结果页：直接点击图标复制 BibTeX ==========
    function initGoogleScholarBibtexCopy() {
        // 仅在 Google Scholar 页面生效
        if (!/scholar\.google\./.test(location.hostname)) return;

        // 注入全局 CSS 样式，确保页面加载时就显示红色
        if (!document.getElementById('bibtex-red-style')) {
            const style = document.createElement('style');
            style.id = 'bibtex-red-style';
            style.textContent = `
                a.gs_nta.gs_nph[data-bibtex-enhanced="1"] {
                    color: #dc3545 !important;
                    font-weight: 600 !important;
                    text-decoration: none !important;
                    transition: all 0.2s ease !important;
                    display: inline-block !important;
                }
                a.gs_nta.gs_nph[data-bibtex-enhanced="1"]:hover {
                    color: #ff0000 !important;
                    text-decoration: underline !important;
                    transform: scale(1.05) !important;
                }
            `;
            document.head.appendChild(style);
        }

        // 处理链接的函数
        function enhanceLink(link) {
            // 避免重复绑定
            if (link.dataset.bibtexEnhanced === '1') return;
            link.dataset.bibtexEnhanced = '1';

            link.addEventListener('click', (e) => {
                e.preventDefault();

                GM_xmlhttpRequest({
                    method: 'GET',
                    url: link.href,
                    onload: ({ responseText }) => {
                        GM_setClipboard(responseText);
                        Toast(lang_hint.success_bibtex_copied, 'success');
                    },
                    onerror: () => {
                        Toast('从 Google Scholar 获取 BibTeX 失败', 'error');
                    }
                });
            });
        }

        // 初始化已存在的链接
        document.querySelectorAll('a.gs_nta.gs_nph').forEach(enhanceLink);

        // 监听 DOM 变化，处理动态加载的链接
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // 元素节点
                        // 检查节点本身
                        if (node.matches && node.matches('a.gs_nta.gs_nph')) {
                            enhanceLink(node);
                        }
                        // 检查子节点
                        if (node.querySelectorAll) {
                            node.querySelectorAll('a.gs_nta.gs_nph').forEach(enhanceLink);
                        }
                    }
                });
            });
        });

        // 开始观察
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ========== 右键菜单选项 ==========
    GM_registerMenuCommand(lang_hint.show_button, function() {
        button.style.display = button.style.display === 'none' ? 'block' : 'none';
        GM_setValue('showButton', button.style.display === 'block');
    });

    // ========== 导出历史记录为 .bib 文件 ==========
    function exportHistory() {
        const h = history.get();
        if (h.length === 0) {
            Toast(lang_hint.no_history, 'info');
            return;
        }

        // 合并所有 BibTeX 条目
        const bibContent = h.map(item => item.bibtex).join('\n\n');

        // 创建下载链接
        const blob = new Blob([bibContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = lang_hint.export_filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Toast(lang_hint.export_success, 'success');
    }

    GM_registerMenuCommand(lang_hint.history_title, function() {
        const h = history.get();
        if (h.length === 0) {
            Toast(lang_hint.no_history, 'info');
            return;
        }

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999998;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 60%;
            max-height: 80vh;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;

        const historyList = h.map((item, index) => `
            <div style="padding: 12px; border-bottom: 1px solid #eee; cursor: pointer;"
                 data-index="${index}"
                 onmouseover="this.style.background='#f5f5f5'"
                 onmouseout="this.style.background='white'">
                <div style="font-weight: 500; margin-bottom: 4px; color: #333;">${item.query.substring(0, 60)}${item.query.length > 60 ? '...' : ''}</div>
                <div style="font-size: 12px; color: #666;">${item.source} • ${new Date(item.timestamp).toLocaleString()}</div>
            </div>
        `).join('');

        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="margin: 0; color: #333;">${lang_hint.history_title}</h3>
                <div>
                    <button id="export-history" style="
                        padding: 6px 12px;
                        background: #28a745;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        margin-right: 8px;
                    ">${lang_hint.export_history}</button>
                    <button id="clear-history" style="
                        padding: 6px 12px;
                        background: #dc3545;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        margin-right: 8px;
                    ">${lang_hint.clear_history}</button>
                    <button id="close-history" style="
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        color: #666;
                    ">&times;</button>
                </div>
            </div>
            <div style="overflow-y: auto; flex: 1;" id="history-list">
                ${historyList}
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const closeModal = () => {
            document.body.removeChild(overlay);
        };

        modal.querySelector('#close-history').addEventListener('click', closeModal);
        modal.querySelector('#export-history').addEventListener('click', () => {
            exportHistory();
            closeModal();
        });
        modal.querySelector('#clear-history').addEventListener('click', () => {
            if (confirm('确定要清空历史记录吗？')) {
                history.clear();
                closeModal();
                Toast('历史记录已清空', 'success');
            }
        });

        modal.querySelectorAll('[data-index]').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.getAttribute('data-index'));
                const historyItem = h[index];
                showBibTeXPreview(historyItem.bibtex, historyItem.source, () => {
                    GM_setClipboard(historyItem.bibtex);
                    Toast(lang_hint.success_bibtex_copied, 'success');
                });
            });
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
    });

    // 初始化 Google Scholar BibTeX 直接复制功能
    initGoogleScholarBibtexCopy();

  })();
