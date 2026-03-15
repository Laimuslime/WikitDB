import * as cheerio from 'cheerio';
const config = require('../../wikitdb.config.js');

export default async function handler(req, res) {
    const { site } = req.query;

    if (!site) return res.status(400).json({ error: '缺少 site 参数' });

    const wikiConfig = config.SUPPORT_WIKI.find(w => w.PARAM === site);
    if (!wikiConfig) return res.status(404).json({ error: '未找到该站点配置' });

    try {
        const fetchHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Cookie': 'wikidot_token7=123456;'
        };

        const baseUrl = wikiConfig.URL.replace(/\/$/, '');
        let links = [];
        let seen = new Set();
        let pageTitle = "全站页面索引";

        // 核心修复 1：向原站底层请求 ListPagesModule 获取所有页面的真实标题
        try {
            const ajaxUrl = `${baseUrl}/ajax-module-connector.php`;
            const body = `moduleName=list%2FListPagesModule&category=*&order=created_at+desc&perPage=250&module_body=%5B%2A+%5B%5B%25%25link%25%25%7C%25%25title%25%25%5D%5D%5D&wikidot_token7=123456`;
            
            const ajaxRes = await fetch(ajaxUrl, {
                method: 'POST',
                headers: { ...fetchHeaders, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                body: body
            });
            
            const ajaxData = await ajaxRes.json();
            if (ajaxData.status === 'ok' && ajaxData.body) {
                const $ajax = cheerio.load(ajaxData.body);
                $ajax('a').each((i, el) => {
                    const href = $ajax(el).attr('href');
                    const text = $ajax(el).text().trim();
                    if (href && text && !href.includes('javascript:')) {
                        const fullHref = href.startsWith('http') ? href : `${baseUrl}${href.startsWith('/') ? href : '/' + href}`;
                        if (!seen.has(fullHref) && text !== fullHref) {
                            seen.add(fullHref);
                            links.push({ text: text, href: fullHref });
                        }
                    }
                });
            }
        } catch (e) {}

        // 核心修复 2：抓取主页侧边栏、顶栏和正文的 A 标签兜底（A 标签包含的一定是人写的真实标题）
        try {
            const homeRes = await fetch(wikiConfig.URL, { headers: fetchHeaders });
            const homeHtml = await homeRes.text();
            const $home = cheerio.load(homeHtml);
            pageTitle = $home('title').text().trim() || "全站页面索引";
            if (pageTitle.includes(' - ')) pageTitle = pageTitle.split(' - ')[0].trim();

            $home('#nav-side a, #top-bar a, #page-content a').each((i, el) => {
                const href = $home(el).attr('href');
                const text = $home(el).text().trim();
                
                if (href && text && !href.startsWith('javascript:') && !href.startsWith('#') && !href.includes('/system:') && !href.includes('/admin:')) {
                    const fullHref = href.startsWith('http') ? href : `${baseUrl}${href.startsWith('/') ? href : '/' + href}`;
                    // 严格过滤掉纯 URL 和未定义文本
                    if (!seen.has(fullHref) && text !== fullHref && !text.startsWith('http')) {
                        seen.add(fullHref);
                        links.push({ text: text, href: fullHref });
                    }
                }
            });
        } catch (e) {}

        // 最终数据清洗，拦截所有异常数据
        const finalLinks = links.filter(link => 
            link.href && 
            link.href !== 'undefined' && 
            link.text && 
            link.text !== 'undefined' &&
            !link.text.startsWith('http')
        );

        res.status(200).json({
            siteName: wikiConfig.NAME,
            siteUrl: wikiConfig.URL,
            pageTitle: pageTitle,
            links: finalLinks
        });
    } catch (error) {
        res.status(500).json({ error: '全站页面抓取失败', details: error.message });
    }
}
