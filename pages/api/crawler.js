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
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        };

        const baseUrl = wikiConfig.URL.replace(/\/$/, '');
        let links = [];
        let seen = new Set();
        let pageTitle = "全站页面索引";

        try {
            const listAllUrl = `${baseUrl}/system:list-all-pages`;
            const listRes = await fetch(listAllUrl, { headers: fetchHeaders });
            
            if (listRes.ok) {
                const listHtml = await listRes.text();
                const $list = cheerio.load(listHtml);
                
                $list('#page-content a').each((i, el) => {
                    const href = $list(el).attr('href');
                    const text = $list(el).text().trim();
                    
                    if (href && text && !href.startsWith('javascript:') && !href.startsWith('#')) {
                        const fullHref = href.startsWith('http') ? href : `${baseUrl}${href.startsWith('/') ? href : '/' + href}`;
                        
                        // 核心修复：坚决只允许本站内部链接，过滤一切外链、系统页和 user:info 用户资料页
                        if (fullHref.startsWith(baseUrl) && !href.includes('/system:') && !href.includes('/admin:') && !href.includes('/component:') && !href.includes('user:info')) {
                            if (!seen.has(fullHref)) {
                                seen.add(fullHref);
                                links.push({ text: text, href: fullHref });
                            }
                        }
                    }
                });
            }
        } catch (e) {}

        if (links.length === 0) {
            try {
                const homeRes = await fetch(baseUrl, { headers: fetchHeaders });
                const homeHtml = await homeRes.text();
                const $home = cheerio.load(homeHtml);
                pageTitle = $home('title').text().trim() || "首页数据抓取";
                if (pageTitle.includes(' - ')) pageTitle = pageTitle.split(' - ')[0].trim();

                $home('#page-content a, #nav-side a, #top-bar a').each((i, el) => {
                    const href = $home(el).attr('href');
                    const text = $home(el).text().trim();
                    
                    if (href && text && !href.startsWith('javascript:') && !href.startsWith('#')) {
                        const fullHref = href.startsWith('http') ? href : `${baseUrl}${href.startsWith('/') ? href : '/' + href}`;
                        
                        if (fullHref.startsWith(baseUrl) && !href.includes('/system:') && !href.includes('/admin:') && !href.includes('user:info')) {
                            if (!seen.has(fullHref)) {
                                seen.add(fullHref);
                                links.push({ text: text, href: fullHref });
                            }
                        }
                    }
                });
            } catch (e) {}
        }

        res.status(200).json({
            siteName: wikiConfig.NAME,
            siteUrl: wikiConfig.URL,
            pageTitle: pageTitle,
            links: links
        });
    } catch (error) {
        res.status(500).json({ error: '全站页面抓取失败', details: error.message });
    }
}
