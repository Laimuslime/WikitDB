import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { username, betAmount, betSide } = req.body;
    if (!username) return res.status(401).json({ error: '未登录' });

    try {
        const userKey = `user:${username}`;
        let user = await redis.get(userKey);
        if (!user) return res.status(404).json({ error: '用户不存在' });
        if (typeof user === 'string') user = JSON.parse(user);

        const amount = Number(betAmount);
        if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: '下注金额无效' });
        if ((user.balance || 0) < amount) return res.status(400).json({ error: '账户余额不足' });

        // 获取数据库全量页数，安全抽取
        const countRes = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `query { articles(page: 1, pageSize: 1) { pageInfo { total } } }` })
        });
        const countData = await countRes.json();
        const total = countData.data?.articles?.pageInfo?.total || 1000;

        const p1 = Math.floor(Math.random() * total) + 1;
        const p2 = Math.floor(Math.random() * total) + 1;

        const fetchPage = async (page) => {
            const r = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: `query { articles(page: ${page}, pageSize: 1) { nodes { wiki title rating author } } }` })
            });
            const d = await r.json();
            return d.data?.articles?.nodes[0] || { title: 'Unknown Anomaly', rating: 0, wiki: 'unknown' };
        };

        const [leftPage, rightPage] = await Promise.all([fetchPage(p1), fetchPage(p2)]);

        user.balance -= amount;

        let winner = 'draw';
        if (leftPage.rating > rightPage.rating) winner = 'left';
        if (rightPage.rating > leftPage.rating) winner = 'right';

        let reward = 0;
        if (winner === betSide) {
            reward = amount * 2;
            user.balance += reward;
        } else if (winner === 'draw') {
            reward = amount;
            user.balance += reward;
        }

        await redis.set(userKey, JSON.stringify(user));

        return res.status(200).json({
            success: true,
            leftPage,
            rightPage,
            winner,
            reward,
            newBalance: user.balance
        });

    } catch (e) {
        return res.status(500).json({ error: '服务器内部错误' });
    }
}
