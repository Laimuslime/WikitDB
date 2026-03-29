import { Redis } from '@upstash/redis';
import { verifyToken } from '../../../utils/auth';

const redis = Redis.fromEnv();

async function getAuthorPrice(authorName) {
    const cacheKey = `author_price_cache:${authorName}`;
    const cachedPrice = await redis.get(cacheKey);
    if (cachedPrice) return Number(cachedPrice);

    try {
        const query = {
            query: `query($author: String!) { articles(author: $author, page: 1, pageSize: 500) { nodes { rating comments } } }`,
            variables: { author: authorName }
        };
        const res = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query)
        });
        if (!res.ok) throw new Error('网络拒绝');
        const result = await res.json();
        if (result.errors) throw new Error('异常');

        const articles = result.data?.articles?.nodes || [];
        if (articles.length === 0) {
            await redis.set(cacheKey, 10, { ex: 60 });
            return 10;
        }

        let totalRating = 0, totalComments = 0;
        articles.forEach(a => { totalRating += (a.rating || 0); totalComments += (a.comments || 0); });

        const price = Math.max(1, 10 + (articles.length * 2.5) + (totalRating * 0.8) + (totalComments * 0.2));
        await redis.set(cacheKey, price, { ex: 60 });
        return price;
    } catch (e) {
        throw new Error('节点异常');
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: '仅支持 POST 请求' });

    const decoded = verifyToken(req);
    if (!decoded || !decoded.username) return res.status(401).json({ error: '未经授权访问' });
    const username = decoded.username; 

    const { authorName, action, amount = 1 } = req.body;
    const tradeAmount = Number(amount);

    if (!authorName || !action || isNaN(tradeAmount) || tradeAmount <= 0) {
        return res.status(400).json({ error: '参数错误' });
    }

    const SELL_LOSS_RATE = 0.05;

    try {
        const userKey = `user:${username}`;
        let userStr = await redis.get(userKey);
        let user = typeof userStr === 'string' ? JSON.parse(userStr) : userStr;
        if (!user) { user = { balance: 10000 }; await redis.set(userKey, JSON.stringify(user)); }

        const portfolioKey = `portfolio:${username}`;

        if (action === 'query') {
            let pData = await redis.hget(portfolioKey, authorName);
            if (typeof pData === 'string') { try { pData = JSON.parse(pData); } catch(e){} }
            let pos = typeof pData === 'object' && pData !== null ? (pData.shares || 0) : (Number(pData) || 0);
            return res.status(200).json({ newBalance: user.balance || 10000, newPosition: pos });
        }

        let currentPrice;
        try { currentPrice = await getAuthorPrice(authorName); } 
        catch (e) { return res.status(500).json({ error: '市值读取失败拦截' }); }

        const price = Number(currentPrice);
        let pData = await redis.hget(portfolioKey, authorName);
        if (typeof pData === 'string') { try { pData = JSON.parse(pData); } catch(e){} }

        let currentShares = 0, avgCost = price;
        if (typeof pData === 'object' && pData !== null) {
            currentShares = pData.shares || 0;
            avgCost = pData.avgCost || price;
        } else {
            currentShares = Number(pData) || 0;
        }

        const totalValue = tradeAmount * price;

        if (action === 'buy') {
            if (currentShares >= 0) {
                if ((user.balance || 0) < totalValue) return res.status(400).json({ error: '余额不足' });
                const curVal = currentShares * avgCost;
                user.balance -= totalValue;
                currentShares += tradeAmount;
                avgCost = (curVal + totalValue) / currentShares;
            } else if (currentShares < 0 && Math.abs(currentShares) < tradeAmount) {
                const cover = Math.abs(currentShares);
                const longAmt = tradeAmount - cover;
                user.balance += (avgCost * cover) + ((avgCost - price) * cover);
                const longCost = longAmt * price;
                if ((user.balance || 0) < longCost) return res.status(400).json({ error: '平空后余额不足开多' });
                user.balance -= longCost;
                currentShares = longAmt;
                avgCost = price;
            } else {
                user.balance += (avgCost * tradeAmount) + ((avgCost - price) * tradeAmount);
                currentShares += tradeAmount;
                if (currentShares === 0) avgCost = 0;
            }
        } else if (action === 'sell') {
            const lossFee = totalValue * SELL_LOSS_RATE;
            if (currentShares >= tradeAmount) {
                user.balance += (totalValue - lossFee);
                currentShares -= tradeAmount;
                if (currentShares === 0) avgCost = 0;
            } else if (currentShares > 0 && currentShares < tradeAmount) {
                const closeAmt = currentShares;
                const shortAmt = tradeAmount - currentShares;
                const closeVal = closeAmt * price;
                user.balance += (closeVal - (closeVal * SELL_LOSS_RATE));
                const marginReq = shortAmt * price;
                const reqTotal = marginReq + (marginReq * SELL_LOSS_RATE);
                if ((user.balance || 0) < reqTotal) return res.status(400).json({ error: '余额不足做空' });
                user.balance -= reqTotal;
                currentShares = -shortAmt;
                avgCost = price;
            } else {
                const marginReq = tradeAmount * price;
                const reqTotal = marginReq + lossFee;
                if ((user.balance || 0) < reqTotal) return res.status(400).json({ error: '余额不足做空' });
                const curShortVal = Math.abs(currentShares) * avgCost;
                user.balance -= reqTotal;
                currentShares -= tradeAmount;
                avgCost = (curShortVal + marginReq) / Math.abs(currentShares);
            }
        } else {
            return res.status(400).json({ error: '未知指令' });
        }

        await redis.set(userKey, JSON.stringify(user));
        await redis.hset(portfolioKey, { [authorName]: JSON.stringify({ shares: currentShares, avgCost }) });

        const log = { id: Date.now().toString(), username, target: authorName, type: 'author_stock', action, price, amount: tradeAmount, time: Date.now() };
        await redis.lpush('global_trades', JSON.stringify(log));
        await redis.lpush(`user_trades:${username}`, JSON.stringify(log));

        res.status(200).json({ message: 'OK', newBalance: user.balance, newPosition: currentShares, avgCost, executedPrice: price });

    } catch (error) {
        res.status(500).json({ error: '服务器异常' });
    }
}
