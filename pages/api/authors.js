import * as cheerio from 'cheerio';

export default async function handler(req, res) {
    const { name } = req.query;

    if (!name) {
        return res.status(400).json({ error: '缺少有效的 name 参数' });
    }

    try {
        const queryName = name.trim();
        
        let globalRank = '无记录';
        let totalRating = 0;
        let totalPages = 0;
        let siteStats = [];
        let parsedFromRankApi = false;

        // 1. 核心修复：解析纯文本/HTML 格式的排名接口
        const rankRes = await fetch(`https://wikit.unitreaty.org/wikidot/rank?user=${encodeURIComponent(queryName)}`, {
            method: 'GET',
            cache: 'no-store'
        });
        
        if (rankRes.ok) {
            const rankHtml = await rankRes.text();
            // 将原生的 <br> 标签替换为换行符，方便按行解析
            const cleanHtml = rankHtml.replace(/<br\s*\/?>/gi, '\n');
            const $rank = cheerio.load(cleanHtml);
            
            // 按行分割文本并过滤空行
            const lines = $rank.text().split('\n').map(l => l.trim()).filter(l => l);

            if (lines.length > 0 && lines[0].includes('总排名')) {
                parsedFromRankApi = true;
                
                // 解析第一行：全局数据
                const globalRankMatch = lines[0].match(/总排名#(\d+)/);
                if (globalRankMatch) globalRank = globalRankMatch[1];

                const globalRatingMatch = lines[0].match(/总分(-?\d+)分/);
                if (globalRatingMatch) totalRating = parseInt(globalRatingMatch[1], 10);

                const globalPagesMatch = lines[0].match(/创建页面(?:总数)?(\d+)个/);
                if (globalPagesMatch) totalPages = parseInt(globalPagesMatch[1], 10);

                // 解析第二行及以后：各站点独立数据
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i];
                    const siteMatch = line.match(/在(.*?)中的排名#(\d+)\s*总分(-?\d+)分\s*创建页面(?:总数)?(\d+)个/);
                    if (siteMatch) {
                        siteStats.push({
                            wiki: siteMatch[1].trim(),
                            rank: siteMatch[2],
                            rating: parseInt(siteMatch[3], 10),
                            count: parseInt(siteMatch[4], 10)
                        });
                    }
                }
            }
        }

        // 2. 依然使用 GraphQL 获取具体的作品列表
        const articlesQuery = `
        query {
          articles(author: "${queryName}", page: 1, pageSize: 500) {
            nodes {
              title
              wiki
              page
              rating
              created_at
            }
          }
        }`;

        const gqlRes = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: articlesQuery }),
            cache: 'no-store'
        });

        let articlesData = [];
        if (gqlRes.ok) {
            const gqlJson = await gqlRes.json();
            if (!gqlJson.errors && gqlJson.data && gqlJson.data.articles) {
                articlesData = gqlJson.data.articles.nodes || [];
            }
        }

        // 3. 兜底逻辑：万一 REST 接口因为网络原因失效，用文章列表强行算
        if (!parsedFromRankApi) {
            let calcGlobalRating = 0;
            const siteStatsMap = {};

            articlesData.forEach(article => {
                const r = article.rating || 0;
                calcGlobalRating += r;
                
                const w = article.wiki;
                if (!siteStatsMap[w]) {
                    siteStatsMap[w] = { wiki: w, count: 0, rating: 0, rank: '无记录' };
                }
                siteStatsMap[w].count += 1;
                siteStatsMap[w].rating += r;
            });

            totalPages = articlesData.length;
            totalRating = calcGlobalRating;
            siteStats = Object.values(siteStatsMap).sort((a, b) => b.count - a.count);
        }

        let averageRating = 0;
        if (totalPages > 0) {
            averageRating = (totalRating / totalPages).toFixed(1);
        }

        const accountName = encodeURIComponent(queryName.toLowerCase().replace(/_/g, '-').replace(/ /g, '-'));
        const avatarUrl = `https://www.wikidot.com/avatar.php?account=${accountName}`;

        const authorData = {
            name: queryName,
            avatar: avatarUrl,
            globalRank: globalRank,
            totalRating: totalRating,
            totalPages: totalPages,
            averageRating: averageRating,
            siteStats: siteStats,
            pages: articlesData
        };

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        res.status(200).json(authorData);
    } catch (error) {
        res.status(500).json({ error: '获取作者信息失败', details: error.message });
    }
}
