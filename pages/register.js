import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Register() {
    const router = useRouter();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    
    // 控制当前在哪个步骤：1是填账号密码，2是显示验证链接
    const [step, setStep] = useState(1);
    const [verifyUrl, setVerifyUrl] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // 第一步：点击注册，生成并请求验证链接
    const handleInitiateRegister = async (e) => {
        e.preventDefault();
        
        if (!formData.username || !formData.password) {
            setMessage('请填写名字和密码');
            return;
        }

        setLoading(true);
        setMessage('');

        const qq = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        const token = '9a3f6c1d8e2b4a7f0c5d9e3b1a6f8c2d';

        try {
            const res = await fetch('/api/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qq, token })
            });

            const text = await res.text();
            let url = text.match(/https?:\/\/[^\s"]+/) ? text.match(/https?:\/\/[^\s"]+/)[0] : text;
            
            if (url.includes('http')) {
                setVerifyUrl(url);
                setStep(2); // 成功拿到链接，进入第二步
            } else {
                setMessage('验证接口未返回有效链接');
            }
        } catch (err) {
            setMessage('获取验证链接失败，请检查网络');
        } finally {
            setLoading(false);
        }
    };

    // 第二步：用户绑完后点击确认，提交给数据库
    const handleConfirmRegister = async () => {
        setLoading(true);
        setMessage('');

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (res.ok) {
                // 存入本地立刻生效，Header 就可以显示名字了
                localStorage.setItem('username', formData.username);
                setMessage('注册成功！正在跳转...');
                setTimeout(() => {
                    router.push('/');
                }, 1000);
            } else {
                const data = await res.json();
                setMessage(data.error || '注册失败');
            }
        } catch (err) {
            setMessage('服务器提交异常');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4">
            <Head>
                <title>注册账号 - WikitDB</title>
            </Head>
            
            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl">
                <h1 className="text-2xl font-bold text-white mb-6 text-center">注册新账号</h1>
                
                {message && (
                    <div className="mb-4 p-3 rounded bg-gray-700/50 text-gray-300 text-sm text-center border border-gray-600">
                        {message}
                    </div>
                )}
                
                <form onSubmit={step === 1 ? handleInitiateRegister : (e) => e.preventDefault()} className="space-y-4">
                    {/* 步骤 1：只显示名字和密码 */}
                    {step === 1 && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">显示名称</label>
                                <input 
                                    type="text" 
                                    name="username" 
                                    value={formData.username} 
                                    onChange={handleChange} 
                                    className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">登录密码</label>
                                <input 
                                    type="password" 
                                    name="password" 
                                    value={formData.password} 
                                    onChange={handleChange} 
                                    className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                                />
                            </div>
                            
                            <button 
                                type="submit" 
                                disabled={loading} 
                                className="w-full text-white bg-indigo-600 hover:bg-indigo-700 font-medium rounded-lg text-sm px-5 py-2.5 mt-6 transition-all disabled:opacity-50 shadow-lg"
                            >
                                {loading ? '正在请求验证...' : '注册并验证 Wikidot'}
                            </button>
                        </>
                    )}

                    {/* 步骤 2：隐藏输入框，只显示验证链接和确认按钮 */}
                    {step === 2 && (
                        <div className="p-4 bg-gray-900/50 border border-gray-600 rounded-lg space-y-4">
                            <p className="text-sm text-gray-300 leading-relaxed text-center">
                                验证链接已生成。请点击下方按钮前往授权绑定，完成后点击确认。
                            </p>
                            
                            <a 
                                href={verifyUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block w-full py-2.5 text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                前往授权页
                            </a>
                            
                            <button 
                                type="button" 
                                onClick={handleConfirmRegister} 
                                disabled={loading}
                                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                {loading ? '正在提交...' : '我已完成绑定，确认注册'}
                            </button>

                            <button 
                                type="button" 
                                onClick={() => setStep(1)} 
                                disabled={loading}
                                className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors mt-2"
                            >
                                返回修改信息
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
