import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Register() {
    const router = useRouter();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    
    const [step, setStep] = useState(1);
    const [verifyUrl, setVerifyUrl] = useState('');
    const [wdid, setWdid] = useState(''); 

    // 恢复界面的状态（不管怎么刷新，只靠用户名去后端找）
    useEffect(() => {
        const sessionStr = localStorage.getItem('wikit_reg_ui_state');
        if (sessionStr) {
            try {
                const state = JSON.parse(sessionStr);
                setFormData({ username: state.username, password: '' });
                setVerifyUrl(state.verifyUrl || '');
                setWdid(state.wdid || '');
                setStep(state.step || 1);
            } catch (e) {
                localStorage.removeItem('wikit_reg_ui_state');
            }
        }
    }, []);

    const saveState = (newState) => {
        localStorage.setItem('wikit_reg_ui_state', JSON.stringify(newState));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRegisterStart = async (e) => {
        e.preventDefault();
        
        if (!formData.username || !formData.password) {
            setMessage('名字和密码都要写全');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'start', 
                    username: formData.username, 
                    password: formData.password 
                })
            });

            const data = await res.json();

            if (res.ok && data.verifyUrl) {
                setVerifyUrl(data.verifyUrl);
                setStep(2);
                saveState({ username: formData.username, step: 2, verifyUrl: data.verifyUrl });
            } else {
                setMessage(data.error || '获取链接失败');
            }
        } catch (err) {
            setMessage('网络请求失败，请检查连接');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckBind = async () => {
        setLoading(true);
        setMessage('');

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'check', 
                    username: formData.username 
                })
            });
            
            const data = await res.json();

            if (res.ok && data.wdid) {
                setWdid(data.wdid);
                setStep(3);
                saveState({ username: formData.username, step: 3, verifyUrl, wdid: data.wdid });
            } else {
                setMessage(data.error || '查询绑定状态失败了，稍后再试一下');
            }
        } catch (err) {
            setMessage('服务器通信失败，稍后再试一下');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalSubmit = async () => {
        setLoading(true);
        setMessage('');

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'submit', 
                    username: formData.username 
                })
            });
            
            if (res.ok) {
                localStorage.removeItem('wikit_reg_ui_state');
                localStorage.setItem('username', formData.username);
                
                setMessage('注册成功！正在进入首页...');
                setTimeout(() => {
                    router.push('/');
                }, 1000);
            } else {
                const data = await res.json();
                setMessage(data.error || '存入数据库时失败了');
            }
        } catch (err) {
            setMessage('提交失败，后端可能没有响应');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        localStorage.removeItem('wikit_reg_ui_state');
        setStep(1);
        setVerifyUrl('');
        setWdid('');
        setMessage('');
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
                
                <div className="space-y-4">
                    {step === 1 && (
                        <form onSubmit={handleRegisterStart} className="space-y-4">
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
                                className="w-full text-white bg-indigo-600 hover:bg-indigo-700 font-medium rounded-lg text-sm px-5 py-2.5 mt-6 transition-all disabled:opacity-50"
                            >
                                {loading ? '正在获取...' : '注册并验证 Wikidot'}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <div className="p-4 bg-gray-900/50 border border-gray-600 rounded-lg space-y-4">
                            <p className="text-sm text-gray-300 leading-relaxed text-center">
                                验证链接已生成。请前往 Wikidot 完成授权绑定。
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
                                onClick={handleCheckBind} 
                                disabled={loading}
                                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                {loading ? '正在查询...' : '我已完成绑定'}
                            </button>

                            <button 
                                type="button" 
                                onClick={handleReset} 
                                className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors mt-2"
                            >
                                返回上一步重新生成
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="p-4 bg-gray-900/50 border border-gray-600 rounded-lg space-y-5">
                            <div className="text-center">
                                <div className="text-gray-400 text-sm mb-2">已读取到您的 Wikidot 账号：</div>
                                <div className="text-xl font-bold text-indigo-400 bg-gray-900 py-2 rounded border border-gray-700">
                                    {wdid}
                                </div>
                            </div>
                            
                            <button 
                                type="button" 
                                onClick={handleFinalSubmit} 
                                disabled={loading}
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                {loading ? '正在写入数据库...' : '确认无误，完成注册'}
                            </button>

                            <button 
                                type="button" 
                                onClick={() => setStep(2)} 
                                className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors mt-2"
                            >
                                账号不对？重新验证
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
