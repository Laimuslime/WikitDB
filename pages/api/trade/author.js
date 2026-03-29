// pages/api/trade/author.js
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// 获取作者的实际身价 (保留了你原有的抓取逻辑)
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

    // 设定售出/做空操作的折损率（5%）
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

        // 【查询逻辑】如果是 query，就只返回余额和持仓，不做任何扣款查价
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

        // 获取实时价格
        const currentPrice = await getAuthorPrice(authorName);
        const price = Number(currentPrice);

        // 读取旧仓位和均价 (兼容纯数字和对象格式)
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

        // ===== 买入逻辑 (开多 / 平空) =====
        if (action === 'buy') {
            if (currentShares >= 0) {
                // 场景 1：纯多头开仓 / 加仓
                if ((user.balance || 0) < totalValue) {
                    return res.status(400).json({ error: `余额不足！买入需 ${totalValue.toFixed(2)}，当前可用 ${(user.balance||0).toFixed(2)}` });
                }
                const currentTotalValue = currentShares * avgCost;
                user.balance -= totalValue;
                currentShares += tradeAmount;
                avgCost = (currentTotalValue + totalValue) / currentShares;
            } 
            else if (currentShares < 0 && Math.abs(currentShares) < tradeAmount) {
                // 场景 2：空头平仓 + 反手开多
                const coverAmount = Math.abs(currentShares);
                const longAmount = tradeAmount - coverAmount;
                
                // 平空：释放保证金并结算差价利润
                const pnl = (avgCost - price) * coverAmount;
                const marginReleased = avgCost * coverAmount;
                user.balance += (marginReleased + pnl);
                
                // 开多
                const longCost = longAmount * price;
                if ((user.balance || 0) < longCost) {
                    return res.status(400).json({ error: '平空成功，但释放后的余额不足以开多仓' });
                }
                user.balance -= longCost;
                
                currentShares = longAmount;
                avgCost = price;
            } 
            else {
                // 场景 3：纯空头平仓 / 减仓
                const pnl = (avgCost - price) * tradeAmount;
                const marginReleased = avgCost * tradeAmount;
                user.balance += (marginReleased + pnl);
                currentShares += tradeAmount;
                if (currentShares === 0) avgCost = 0;
            }
        } 
        // ===== 卖出逻辑 (平多 / 做空) =====
        else if (action === 'sell') {
            const lossFee = totalValue * SELL_LOSS_RATE; // 5% 折损费

            if (currentShares >= tradeAmount) {
                // 场景 1：纯多头平仓 (扣除5%折损)
                const actualReturn = totalValue - lossFee;
                user.balance += actualReturn;
                currentShares -= tradeAmount;
                if (currentShares === 0) avgCost = 0;
            } 
            else if (currentShares > 0 && currentShares < tradeAmount) {
                // 场景 2：多头平仓 + 反手做空
                const closeLongAmount = currentShares;
                const shortAmount = tradeAmount - currentShares;
                
                // 平多
                const closeValue = closeLongAmount * price;
                const closeFee = closeValue * SELL_LOSS_RATE;
                user.balance += (closeValue - closeFee);
                
                // 开空
                const marginRequired = shortAmount * price;
                const shortFee = marginRequired * SELL_LOSS_RATE;
                const totalRequired = marginRequired + shortFee;
                
                if ((user.balance || 0) < totalRequired) {
                    return res.status(400).json({ error: `余额不足！反手做空及折损共需 ${totalRequired.toFixed(2)}` });
                }
                user.balance -= totalRequired;
                
                currentShares = -shortAmount;
                avgCost = price;
            } 
            else {
                // 场景 3：纯开空 / 加仓做空 (扣除保证金和折损)
                const marginRequired = tradeAmount * price;
                const totalRequired = marginRequired + lossFee;

                if ((user.balance || 0) < totalRequired) {
                    return res.status(400).json({ error: `做空保证金不足！需 ${totalRequired.toFixed(2)} (含5%折损)` });
                }

                const currentShortValue = Math.abs(currentShares) * avgCost;
                const newShortValue = currentShortValue + marginRequired;
                
                user.balance -= totalRequired;
                currentShares -= tradeAmount; // 负数减去正数，让仓位往负方向变大
                avgCost = newShortValue / Math.abs(currentShares);
            }
        } else {
            return res.status(400).json({ error: '未知的交易操作' });
        }

        // 统一写回数据库 (使用 JSON.stringify 确保持仓对象安全存储)
        await redis.set(userKey, JSON.stringify(user));
        await redis.hset(portfolioKey, { [authorName]: JSON.stringify({ shares: currentShares, avgCost: avgCost }) });

        // 记录全局流水
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
            message: action === 'buy' ? '买入/平空结算完成' : '卖出/做空结算完成',
            newBalance: user.balance,
            newPosition: currentShares,
            avgCost: avgCost,
            executedPrice: price
        });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
}
