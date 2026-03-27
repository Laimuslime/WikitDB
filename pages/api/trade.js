import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '仅支持 POST 请求' });
    }

    const { username, site, pageId, pageTitle, direction, lockType, margin, leverage } = req.body;

    if (!username) {
        return res.status(401).json({ error: '你还没有登录，无法开仓' });
    }

    const marginNum = Number(margin);
    if (isNaN(marginNum) || marginNum <= 0) {
        return res.status(400).json({ error: '请输入有效的保证金金额' });
    }

    try {
        // 1. 获取用户当前数据
        const user = await redis.get(`user:${username}`);
        if (!user) {
            return res.status(404).json({ error: '找不到该用户' });
        }

        const currentBalance = user.balance !== undefined ? Number(user.balance) : 10000;

        // 2. 计算手续费 (假设 1%) 和总成本
        const fee = marginNum * 0.01;
        const totalCost = marginNum + fee;

        // 3. 校验余额
        if (currentBalance < totalCost) {
            return res.status(400).json({ error: `余额不足！开仓需 ${totalCost.toFixed(2)} (含手续费)，当前可用 ${currentBalance.toFixed(2)}` });
        }

        // 4. 扣除余额并更新用户库
        user.balance = currentBalance - totalCost;
        await redis.set(`user:${username}`, user);

        // 5. 构建交易流水记录
        const tradeRecord = {
            id: Date.now().toString(),
            username,
            site,
            pageId,
            pageTitle,
            direction, 
            lockType,  
            margin: marginNum, 
            leverage,  
            fee,
            status: 'open',
            openTime: Date.now()
        };

        // 存入 Redis 流水表
        await redis.lpush('global_trades', JSON.stringify(tradeRecord));
        await redis.lpush(`user_trades:${username}`, JSON.stringify(tradeRecord));

        res.status(200).json({ 
            message: '开仓成功', 
            tradeId: tradeRecord.id,
            newBalance: user.balance 
        });
    } catch (error) {
        res.status(500).json({ error: '数据库写入失败' });
    }
}
