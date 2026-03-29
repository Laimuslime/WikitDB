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
        return res.status(400).json({ error: '缺少目标站点参数' });
    }

    try {
        const targetUrl = `${url}/forum:recent-posts`;
        
        const response = await fetch(targetUrl);
        if (!response.ok) {
            throw new Error(`无法连接到目标站点节点`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const posts = [];

        $('.forum-recent-posts table tr').each((i, row) => {
            if (i === 0) return;

            const cols = $(row).find('td');
            if (cols.length < 4) return;

            const titleElement = $(cols[0]).find('a').first();
            const title = titleElement.text().trim();
            const link = titleElement.attr('href') || '';
            
            let threadId = '';
            const match = link.match(/\/forum\/t-(\d+)/);
            if (match) {
                threadId = match[1];
            }

            const board = $(cols[1]).text().trim();
            const author = $(cols[2]).find('.printuser').text().trim();
            const date = $(cols[3]).text().trim();

            if (title && threadId) {
                posts.push({
                    id: threadId,
                    title,
                    board,
                    author,
                    date
                });
            }
        });

        return res.status(200).json({ success: true, posts, source: url });

    } catch (error) {
        return res.status(500).json({ error: '解析节点数据时发生异常' });
    }
}
