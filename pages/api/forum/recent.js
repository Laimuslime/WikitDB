import * as cheerio from 'cheerio';
import { verifyToken } from '../../../utils/auth';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const decoded = verifyToken(req);
    if (!decoded || !decoded.username) {
        return res.status(401).json({ error: '未经授权的访问' });
    }

    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: '缺少站点地址' });
    }

    try {
        // 确保地址拼接正确
        const targetUrl = url.endsWith('/') ? `${url}forum:recent-posts` : `${url}/forum:recent-posts`;
        
        // 伪装成正常的浏览器请求，防止 Wikidot 盾拦截
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const posts = [];

        // 最强暴力解析法：无视所有的样式表，直接查找所有表格里的 a 标签，只要链接里带有 /forum/t- 就认为是帖子
        $('table tr').each((i, row) => {
            const linkTag = $(row).find('a[href*="/forum/t-"]').first();
            if (!linkTag.length) return; // 如果这一行没有帖子链接，直接跳过

            const title = linkTag.text().trim();
            const link = linkTag.attr('href') || '';
            const threadMatch = link.match(/\/forum\/t-(\d+)/);
            if (!threadMatch) return;
            const threadId = threadMatch[1];

            const tds = $(row).find('td');
            let board = '未知讨论区';
            let author = '未知作者';
            let date = '未知时间';

            // Wikidot 标准表格结构提取
            if (tds.length >= 3) {
                board = $(tds[1]).text().trim();
                
                const authorTag = $(row).find('.printuser').last();
                if (authorTag.length) author = authorTag.text().trim();
                
                const dateTag = $(row).find('.odate').last();
                if (dateTag.length) {
                    date = dateTag.text().trim();
                } else {
                    // 兜底方案：取最后一行文本
                    date = $(tds[tds.length - 1]).text().replace(author, '').trim();
                }
            }

            // 去重判断：防止同一个帖子被重复压入
            if (!posts.find(p => p.id === threadId)) {
                posts.push({
                    id: threadId,
                    title,
                    board,
                    author,
                    date
                });
            }
        });

        return res.status(200).json({ success: true, posts, source: targetUrl });

    } catch (error) {
        console.error(`解析站点 ${url} 时报错:`, error);
        return res.status(500).json({ error: '无法抓取该站点，节点未响应或不支持此功能。' });
    }
}
