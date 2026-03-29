import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// 获取作者的实际身价，使用短时缓存降低并发压力
async function getAuthorPrice(authorName) {
    const cacheKey = `author_price_cache:${authorName}`;
    const cachedPrice = await redis.get(cacheKey);
    
    if (cachedPrice) {
        return Number(cachedPrice);
    }

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

        if (!res.ok) {
            throw new Error('网络请求被节点拒绝');
        }

        const result = await res.json();
        
        if (result.errors) {
            throw new Error('查询语法或节点执行异常');
        }

        const articles = result.data?.articles?.nodes || [];

        if (articles.length === 0) {
            await redis.set(cacheKey, 10, { ex: 60 });
            return 10;
        }

        let totalRating = 0;
        let totalComments = 0;
        
        articles.forEach(article => {
            totalRating += (article.rating || 0);
            totalComments += (article.comments || 0);
        });

        const price = 10 + (articles.length * 2.5) + (totalRating * 0.8) + (totalComments * 0.2);
        const finalPrice = Math.max(1, price);

        // 将结果在缓存中保留 60 秒，应对高频点击
        await redis.set(cacheKey, finalPrice, { ex: 60 });
        return finalPrice;

    } catch (error) {
        // 数据获取失败时阻断交易，防止以异常低价成交
        throw new Error('无法从外部节点获取实时数据');
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

    const SELL_LOSS_RATE = 0.05;

    try {
        const userKey = `user:${username}`;
        let userStr = await redis.get(userKey);
        let user = typeof userStr === 'string' ? JSON.parse(userStr) : userStr;
        
        if (!user) {
            user = { balance: 10000 };
            await redis.set(userKey, JSON.stringify(user));
        }

        const portfolioKey = `portfolio:${username}`;

        // 处理前端查询持仓的独立逻辑
        if (action === 'query') {
            const positionDataStr = await redis.hget(portfolioKey, authorName);
            let positionData = positionDataStr;
            if (typeof positionDataStr === 'string') {
                try { positionData = JSON.parse(positionDataStr); } catch(e){}
            }
            
            let currentPos = 0;
            if (typeof positionData === 'object' && positionData !== null) {
                currentPos = positionData.shares || 0;
            } else {
                currentPos = Number(positionDataStr) || 0;
            }
            
            return res.status(200).json({
                newBalance: user.balance || 10000,
                newPosition: currentPos
            });
        }

        // 调用价格计算函数
        let currentPrice;
        try {
            currentPrice = await getAuthorPrice(authorName);
        } catch (priceError) {
            return res.status(500).json({ error: '实时市值读取失败，为保护资金安全已拦截交易。' });
        }

        const price = Number(currentPrice);

        const positionDataStr = await redis.hget(portfolioKey, authorName);
        let positionData = positionDataStr;
        if (typeof positionDataStr === 'string') {
            try { positionData = JSON.parse(positionDataStr); } catch(e){}
        }

        let currentShares = 0;
        let avgCost = 0;
        if (typeof positionData === 'object' && positionData !== null) {
            currentShares = positionData.shares || 0;
            avgCost = positionData.avgCost || price;
        } else {
            currentShares = Number(positionDataStr) || 0;
            avgCost = price;
        }

        const totalValue = tradeAmount * price;

        // 买入与平空方向结算
        if (action === 'buy') {
            if (currentShares >= 0) {
                if ((user.balance || 0) < totalValue) {
                    return res.status(400).json({ error: `余额不足以完成买入操作。` });
                }
                const currentTotalValue = currentShares * avgCost;
                user.balance -= totalValue;
                currentShares += tradeAmount;
                avgCost = (currentTotalValue + totalValue) / currentShares;
            } 
            else if (currentShares < 0 && Math.abs(currentShares) < tradeAmount) {
                const coverAmount = Math.abs(currentShares);
                const longAmount = tradeAmount - coverAmount;
                
                const pnl = (avgCost - price) * coverAmount;
                const marginReleased = avgCost * coverAmount;
                user.balance += (marginReleased + pnl);
                
                const longCost = longAmount * price;
                if ((user.balance || 0) < longCost) {
                    return res.status(400).json({ error: '平空成功，但资金释放后仍不足以建立多头仓位。' });
                }
                user.balance -= longCost;
                
                currentShares = longAmount;
                avgCost = price;
            } 
            else {
                const pnl = (avgCost - price) * tradeAmount;
                const marginReleased = avgCost * tradeAmount;
                user.balance += (marginReleased + pnl);
                currentShares += tradeAmount;
                if (currentShares === 0) avgCost = 0;
            }
        } 
        // 卖出与做空方向结算
        else if (action === 'sell') {
            const lossFee = totalValue * SELL_LOSS_RATE;

            if (currentShares >= tradeAmount) {
                const actualReturn = totalValue - lossFee;
                user.balance += actualReturn;
                currentShares -= tradeAmount;
                if (currentShares === 0) avgCost = 0;
            } 
            else if (currentShares > 0 && currentShares < tradeAmount) {
                const closeLongAmount = currentShares;
                const shortAmount = tradeAmount - currentShares;
                
                const closeValue = closeLongAmount * price;
                const closeFee = closeValue * SELL_LOSS_RATE;
                user.balance += (closeValue - closeFee);
                
                const marginRequired = shortAmount * price;
                const shortFee = marginRequired * SELL_LOSS_RATE;
                const totalRequired = marginRequired + shortFee;
                
                if ((user.balance || 0) < totalRequired) {
                    return res.status(400).json({ error: '当前余额不足以支付做空操作的保证金。' });
                }
                user.balance -= totalRequired;
                
                currentShares = -shortAmount;
                avgCost = price;
            } 
            else {
                const marginRequired = tradeAmount * price;
                const totalRequired = marginRequired + lossFee;

                if ((user.balance || 0) < totalRequired) {
                    return res.status(400).json({ error: '当前余额不足以支付做空操作的保证金。' });
                }

                const currentShortValue = Math.abs(currentShares) * avgCost;
                const newShortValue = currentShortValue + marginRequired;
                
                user.balance -= totalRequired;
                currentShares -= tradeAmount;
                avgCost = newShortValue / Math.abs(currentShares);
            }
        } else {
            return res.status(400).json({ error: '无法识别的交易指令。' });
        }

        await redis.set(userKey, JSON.stringify(user));
        await redis.hset(portfolioKey, { [authorName]: JSON.stringify({ shares: currentShares, avgCost: avgCost }) });

        const tradeRecord = {
            id: Date.now().toString(),
            username,
            target: authorName,
            type: 'author_stock',
            action,
            price: price,
            amount: tradeAmount,
            time: Date.now()
        };

        await redis.lpush('global_trades', JSON.stringify(tradeRecord));
        await redis.lpush(`user_trades:${username}`, JSON.stringify(tradeRecord));

        res.status(200).json({ 
            message: '操作完成',
            newBalance: user.balance,
            newPosition: currentShares,
            avgCost: avgCost,
            executedPrice: price
        });

    } catch (error) {
        res.status(500).json({ error: '处理交易数据时发生服务器异常。' });
    }
}
