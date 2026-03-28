// pages/api/register.js
import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { action, username, password } = req.body;

    if (!username) return res.status(400).json({ error: '缺少显示名称' });

    // 步骤一：生成验证码，并存入 Redis 临时库 (有效期 24 小时)
    if (action === 'start') {
        if (!password) return res.status(400).json({ error: '缺少密码' });

        const exists = await redis.get(`user:${username}`);
        if (exists) return res.status(400).json({ error: '该名称已被占用' });

        const verifyCode = 'WIKIT-' + Math.random().toString(36).substring(2, 8).toUpperCase();

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            await redis.set(`temp_reg:${username}`, { verifyCode, password: hashedPassword }, { ex: 86400 });
            return res.status(200).json({ verifyUrl: verifyCode }); 
        } catch (err) {
            return res.status(500).json({ error: '验证码生成失败' });
        }
    }

    // 步骤二：抓取 Wikidot 页面历史并比对摘要中的验证码
    if (action === 'check') {
        const tempRecord = await redis.get(`temp_reg:${username}`);
        if (!tempRecord) return res.status(400).json({ error: '验证会话已过期 (超过24小时) 或不存在' });

        try {
            const queryRes = await fetch('https://wikit.unitreaty.org/wikidot/pagehistory?wiki=wikkit&page=https://wikkit.wikidot.com/wikitdb:verify');
            const historyData = await queryRes.json();
            
            let wdid = '';
            
            // 直接读取 data.revisions 数组
            if (historyData.status === 'success' && historyData.data && historyData.data.revisions) {
                // 直接截取前 10 个记录进行遍历，性能拉满
                const recentRevisions = historyData.data.revisions.slice(0, 10);
                
                for (const rev of recentRevisions) {
                    // 对比 comment 字段
                    if (rev.comment && rev.comment.trim() === tempRecord.verifyCode) {
                        // 匹配成功，提取 API 中的 user 字段 (从你的新图确认字段名为 user)
                        wdid = rev.user;
                        break;
                    }
                }
            }

            if (wdid) {
                await redis.set(`temp_reg:${username}`, { ...tempRecord, wdid }, { ex: 86400 });
                return res.status(200).json({ wdid });
            } else {
                return res.status(400).json({ error: '未查到匹配的验证记录，请确保已保存并在摘要中填写了验证码' });
            }
            
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: '查询绑定状态失败，解析接口数据出错' });
        }
    }

    // 步骤三：确认无误，转移数据到正式用户库并附赠初始资金
    if (action === 'submit') {
        const tempRecord = await redis.get(`temp_reg:${username}`);
        if (!tempRecord || !tempRecord.wdid) return res.status(400).json({ error: '数据已过期或未完成验证' });

        try {
            await redis.set(`user:${username}`, {
                username,
                wikidotAccount: tempRecord.wdid,
                password: tempRecord.password,
                balance: 10000, 
                createdAt: Date.now()
            });
            await redis.del(`temp_reg:${username}`);
            return res.status(200).json({ message: '注册成功' });
        } catch (e) {
            return res.status(500).json({ error: '入库失败' });
        }
    }

    return res.status(400).json({ error: '未知操作' });
}
