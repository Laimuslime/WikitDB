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
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        };

        let links = [];
        let pageTitle = "全站页面索引";

        const sitemapUrl = `${wikiConfig.URL.replace(/\/$/, '')}/sitemap.xml`;
        
        try {
            const response = await fetch(sitemapUrl, { headers: fetchHeaders });
            if (response.ok) {
                const xml = await response.text();
                const $ = cheerio.load(xml, { xmlMode: true });
                
                $('loc').each((i, el) => {
                    const href = $(el).text().trim();
                    if (href && href.startsWith('http') && !href.includes('/system:') && !href.includes('/admin:')) {
                        const parts = href.split('/');
                        const rawTitle = parts[parts.length - 1] || parts[parts.length - 2] || '';
                        const title = rawTitle ? decodeURIComponent(rawTitle).replace(/-/g, ' ') : href;
                        links.push({ text: title, href: href });
                    }
                });
            }
        } catch (e) {
            // Sitemap 抓取失败跳过，继续执行回退逻辑
        }

        if (links.length === 0) {
            const fallbackRes = await fetch(wikiConfig.URL, { headers: fetchHeaders });
            const html = await fallbackRes.text();
            const $ = cheerio.load(html);
            pageTitle = $('title').text().trim() || "首页备用抓取";
            
            $('#page-content a').each((i, el) => {
                const text = $(el).text().trim();
                const href = $(el).attr('href');
                if (href && typeof href === 'string' && !href.startsWith('javascript:') && !href.startsWith('#')) {
                    const fullHref = href.startsWith('http') ? href : `${wikiConfig.URL.replace(/\/$/, '')}${href.startsWith('/') ? href : '/' + href}`;
                    links.push({
                        text: text || decodeURIComponent(fullHref.split('/').pop() || '未知页面'),
                        href: fullHref
                    });
                }
            });
        }

        const uniqueLinks = [];
        const seen = new Set();
        for (const link of links) {
            if (link.href && link.href !== 'undefined' && !seen.has(link.href)) {
                seen.add(link.href);
                uniqueLinks.push({
                    text: link.text || link.href,
                    href: link.href
                });
            }
        }

        res.status(200).json({
            siteName: wikiConfig.NAME,
            siteUrl: wikiConfig.URL,
            pageTitle: pageTitle,
            links: uniqueLinks
        });
    } catch (error) {
        res.status(500).json({ error: '全站页面抓取失败', details: error.message });
    }
}
