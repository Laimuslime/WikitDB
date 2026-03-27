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

    // 验证状态管理
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // 生成 10 位随机数字验证码
    const handleGenerateCode = () => {
        if (!formData.wikidotAccount) {
            setMessage('请先填写 Wikidot 账号');
            return;
        }
        
        // 随机生成 10 位数
        const code = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        setVerificationCode(code);
        setIsVerified(false);
        setMessage('');
    };

    // 调用接口验证
    const handleVerify = async () => {
        setIsVerifying(true);
        setMessage('');
        
        try {
            const res = await fetch('https://wikit.unitreaty.org/module/qq-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    qq: verificationCode,
                    token: '9a3f6c1d8e2b4a7f0c5d9e3b1a6f8c2d'
                })
            });

            if (res.ok) {
                setIsVerified(true);
            } else {
                setMessage('验证失败，请确保代码已放入个人资料中');
            }
        } catch (err) {
            setMessage('请求验证接口失败，请检查网络');
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
            setMessage('请先完成 Wikidot 账号验证');
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
                    
                    {/* Wikidot 账号验证区域 */}
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
                            <button 
                                type="button"
                                onClick={handleGenerateCode}
                                disabled={isVerified}
                                className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:bg-green-600"
                            >
                                {isVerified ? '验证通过' : '获取验证代码'}
                            </button>
                        </div>

                        {/* 验证代码提示框 */}
                        {verificationCode && !isVerified && (
                            <div className="mt-3 p-4 bg-gray-900/50 border border-gray-600 rounded-lg">
                                <p className="text-sm text-gray-300 mb-3 leading-relaxed">
                                    请将验证代码 <span className="font-mono font-bold text-white bg-gray-800 border border-gray-600 px-2 py-1 rounded">{verificationCode}</span> 放入您的 Wikidot 个人资料的「About」中，然后点击验证。
                                </p>
                                <button 
                                    type="button"
                                    onClick={handleVerify}
                                    disabled={isVerifying}
                                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isVerifying ? '正在验证...' : '验证'}
                                </button>
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
