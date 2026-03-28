// pages/api/trade/author.js
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// 获取作者的实际身价
async function getAuthorPrice(authorName) {
    try {
        const query = {
            query: `
                query($author: String!) {
                    articles(author: $author, page: 1, pageSize: 500) {
                        nodes {
                            rating
                            comments
                        }
                    }
                }
            `,
            variables: { author: authorName }
        };

        const res = await fetch('https://wikit.unitreaty.org/apiv1/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(query)
        });

        const result = await res.json();
        const articles = result.data?.articles?.nodes || [];

        if (articles.length === 0) return 10;

        let totalRating = 0;
        let totalComments = 0;
        
        articles.forEach(article => {
            totalRating += (article.rating || 0);
            totalComments += (article.comments || 0);
        });

        const price = 10 + (articles.length * 2.5) + (totalRating * 0.8) + (totalComments * 0.2);
        return Math.max(1, price);
    } catch (error) {
        return 10;
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '仅支持 POST 请求' });
    }

    const { username, authorName, action, amount = 1 } = req.body;
    const tradeAmount = Number(amount);

    if (!username) {
        return res.status(401).json({ error: '你还没有登录，无法交易' });
    }

    if (!authorName || !action || isNaN(tradeAmount) || tradeAmount <= 0) {
        return res.status(400).json({ error: '交易参数不完整或数量错误' });
    }

    try {
        const userKey = `user:${username}`;
        let user = await redis.get(userKey);
        
        if (!user) {
            // 如果用户不存在，默认给 10000 并写入
            user = { balance: 10000 };
            await redis.set(userKey, user);
        }

        const currentBalance = user.balance !== undefined ? Number(user.balance) : 10000;
        
        const portfolioKey = `portfolio:${username}`;
        const currentPositionStr = await redis.hget(portfolioKey, authorName);
        const currentPosition = currentPositionStr ? Number(currentPositionStr) : 0;

        // 【新增逻辑】如果是 query，就只返回余额和持仓，不做任何扣款查价
        if (action === 'query') {
            return res.status(200).json({
                newBalance: currentBalance,
                newPosition: currentPosition
            });
        }

        // 服务端计算真实价格
        const realPrice = await getAuthorPrice(authorName);
        const priceNum = Number(realPrice);

        const transactionValue = priceNum * tradeAmount;
        const fee = transactionValue * 0.01; 

        if (action === 'buy') {
            const totalCost = transactionValue + fee;
            
            if (currentBalance < totalCost) {
                return res.status(400).json({ error: `余额不足！买入需 ${totalCost.toFixed(2)} (含手续费)，当前可用 ${currentBalance.toFixed(2)}` });
            }

            user.balance = currentBalance - totalCost;
            await redis.set(userKey, user);
            await redis.hset(portfolioKey, { [authorName]: currentPosition + tradeAmount });

        } else if (action === 'sell') {
            if (currentPosition < tradeAmount) {
                return res.status(400).json({ error: `持仓不足，你目前仅持有 ${currentPosition} 股` });
            }

            const netIncome = transactionValue - fee;

            user.balance = currentBalance + netIncome;
            await redis.set(userKey, user);
            await redis.hset(portfolioKey, { [authorName]: currentPosition - tradeAmount });

        } else {
            return res.status(400).json({ error: '未知的交易操作' });
        }

        const tradeRecord = {
            id: Date.now().toString(),
            username,
            target: authorName,
            type: 'author_stock',
            action,
            price: priceNum,
            amount: tradeAmount,
            fee,
            time: Date.now()
        };

        await redis.lpush('global_trades', JSON.stringify(tradeRecord));
        await redis.lpush(`user_trades:${username}`, JSON.stringify(tradeRecord));

        res.status(200).json({ 
            message: action === 'buy' ? '买入成功' : '卖出成功',
            newBalance: user.balance,
            newPosition: action === 'buy' ? currentPosition + tradeAmount : currentPosition - tradeAmount,
            executedPrice: priceNum // 返回真实成交价
        });

    } catch (error) {
        res.status(500).json({ error: '服务器内部错误' });
    }
}
