import * as cheerio from 'cheerio';
import { verifyToken } from '../../../utils/auth';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 安全锁
    const decoded = verifyToken(req);
    if (!decoded || !decoded.username) {
        return res.status(401).json({ error: '未经授权的访问' });
    }

    // 从前端接收完整的站点 URL
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: '缺少目标站点地址' });
    }

    try {
        // 构建目标 URL，处理 URL 编码
        const targetUrl = `${url}/forum:recent-posts`;
        console.log(`[Omni-Link] Connecting to: ${targetUrl}`); // 后端控制台日志

        const response = await fetch(targetUrl);
        if (!response.ok) {
            throw new Error(`无法连接到目标站点节点，错误码: ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const posts = [];

        // 提取论坛提供的标准最新动态表格
        $('.forum-recent-posts table tr').each((i, row) => {
            // 跳过表头行
            if (i === 0) return;

            const cols = $(row).find('td');
            // 如果单元格数量不匹配，跳过
            if (cols.length < 4) return;

            // --- 增强抓取容错性 ---

            // 第1列：Thread Title / Link
            const titleElement = $(cols[0]).find('a').first();
            if (!titleElement.length) return; // 如果没有标题链接，跳过

            const title = titleElement.text().trim();
            const link = titleElement.attr('href') || '';
            
            let threadId = '';
            // 匹配 ID 格式，如 /forum/t-17127661
            const match = link.match(/\/forum\/t-(\d+)/);
            if (match) {
                threadId = match[1];
            }

            // 如果连 Thread ID 都没有，跳过
            if (!threadId) return;

            // 第2列：Sector / Board (版块名称)
            const board = $(cols[1]).text().trim() || "[未知讨论区]";

            // 第3列：Entity / Author (作者名称)
            const author = $(cols[2]).find('.printuser').text().trim() || "[匿名]";

            // 第4列：Timestamp (时间戳)
            const date = $(cols[3]).text().trim() || "[未知时间]";

            // 只有关键数据完整才压入数组
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

        if (posts.length === 0) {
            console.log(`[Omni-Link] No recent posts found on: ${targetUrl}`);
        }

        return res.status(200).json({ success: true, posts, source: url });

    } catch (error) {
        console.error(`[Omni-Link] Error fetching ${url}: ${error.message}`);
        // 返回更具体的错误信息给前端
        return res.status(500).json({ error: '解析节点数据时发生异常，为保护经济系统已拦截本次连接。' });
    }
}
