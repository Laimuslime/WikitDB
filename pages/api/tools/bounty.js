import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// 生成随机悬赏任务的辅助函数
const generateBounties = () => {
    const tagPool = ['原创', '精品', 'scp', 'tale', 'goi-format', '微恐', '搞笑', '科幻', 'keter', '安全'];
    const bounties = [];
    for (let i = 0; i < 3; i++) {
        // 随机抽取 1 到 2 个标签作为要求
        const tags = [tagPool[Math.floor(Math.random() * tagPool.length)]];
        if (Math.random() > 0.5) {
            tags.push(tagPool[Math.floor(Math.random() * tagPool.length)]);
        }
        const uniqueTags = [...new Set(tags)];
        const minRating = Math.floor(Math.random() * 40) + 10; 
        
        bounties.push({
            id: `bounty_${Date.now()}_${i}`,
            tags: uniqueTags,
            minRating: minRating,
            reward: (uniqueTags.length * 800) + (minRating * 20),
            status: 'active',
            claimer: null,
            claimedPage: null
        });
    }
    return bounties;
};

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            let bounties = await redis.get('bounties_list');
            // 如果缓存里没有悬赏，或者悬赏被清空了，就生成一批新的
            if (!bounties) {
                bounties = generateBounties();
                await redis.set('bounties_list', JSON.stringify(bounties));
            } else if (typeof bounties === 'string') {
                bounties = JSON.parse(bounties);
            }
            return res.status(200).json({ bounties });
        } catch (e) {
            return res.status(500).json({ error: '读取悬赏列表失败' });
        }
    }

    if (req.method === 'POST') {
        const { action, username, bountyId, wiki, page } = req.body;

        // 提供一个刷新悬赏池的底层指令
        if (action === 'refresh') {
            const newBounties = generateBounties();
            await redis.set('bounties_list', JSON.stringify(newBounties));
            return res.status(200).json({ success: true, bounties: newBounties });
        }

        if (!username || !bountyId || !wiki || !page) {
            return res.status(400).json({ error: '请填写完整的 Wiki 和 Page 标识符' });
        }

        try {
            const userKey = `user:${username}`;
            let user = await redis.get(userKey);
            if (!user) return res.status(404).json({ error: '用户不存在' });
            if (typeof user === 'string') user = JSON.parse(user);

            let bounties = await redis.get('bounties_list');
            if (typeof bounties === 'string') bounties = JSON.parse(bounties);
            if (!bounties) return res.status(404).json({ error: '悬赏数据已过期' });

            const bountyIndex = bounties.findIndex(b => b.id === bountyId);
            if (bountyIndex === -1) return res.status(404).json({ error: '找不到该悬赏任务' });
            const bounty = bounties[bountyIndex];

            if (bounty.status !== 'active') {
                return res.status(400).json({ error: '这笔悬赏已经被其他特工领走了' });
            }

            // 去 GraphQL 验证玩家提交的页面
            const query = {
                query: `query { article(wiki: "${wiki}", page: "${page}") { title rating tags author } }`
            };
            const gqlRes = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(query)
            });
            const gqlData = await gqlRes.json();

            if (gqlData.errors || !gqlData.data?.article) {
                return res.status(400).json({ error: '数据库中未找到此页面，请检查拼写是否正确' });
            }

            const article = gqlData.data.article;
            const articleTags = article.tags || [];
            const articleRating = article.rating || 0;

            // 核心逻辑：比对标签和评分是否达标
            const hasAllTags = bounty.tags.every(t => articleTags.includes(t));
            const meetsRating = articleRating >= bounty.minRating;

            if (!hasAllTags || !meetsRating) {
                return res.status(400).json({ 
                    error: `验证不通过：该页面评分为 ${articleRating}，携带标签 [${articleTags.join(', ')}]，未能满足悬赏要求。` 
                });
            }

            // 验证通过，发放赏金并更新任务状态
            user.balance = (user.balance || 0) + bounty.reward;
            await redis.set(userKey, JSON.stringify(user));

            bounties[bountyIndex].status = 'claimed';
            bounties[bountyIndex].claimer = username;
            bounties[bountyIndex].claimedPage = article.title;
            await redis.set('bounties_list', JSON.stringify(bounties));

            return res.status(200).json({
                success: true,
                article,
                reward: bounty.reward,
                newBalance: user.balance,
                bounties
            });

        } catch (e) {
            return res.status(500).json({ error: '服务器内部错误' });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
