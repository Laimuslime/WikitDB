import * as cheerio from 'cheerio';
const config = require('../../wikitdb.config.js');

export default async function handler(req, res) {
    const { site } = req.query;

    if (!site) {
        return res.status(400).json({ error: '缺少 site 参数' });
    }

    const wikiConfig = config.SUPPORT_WIKI.find(w => w.PARAM === site);

    if (!wikiConfig) {
        return res.status(404).json({ error: '未找到该站点配置' });
    }

    try {
        const response = await fetch(wikiConfig.URL);
        
        if (!response.ok) {
            throw new Error(`HTTP 状态码异常: ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);

        const title = $('title').text();
        const links = [];

        $('#page-content a').slice(0, 10).each((i, el) => {
            const text = $(el).text().trim();
            const href = $(el).attr('href');
            
            if (href && !href.startsWith('javascript:')) {
                links.push({
                    text: text || href,
                    href: href.startsWith('http') ? href : `${wikiConfig.URL.replace(/\/$/, '')}${href.startsWith('/') ? href : '/' + href}`
                });
            }
        });

        res.status(200).json({
            siteName: wikiConfig.NAME,
            siteUrl: wikiConfig.URL,
            pageTitle: title,
            links: links
        });
    } catch (error) {
        res.status(500).json({ error: '页面抓取失败', details: error.message });
    }
}
