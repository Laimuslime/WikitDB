// pages/api/trade/open.js
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { username, site, pageId, pageTitle, direction, lockType, margin, leverage } = req.body;

        if (!username || !margin || margin <= 0) {
            return res.status(400).json({ error: '参数错误：用户名或保证金无效' });
        }

        const userKey = `user:${username}`;
        let userData = await redis.get(userKey);

        // 如果用户不存在，初始化一个默认账户，初始资金一万元
        if (!userData) {
            userData = { balance: 10000, positions: [] };
        } else if (typeof userData === 'string') {
            userData = JSON.parse(userData);
        }

        if (userData.balance === undefined) userData.balance = 10000;
        if (!userData.positions) userData.positions = [];

        // 计算开仓手续费 (假设为 1%)
        const fee = margin * 0.01;
        const totalCost = margin + fee;

        if (userData.balance < totalCost) {
            return res.status(400).json({ error: '余额不足以支付保证金和手续费' });
        }

        // 扣除用户余额
        userData.balance -= totalCost;

        // 生成唯一流水号并创建仓位对象
        const tradeId = 'TRD' + Date.now() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const newPosition = {
            tradeId,
            site,
            pageId,
            pageTitle,
            direction,
            lockType,
            margin,
            leverage,
            openTime: new Date().toISOString(),
            status: 'open'
        };

        // 将新仓位加入用户数据
        userData.positions.push(newPosition);

        // 写回 Redis 数据库
        await redis.set(userKey, JSON.stringify(userData));

        return res.status(200).json({
            success: true,
            tradeId,
            newBalance: userData.balance
        });

    } catch (error) {
        console.error('Trade open error:', error);
        return res.status(500).json({ error: '服务器内部错误，开仓失败' });
    }
}
