// pages/api/register.js
import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { action, username, password } = req.body;

    if (!username) return res.status(400).json({ error: '缺少显示名称' });

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

    if (action === 'check') {
        const tempRecord = await redis.get(`temp_reg:${username}`);
        if (!tempRecord) return res.status(400).json({ error: '验证会话已过期 (超过24小时) 或不存在' });

        try {
            const queryRes = await fetch('https://wikit.unitreaty.org/wikidot/pagehistory?wiki=wikkit&page=https://wikkit.wikidot.com/wikitdb:verify');
            const historyData = await queryRes.json();
            
            let wdid = '';
            
            // 提取所有 rev: 开头的键名，按数字从大到小排序（最新在前）
            const revKeys = Object.keys(historyData)
                .filter(key => key.startsWith('rev:'))
                .sort((a, b) => {
                    const numA = parseInt(a.split(':')[1], 10);
                    const numB = parseInt(b.split(':')[1], 10);
                    return numB - numA;
                });
            
            // 只取前 10 条进行验证
            const top10Keys = revKeys.slice(0, 10);

            for (const key of top10Keys) {
                const rev = historyData[key];
                if (rev.comment && rev.comment.trim() === tempRecord.verifyCode) {
                    wdid = rev.username; // 数据结构里是 username
                    break;
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
