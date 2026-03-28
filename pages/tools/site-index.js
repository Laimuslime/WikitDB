// pages/tools/site-index.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
const config = require('../../wikitdb.config.js');

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-xl">
                <p className="text-gray-400 text-xs mb-1">{label}</p>
                <p className="text-cyan-400 font-mono font-bold">
                    大盘点位: {payload[0].value.toFixed(2)}
                </p>
            </div>
        );
    }
    return null;
};

export default function SiteIndex() {
    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState(null);
    const [chartData, setChartData] = useState([]);
    
    const [username, setUsername] = useState('Laimu_slime');
    const [margin, setMargin] = useState(100);
    const [message, setMessage] = useState('');

    // 初始化时拿到配置文件里的站点列表
    useEffect(() => {
        const wikis = config.SUPPORT_WIKI || config.SUPPOST_WIKI || [];
        setSites(wikis);
        if (wikis.length > 0) setSelectedSite(wikis[0]);
    }, []);

    // 绘制大盘面积走势图
    useEffect(() => {
        if (!selectedSite) return;
        
        // 模拟大盘的起始点位，按名字长度随便整一个基准值
        let baseIndex = 3000 + (selectedSite.NAME?.length || 5) * 100;
        const data = [];
        const now = new Date();
        
        for (let i = 60; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
            
            // 模拟大盘的缓和起伏
            const change = (Math.random() - 0.48) * 45; 
            baseIndex = Math.max(1000, baseIndex + change);
            
            data.push({
                time: dateStr,
                index: parseFloat(baseIndex.toFixed(2))
            });
        }
        setChartData(data);
        setMessage('');
    }, [selectedSite]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        try {
            const res = await fetch('/api/trade/open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    site: selectedSite.PARAM,
                    pageId: 'index',
                    pageTitle: `[ETF] ${selectedSite.NAME || selectedSite.PARAM} 大盘指数`,
                    direction: 'long', // 基金默认只做多
                    lockType: 'time',
                    margin: Number(margin),
                    leverage: 1
                })
            });

            const data = await res.json();
            
            if (!res.ok) {
                setMessage(data.error || '认购失败');
            } else {
                setMessage(`认购成功！份额已确认，余额: ¥${data.newBalance.toFixed(2)}`);
            }
        } catch (error) {
            setMessage('网络错误，请检查接口');
        }
    };

    return (
        <>
            <Head>
                <title>站点大盘指数 - WikitDB</title>
            </Head>

            <div className="flex flex-col gap-6">
                <div className="border-b border-gray-800 pb-4">
                    <h1 className="text-3xl font-bold text-white tracking-tight">站点大盘指数基金 (ETF)</h1>
                    <p className="mt-2 text-gray-400 text-sm">将各分站的繁荣度量化为点数。认购指数基金，享受大盘整体上升带来的红利。</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3 flex flex-col gap-4">
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            {sites.map(site => (
                                <button
                                    key={site.PARAM}
                                    onClick={() => setSelectedSite(site)}
                                    className={`px-5 py-2 rounded-lg font-bold transition-colors whitespace-nowrap ${
                                        selectedSite?.PARAM === site.PARAM 
                                        ? 'bg-cyan-700 text-white' 
                                        : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700'
                                    }`}
                                >
                                    <i className="fa-solid fa-chart-area mr-2 opacity-70"></i>
                                    {site.NAME || site.PARAM}
                                </button>
                            ))}
                        </div>

                        <div className="bg-gray-800/40 rounded-xl border border-gray-700 p-6 h-[450px] shadow-lg relative">
                            {/* 背景光晕装饰 */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-900/10 rounded-full blur-[80px] pointer-events-none"></div>
                            
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorIndex" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis dataKey="time" stroke="#9ca3af" tick={{fontSize: 12}} tickMargin={10} />
                                    <YAxis stroke="#9ca3af" domain={['auto', 'auto']} tick={{fontSize: 12}} width={80} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="index" 
                                        stroke="#06b6d4" 
                                        strokeWidth={2}
                                        fillOpacity={1} 
                                        fill="url(#colorIndex)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="lg:col-span-1 bg-gray-800/40 rounded-xl border border-gray-700 p-6 flex flex-col h-full shadow-lg">
                        <h2 className="text-xl font-bold text-white mb-6 border-b border-gray-700 pb-2">认购终端</h2>
                        
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50 mb-6">
                            <div className="text-sm text-gray-400 mb-1">大盘当前点位</div>
                            <div className="text-3xl font-mono font-bold text-cyan-400">
                                {chartData.length > 0 ? chartData[chartData.length - 1].index.toFixed(2) : '0.00'}
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">交易账户</label>
                                <input 
                                    type="text" 
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">申购金额</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    value={margin}
                                    onChange={(e) => setMargin(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                            
                            <div className="text-xs text-gray-500 leading-relaxed mt-2">
                                * 提示：大盘指数基金属于长线投资品种，认购后默认执行时间锁，降低短期波动风险。
                            </div>

                            <button 
                                type="submit"
                                className="w-full py-3 rounded-lg font-bold text-white mt-auto transition-colors shadow-lg bg-cyan-700 hover:bg-cyan-600"
                            >
                                确认认购份额
                            </button>
                        </form>

                        {message && (
                            <div className={`mt-4 p-3 text-sm rounded-lg border ${
                                message.includes('成功') ? 'bg-green-900/30 text-green-400 border-green-800/50' : 'bg-red-900/30 text-red-400 border-red-800/50'
                            }`}>
                                {message}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
