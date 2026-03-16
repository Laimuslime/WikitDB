const config = require('../../wikitdb.config.js');

export default async function handler(req, res) {
    try {
        // 解析配置文件，提取真实的 wiki 子域名用于 GraphQL 查询
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

        // 利用 GraphQL 别名组合查询：同时请求全局和所有子站的排行榜
        let queryParts = [`global: authorRanking(by: RATING) { rank name value }`];
        sites.forEach((site, index) => {
            queryParts.push(`site_${index}: authorRanking(wiki: "${site.actualName}", by: RATING) { rank name value }`);
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

        // 整理返回数据格式
        const responseData = {
            global: rawData.global || [],
            sites: sites.map((site, index) => ({
                param: site.param,
                name: site.name,
                ranking: rawData[`site_${index}`] || []
            }))
        };

        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        res.status(200).json(responseData);
    } catch (error) {
        res.status(500).json({ error: '获取排行榜数据失败', details: error.message });
    }
}
