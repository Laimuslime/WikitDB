import * as cheerio from 'cheerio';
import { verifyToken } from '../../../utils/auth';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const decoded = verifyToken(req);
    if (!decoded || !decoded.username) {
        return res.status(401).json({ error: '请先登录' });
    }

    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: '缺少目标站点参数' });
    }

    try {
        const targetUrl = url.endsWith('/') ? `${url}forum:recent-posts` : `${url}/forum:recent-posts`;
        
        // 增加浏览器 UA，避免被拦截
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`请求失败: ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const posts = [];

        // 暴力遍历所有表格行，不依赖特定 class
        $('table tr').each((i, row) => {
            const linkTag = $(row).find('a[href*="/forum/t-"]').first();
            if (!linkTag.length) return;

            const title = linkTag.text().trim();
            const link = linkTag.attr('href') || '';
            const threadMatch = link.match(/\/forum\/t-(\d+)/);
            if (!threadMatch) return;
            const threadId = threadMatch[1];

            const tds = $(row).find('td');
            let board = '-';
            let author = '-';
            let date = '-';

            if (tds.length >= 3) {
                board = $(tds[1]).text().trim();
                const authorTag = $(row).find('.printuser').last();
                if (authorTag.length) author = authorTag.text().trim();
                
                const dateTag = $(row).find('.odate').last();
                if (dateTag.length) {
                    date = dateTag.text().trim();
                } else {
                    date = $(tds[tds.length - 1]).text().replace(author, '').trim();
                }
            }

            // 防止重复添加
            if (!posts.find(p => p.id === threadId)) {
                posts.push({ id: threadId, title, board, author, date });
            }
        });

        return res.status(200).json({ success: true, posts });
    } catch (error) {
        return res.status(500).json({ error: '无法解析该站点的论坛数据' });
    }
}
