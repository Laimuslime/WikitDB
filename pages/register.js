import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Register() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        username: '',
        wikidotAccount: '',
        email: '',
        password: ''
    });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const [verifyUrl, setVerifyUrl] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerateLink = async () => {
        if (!formData.wikidotAccount) {
            setMessage('请先填写 Wikidot 账号');
            return;
        }

        setIsVerifying(true);
        setMessage('');
        setVerifyUrl('');

        // 生成 10 位随机数当做 QQ 号传给后端
        const fakeQQ = Math.floor(1000000000 + Math.random() * 9000000000).toString();

        try {
            // 使用 URLSearchParams 兼容传统 API 的表单接收格式
            const params = new URLSearchParams();
            params.append('qq', fakeQQ);
            params.append('token', '9a3f6c1d8e2b4a7f0c5d9e3b1a6f8c2d');

            const res = await fetch('https://wikit.unitreaty.org/module/qq-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            });

            const text = await res.text();
            let extractedUrl = '';
            
            try {
                const data = JSON.parse(text);
                // 尝试从常见的返回结构中提取链接
                extractedUrl = data.url || data.link || data.data || text;
            } catch {
                // 如果后端直接返回纯文本链接
                extractedUrl = text;
            }

            // 简单校验一下是不是正常的链接格式
            if (extractedUrl && extractedUrl.includes('http')) {
                const httpMatch = extractedUrl.match(/https?:\/\/[^\s"]+/);
                setVerifyUrl(httpMatch ? httpMatch[0] : extractedUrl);
            } else {
                setMessage('获取绑定链接失败，接口返回的数据无法识别为链接');
            }
        } catch (err) {
            setMessage('请求验证接口失败，请检查控制台是否有跨域报错或网络问题');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.username || !formData.wikidotAccount || !formData.email || !formData.password) {
            setMessage('请将信息填写完整');
            return;
        }

        if (!isVerified) {
            setMessage('请先完成 Wikidot 账号验证流程');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            const data = await res.json();
            
            if (res.ok) {
                setMessage('注册成功，准备跳转...');
                setTimeout(() => {
                    router.push('/login');
                }, 1500);
            } else {
                setMessage(data.error || '注册失败');
            }
        } catch (err) {
            setMessage('网络请求异常，请重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12">
            <Head>
                <title>注册账号</title>
            </Head>
            
            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 w-full max-w-md">
                <h1 className="text-2xl font-bold text-white mb-6 text-center">注册新账号</h1>
                
                {message && (
                    <div className="mb-4 p-3 rounded bg-gray-700/50 text-gray-300 text-sm text-center border border-gray-600">
                        {message}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">用户名</label>
                        <input 
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none transition-colors"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Wikidot 账号</label>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                name="wikidotAccount"
                                value={formData.wikidotAccount}
                                onChange={handleChange}
                                disabled={isVerified}
                                className="flex-1 bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none transition-colors disabled:opacity-50"
                            />
                            {!isVerified && (
                                <button 
                                    type="button"
                                    onClick={handleGenerateLink}
                                    disabled={isVerifying}
                                    className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isVerifying ? '获取中...' : '获取绑定链接'}
                                </button>
                            )}
                        </div>

                        {verifyUrl && !isVerified && (
                            <div className="mt-3 p-4 bg-gray-900/50 border border-gray-600 rounded-lg">
                                <p className="text-sm text-gray-300 mb-3 leading-relaxed">
                                    请点击下方链接前往授权。完成绑定后，回来点击“我已完成绑定”继续注册。
                                </p>
                                <a 
                                    href={verifyUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block w-full py-2 mb-3 text-center bg-gray-800 border border-gray-600 hover:bg-gray-700 text-indigo-400 text-sm font-medium rounded-lg transition-colors break-all px-2"
                                >
                                    打开绑定链接
                                </a>
                                <button 
                                    type="button"
                                    onClick={() => setIsVerified(true)}
                                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    我已完成绑定
                                </button>
                            </div>
                        )}

                        {isVerified && (
                            <div className="mt-2 text-sm text-green-400 flex items-center">
                                账号验证已就绪
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">邮箱</label>
                        <input 
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none transition-colors"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">密码</label>
                        <input 
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none transition-colors"
                        />
                    </div>
                    
                    <button 
                        type="submit"
                        disabled={loading || !isVerified}
                        className="w-full text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:outline-none focus:ring-indigo-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors disabled:opacity-50 mt-6"
                    >
                        {loading ? '提交中...' : '确认注册'}
                    </button>
                </form>
            </div>
        </div>
    );
}
