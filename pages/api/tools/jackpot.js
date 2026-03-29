import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    const { action, username, number } = req.body;

    if (req.method === 'GET') {
        const pool = await redis.get('jackpot_pool') || 0;
        const tickets = await redis.hgetall('jackpot_tickets') || {};
        return res.status(200).json({ pool: Number(pool), tickets });
    }

    if (req.method === 'POST') {
        if (action === 'buy') {
            if (!username || !number) return res.status(400).json({ error: '参数不完整' });
            
            const userKey = `user:${username}`;
            let user = await redis.get(userKey);
            if (!user) return res.status(404).json({ error: '用户不存在' });
            if (typeof user === 'string') user = JSON.parse(user);

            if ((user.balance || 0) < 50) return res.status(400).json({ error: '余额不足 (¥50)' });

            user.balance -= 50;
            await redis.set(userKey, JSON.stringify(user));
            await redis.incrby('jackpot_pool', 50);
            await redis.hset('jackpot_tickets', { [username]: number });

            return res.status(200).json({ success: true, newBalance: user.balance });
        }

        if (action === 'draw') {
            const pool = Number(await redis.get('jackpot_pool') || 0);
            const tickets = await redis.hgetall('jackpot_tickets') || {};
            
            const winningNumber = Math.floor(Math.random() * 100).toString().padStart(2, '0');
            const winners = [];

            for (const [uname, num] of Object.entries(tickets)) {
                if (num === winningNumber) winners.push(uname);
            }

            if (winners.length > 0) {
                const prize = Math.floor(pool / winners.length);
                for (const winner of winners) {
                    const wKey = `user:${winner}`;
                    let wUser = await redis.get(wKey);
                    if (wUser) {
                        if (typeof wUser === 'string') wUser = JSON.parse(wUser);
                        wUser.balance = (wUser.balance || 0) + prize;
                        await redis.set(wKey, JSON.stringify(wUser));
                    }
                }
            }

            await redis.del('jackpot_pool');
            await redis.del('jackpot_tickets');

            return res.status(200).json({ winningNumber, winners, totalPrize: pool });
        }
    }
}
