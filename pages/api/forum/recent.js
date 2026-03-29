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

    // 从前端接收目标站点标识符，默认为 scp-wiki-cn
    const { wiki = 'scp-wiki-cn' } = req.query;

    try {
        // 动态构建目标 URL
        const targetUrl = `https://${wiki}.wikidot.com/forum:recent-posts`;
        
        const response = await fetch(targetUrl);
        if (!response.ok) {
            throw new Error(`无法连接到目标站点节点: ${wiki}`);
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

        return res.status(200).json({ success: true, posts, source: wiki });

    } catch (error) {
        return res.status(500).json({ error: '解析节点数据时发生异常，请检查该站点是否存在或已开启论坛模块' });
    }
}
