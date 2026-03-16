export default async function handler(req, res) {
    const { name } = req.query;

    if (!name) {
        return res.status(400).json({ error: '缺少有效的 name 参数' });
    }

    try {
        const queryName = name.trim();
        
        // 1. 获取全局排名
        const rankRes = await fetch(`https://wikit.unitreaty.org/wikidot/rank?user=${encodeURIComponent(queryName)}`, {
            method: 'GET',
            cache: 'no-store'
        });
        
        let globalRank = '无记录';
        if (rankRes.ok) {
            try {
                const rankData = await rankRes.json();
                globalRank = rankData.rank || rankData.global_rank || '无记录';
            } catch (e) {}
        }

        // 2. 获取所有文章
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

        // 3. 核心修复：如果在 REST 接口查不到，直接在本地遍历所有文章算出绝对准确的总分，并按站点分组
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

        const totalPages = articlesData.length;
        const totalRating = calcGlobalRating;
        const averageRating = totalPages > 0 ? (totalRating / totalPages).toFixed(1) : 0;

        // 4. 新增功能：利用 GraphQL 组合查询，一次性获取作者在所有涉及站点的独立排名
        const uniqueWikis = Object.keys(siteStatsMap);
        if (uniqueWikis.length > 0) {
            let rankQueryParts = uniqueWikis.map((w, index) => {
                return `site_${index}: authorWikiRank(wiki: "${w}", name: "${queryName}", by: RATING) { rank }`;
            }).join('\n');

            const rankGqlQuery = `query {\n${rankQueryParts}\n}`;
            const siteRankRes = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: rankGqlQuery }),
                cache: 'no-store'
            });

            if (siteRankRes.ok) {
                const siteRankJson = await siteRankRes.json();
                if (siteRankJson.data) {
                    uniqueWikis.forEach((w, index) => {
                        const siteData = siteRankJson.data[`site_${index}`];
                        if (siteData && siteData.rank) {
                            siteStatsMap[w].rank = siteData.rank;
                        }
                    });
                }
            }
        }

        const siteStats = Object.values(siteStatsMap).sort((a, b) => b.count - a.count);

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
