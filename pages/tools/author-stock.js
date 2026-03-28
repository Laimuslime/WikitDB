// pages/tools/author-stock.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../../components/Layout';
import TradingChart from '../../components/TradingChart';

export default function AuthorStock() {
    const [username, setUsername] = useState('Laimu_slime');
    const [selectedAuthor, setSelectedAuthor] = useState('Laimu_slime');
    const [chartData, setChartData] = useState([]);
    
    const [userBalance, setUserBalance] = useState(10000);
    const [userPosition, setUserPosition] = useState(0);

    // 请求新写的 K 线专用接口
    useEffect(() => {
        const fetchStockData = async () => {
            if (!selectedAuthor) return;
            try {
                // 注意这里请求路径改了，避免与原有的 trade.js 冲突
                const res = await fetch(`/api/trade/author-kline?author=${encodeURIComponent(selectedAuthor)}`);
                const result = await res.json();
                if (result.data) {
                    setChartData(result.data);
                }
            } catch (error) {
                console.error("加载数据失败", error);
            }
        };

        const delayDebounceFn = setTimeout(() => {
            fetchStockData();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [selectedAuthor]);

    const handleBuy = async () => {
        if (chartData.length === 0) return;
        const currentPrice = chartData[chartData.length - 1].close;
        
        try {
            const res = await fetch('/api/trade/author', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, authorName: selectedAuthor, action: 'buy', currentPrice })
            });
            const data = await res.json();
            
            if (res.ok) {
                setUserBalance(data.newBalance);
                setUserPosition(data.newPosition);
                alert('买入成功！');
            } else {
                alert(data.error || '买入失败');
            }
        } catch (error) {
            alert('网络错误，请稍后再试');
        }
    };

    const handleSell = async () => {
        if (chartData.length === 0 || userPosition <= 0) return;
        const currentPrice = chartData[chartData.length - 1].close;
        
        try {
            const res = await fetch('/api/trade/author', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, authorName: selectedAuthor, action: 'sell', currentPrice })
            });
            const data = await res.json();
            
            if (res.ok) {
                setUserBalance(data.newBalance);
                setUserPosition(data.newPosition);
                alert('卖出成功！');
            } else {
                alert(data.error || '卖出失败');
            }
        } catch (error) {
            alert('网络错误，请稍后再试');
        }
    };

    return (
        <Layout>
            <Head>
                <title>作者概念股 - WikitDB</title>
            </Head>

            <div className="flex flex-col gap-6">
                <div className="flex justify-between items-end border-b border-gray-800 pb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">作者概念股交易中心</h1>
                        <p className="mt-2 text-gray-400 text-sm">在这里投资你认为有潜力的创作者。股价与发文量、存活率挂钩。</p>
                    </div>
                    <div className="text-right">
                        <div className="text-gray-400 text-sm">可用资金</div>
                        <div className="text-2xl font-mono text-green-400">¥{userBalance.toFixed(2)}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* 左侧面板：强制高度 500px，内部元素上下分布 */}
                    <div className="lg:col-span-1 bg-gray-800/40 rounded-xl border border-gray-700 p-6 flex flex-col h-[500px]">
                        {/* 顶部：搜索框 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">搜索作者</label>
                            <input 
                                type="text" 
                                value={selectedAuthor}
                                onChange={(e) => setSelectedAuthor(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        {/* 中间：信息展示区，使用 flex-1 占据剩余空间并居中对齐 */}
                        <div className="flex-1 flex flex-col justify-center space-y-4 my-4">
                            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-400">当前持有</span>
                                    <span className="text-white font-mono font-bold">{userPosition} 股</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">最新报价</span>
                                    <span className="text-blue-400 font-mono font-bold">
                                        ¥{chartData.length > 0 ? chartData[chartData.length - 1].close.toFixed(2) : '0.00'}
                                    </span>
                                </div>
                            </div>
                            
                            {/* 补充一个说明模块，填补视觉空白 */}
                            <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-800/30">
                                <div className="text-xs text-blue-400 mb-1 font-semibold">交易提示</div>
                                <div className="text-sm text-gray-400 leading-relaxed">
                                    作者的近期发文频率与单篇历史评分将直接驱动 K 线走势。大盘伴随随机波动，请谨慎投资。
                                </div>
                            </div>
                        </div>

                        {/* 底部：操作按钮 */}
                        <div className="flex gap-4 mt-auto">
                            <button 
                                onClick={handleBuy}
                                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-lg transition-colors"
                            >
                                买入看涨
                            </button>
                            <button 
                                onClick={handleSell}
                                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-lg transition-colors"
                            >
                                抛售平仓
                            </button>
                        </div>
                    </div>

                    {/* 右侧 K 线图区域 */}
                    <div className="lg:col-span-3 bg-gray-800/40 rounded-xl border border-gray-700 p-4 h-[500px]">
                        {chartData.length > 0 ? (
                            <TradingChart data={chartData} isCandle={true} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                正在查询数据或该作者暂无图表...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
