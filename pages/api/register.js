import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '只接受 POST 请求' });
    }

    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: '注册信息没填全' });
    }

    try {
        const existingUser = await redis.get(`user:${username}`);
        if (existingUser) {
            return res.status(400).json({ error: '该用户名已被注册' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await redis.set(`user:${username}`, {
            username,
            email,
            password: hashedPassword,
            createdAt: Date.now()
        });

        res.status(200).json({ 
            message: '注册成功',
            user: { username, email }
        });

    } catch (error) {
        res.status(500).json({ error: '数据库连接异常' });
    }
}
