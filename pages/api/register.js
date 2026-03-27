import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    // 剔除不需要的字段，只拿名字和密码
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '请将信息填写完整' });
    }

    try {
        const exists = await redis.get(`user:${username}`);
        if (exists) return res.status(400).json({ error: '该显示名称已被注册' });

        const hashedPassword = await bcrypt.hash(password, 10);
        
        await redis.set(`user:${username}`, { 
            username, 
            password: hashedPassword, 
            createdAt: Date.now() 
        });
        
        res.status(200).json({ message: '注册成功' });
    } catch (e) { 
        res.status(500).json({ error: '数据库写入异常' }); 
    }
}
