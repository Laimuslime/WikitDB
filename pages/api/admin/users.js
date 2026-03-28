// pages/api/admin/users.js
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    // 【GET 请求】：获取所有用户列表，渲染后台表格
    if (req.method === 'GET') {
        try {
            // 扫描所有的 user 键
            const keys = await redis.keys('user:*');
            const users = [];

            for (const key of keys) {
                let userData = await redis.get(key);
                if (userData) {
                    if (typeof userData === 'string') {
                        userData = JSON.parse(userData);
                    }
                    // 剔除密码等敏感信息，提取后台需要的数据
                    users.push({
                        username: userData.username,
                        wikidotAccount: userData.wikidotAccount || userData.wikidotUser || '',
                        balance: userData.balance || 0,
                        role: userData.role || 'user',
                        status: userData.status || 'active',
                        createdAt: userData.createdAt || Date.now()
                    });
                }
            }

            // 按注册时间或余额排序
            users.sort((a, b) => b.balance - a.balance);

            return res.status(200).json({ users });
        } catch (error) {
            console.error("Admin Fetch Users Error:", error);
            return res.status(500).json({ error: '读取用户数据库失败' });
        }
    }

    // 【POST 请求】：执行管理员操作 (封禁、解封、提权、降级)
    if (req.method === 'POST') {
        const { targetUser, action, operator } = req.body;

        if (!targetUser || !action) {
            return res.status(400).json({ error: '参数不完整' });
        }

        // 简单的越权保护检查 (实际应用中这里应检查 operator 的真实 role)
        if (targetUser === operator && (action === 'ban' || action === 'demote')) {
            return res.status(403).json({ error: '安全限制：你不能封禁或降级自己' });
        }

        try {
            const userKey = `user:${targetUser}`;
            let userData = await redis.get(userKey);

            if (!userData) {
                return res.status(404).json({ error: '找不到目标用户' });
            }

            if (typeof userData === 'string') {
                userData = JSON.parse(userData);
            }

            // 执行状态变更逻辑
            switch (action) {
                case 'ban':
                    userData.status = 'banned';
                    break;
                case 'unban':
                    userData.status = 'active';
                    break;
                case 'promote':
                    userData.role = 'admin';
                    break;
                case 'demote':
                    userData.role = 'user';
                    break;
                default:
                    return res.status(400).json({ error: '未知的操作类型' });
            }

            // 将修改后的数据写回 Redis
            await redis.set(userKey, JSON.stringify(userData));

            return res.status(200).json({ success: true, message: `已成功更新 ${targetUser} 的状态` });

        } catch (error) {
            console.error("Admin User Action Error:", error);
            return res.status(500).json({ error: '数据库写入失败' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
