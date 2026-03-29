import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { targetUser, amount, note, operator } = req.body;

    if (!targetUser || amount === undefined || !operator) {
        return res.status(400).json({ error: '参数不完整' });
    }

    const adjustAmount = Number(amount);
    if (isNaN(adjustAmount) || adjustAmount === 0) {
        return res.status(400).json({ error: '调账金额必须是有效的非零数字' });
    }

    try {
        const userKey = `user:${targetUser}`;
        let userStr = await redis.get(userKey);
        
        if (!userStr) return res.status(404).json({ error: '目标用户不存在' });

        let user = typeof userStr === 'string' ? JSON.parse(userStr) : userStr;
        
        const oldBalance = user.balance !== undefined ? Number(user.balance) : 10000;
        const newBalance = oldBalance + adjustAmount;

        // 防止把用户的钱扣成负数
        if (newBalance < 0) {
            return res.status(400).json({ error: `扣款失败。用户当前仅剩 ${oldBalance.toFixed(2)}，不足以扣除。` });
        }

        // 保存新余额
        user.balance = newBalance;
        await redis.set(userKey, JSON.stringify(user));

        // 留下审计痕迹
        const logEntry = {
            time: Date.now(),
            operator,
            action: 'adjust_balance',
            target: targetUser,
            details: `强制调账: ${adjustAmount > 0 ? '+' : ''}${adjustAmount} (备注: ${note || '无'})`
        };
        await redis.lpush('admin_logs', JSON.stringify(logEntry));

        return res.status(200).json({ success: true, newBalance });

    } catch (e) {
        console.error('Adjust Balance Error:', e);
        return res.status(500).json({ error: '服务器内部错误' });
    }
}
