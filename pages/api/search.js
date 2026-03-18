const config = require('../../wikitdb.config.js');

export default async function handler(req, res) {
    const { site, q, p, type } = req.query;

    if (!site) return res.status(400).json({ error: '缺少 site 参数' });

    const wikiConfig = config.SUPPORT_WIKI.find(w => w.PARAM === site);
    if (!wikiConfig) return res.status(404).json({ error: '未找到该站点配置' });

    let actualWikiName = '';
    try {
        const urlObj = new URL(wikiConfig.URL);
        actualWikiName = urlObj.hostname.replace(/^www\./i, '').split('.')[0];
    } catch (e) {
        actualWikiName = wikiConfig.URL.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('.')[0];
    }

    const keyword = q ? q.trim() : '';
    const currentPage = parseInt(p, 10) || 1;
    const pageSize = 50;
    const isAuthorSearch = type === 'author' && wikiConfig.AUTHOR_TAG;

    try {
        let queryArgs = `wiki: ["${actualWikiName}"]`;
        if (keyword) {
            queryArgs += `, title: "%${keyword}%"`;
        }
        if (isAuthorSearch) {
            queryArgs += `, includeTags: ["${wikiConfig.AUTHOR_TAG}"]`;
        }
        queryArgs += `, page: ${currentPage}, pageSize: ${pageSize}`;

        const query = `query { articles(${queryArgs}) { nodes { title page wiki rating created_at tags } pageInfo { total } } }`;

        const gqlRes = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
            cache: 'no-store'
        });

        if (!gqlRes.ok) throw new Error('Wikit API 网络异常');

        const gqlJson = await gqlRes.json();
        
        if (gqlJson.errors) {
            throw new Error(gqlJson.errors[0].message);
        }

        let nodes = gqlJson.data?.articles?.nodes || [];
        let total = gqlJson.data?.articles?.pageInfo?.total || 0;
        
        nodes.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        res.status(200).json({
            siteName: wikiConfig.NAME,
            results: nodes,
            currentPage: currentPage,
            totalPages: Math.ceil(total / pageSize),
            totalCount: total
        });

    } catch (error) {
        try {
            let fallbackArgs = `wiki: ["${actualWikiName}"]`;
            if (isAuthorSearch) {
                fallbackArgs += `, includeTags: ["${wikiConfig.AUTHOR_TAG}"]`;
            }
            fallbackArgs += `, page: 1, pageSize: 2000`;

            const fallbackQuery = `query { articles(${fallbackArgs}) { nodes { title page wiki rating created_at tags } } }`;
            const fallbackRes = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: fallbackQuery }),
                cache: 'no-store'
            });
            
            const fallbackJson = await fallbackRes.json();
            let nodes = fallbackJson.data?.articles?.nodes || [];
            
            if (keyword) {
                const lowerQ = keyword.toLowerCase();
                nodes = nodes.filter(n => 
                    (n.title && n.title.toLowerCase().includes(lowerQ)) || 
                    (n.page && n.page.toLowerCase().includes(lowerQ))
                );
            }

            if (isAuthorSearch) {
                nodes = nodes.filter(n => n.tags && n.tags.includes(wikiConfig.AUTHOR_TAG));
            }

            nodes.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            
            const total = nodes.length;
            const totalPages = Math.ceil(total / pageSize);
            
            const slicedNodes = nodes.slice((currentPage - 1) * pageSize, currentPage * pageSize);
            
            res.status(200).json({
                siteName: wikiConfig.NAME,
                results: slicedNodes,
                currentPage: currentPage,
                totalPages: totalPages === 0 ? 1 : totalPages,
                totalCount: total
            });
        } catch (err) {
            res.status(500).json({ error: '搜索执行失败', details: err.message });
        }
    }
}
