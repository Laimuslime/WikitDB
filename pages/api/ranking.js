const config = require('../../wikitdb.config.js');

export default async function handler(req, res) {
    try {
        const sites = config.SUPPORT_WIKI.map(wikiConfig => {
            let actualWikiName = '';
            try {
                const urlObj = new URL(wikiConfig.URL);
                actualWikiName = urlObj.hostname.replace(/^www\./i, '').split('.')[0];
            } catch (e) {
                actualWikiName = wikiConfig.URL.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('.')[0];
            }
            return { param: wikiConfig.PARAM, name: wikiConfig.NAME, actualName: actualWikiName };
        });

        // 核心修复 1：去掉静默返回空数组，抛出真实错误，绝不吞数据
        const fetchGraphQL = async (queryStr) => {
            const gqlRes = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: queryStr }),
                cache: 'no-store'
            });
            
            const text = await gqlRes.text();
            
            try {
                const json = JSON.parse(text);
                
                if (json.errors) {
                    throw new Error(json.errors[0].message);
                }
                
                // 适配最纯净的查询返回格式
                if (json.data && json.data.authorRanking) {
                    return json.data.authorRanking;
                }
                
                return [];
            } catch (e) {
                if (e.name === 'SyntaxError') {
                    // 如果 Wikit 再次返回了 PHP 报错页面，直接截取并抛出，让 UI 显式展示
                    throw new Error(`Wikit 接口崩溃 (非 JSON): ${text.substring(0, 60)}...`);
                }
                throw e;
            }
        };

        
        // 1. 获取全站总排行
        const globalRank = await fetchGraphQL(`query { authorRanking(by: RATING) { rank name value } }`);
        
        // 2. 依次排队获取各个子站的排行
        const siteRanks = [];
        for (const site of sites) {
            const rankData = await fetchGraphQL(`query { authorRanking(wiki: "${site.actualName}", by: RATING) { rank name value } }`);
            siteRanks.push({
                param: site.param,
                name: site.name,
                ranking: rankData
            });
        }

        const responseData = {
            global: globalRank,
            sites: siteRanks
        };

        // 获取成功后在 Vercel 边缘节点缓存 10 分钟，减少对后端的持续访问
        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
        res.status(200).json(responseData);

    } catch (error) {
        // 如果报错，直接抛给前端红框显示，不再用“暂无数据”骗人
        res.status(500).json({ error: '排行榜数据获取失败', details: error.message });
    }
}
