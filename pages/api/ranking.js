const config = require('../../wikitdb.config.js');

export default async function handler(req, res) {
    try {
        // 解析配置文件，提取真实的 wiki 子域名
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

        // 组合查询：同时请求全站和所有子站的排行榜 (pageSize 可以适当大一些，拉取所有数据)
        const pageSize = 500;
        let queryParts = [`global: authorRanking(by: RATING, page: 1, pageSize: ${pageSize}) { name value }`];
        sites.forEach((site, index) => {
            queryParts.push(`site_${index}: authorRanking(wiki: "${site.actualName}", by: RATING, page: 1, pageSize: ${pageSize}) { name value }`);
        });

        const query = `query { ${queryParts.join('\n')} }`;

        const gqlRes = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
            cache: 'no-store'
        });

        if (!gqlRes.ok) {
            throw new Error(`Wikit GraphQL 请求失败，状态码: ${gqlRes.status}`);
        }

        const gqlJson = await gqlRes.json();
        
        if (gqlJson.errors) {
            throw new Error(gqlJson.errors[0].message);
        }

        const rawData = gqlJson.data;

        // ---------------------------------------------------------
        // 核心修复逻辑：手动执行排序并重新赋 rank
        // ---------------------------------------------------------
        
        // 1. 定义一个通用的排序 + 赋 rank 的函数
        const sortAndRankDescending = (arr) => {
            if (!arr || !Array.isArray(arr)) return [];
            
            // 先按 value 进行强制降序排序 (从大到小)
            const sortedArr = [...arr].sort((a, b) => b.value - a.value);

            // 根据新的索引重新赋予 rank 字段 (排名从 1 开始)
            return sortedArr.map((item, index) => ({
                ...item,
                rank: index + 1
            }));
        };

        // 2. 对全站总排行应用新的逻辑
        const sortedGlobalList = sortAndRankDescending(rawData.global);

        // 3. 整理返回数据格式
        const responseData = {
            global: sortedGlobalList, // 使用排序 + 赋 rank 后的列表
            sites: sites.map((site, index) => ({
                param: site.param,
                name: site.name,
                // 对子站点的排行榜也应用相同的逻辑
                ranking: sortAndRankDescending(rawData[`site_${index}`])
            }))
        };

        // ---------------------------------------------------------
        
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        res.status(200).json(responseData);
    } catch (error) {
        res.status(500).json({ error: '获取排行榜数据失败', details: error.message });
    }
}
