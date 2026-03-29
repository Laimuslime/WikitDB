import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function TagBingo() {
    const [username, setUsername] = useState(null);
    const [balance, setBalance] = useState(0);
    const [selectedTags, setSelectedTags] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [result, setResult] = useState(null);
    const [isScratched, setIsScratched] = useState(false);

    const [availableTags, setAvailableTags] = useState([]);
    const [scanCost, setScanCost] = useState(50);

    useEffect(() => {
        const storedUsername = localStorage.getItem('username');
        if (storedUsername) {
            setUsername(storedUsername);
            fetch('/api/admin/user-assets?username=' + storedUsername)
                .then(res => res.json())
                .then(data => { if(data.portfolio) setBalance(data.portfolio.balance || 0); });
        }

        fetch('/api/tools/bingo')
            .then(res => res.json())
            .then(data => {
                if (data.tags) setAvailableTags(data.tags);
                if (data.cost) setScanCost(data.cost);
            });
    }, []);

    const toggleTag = (tag) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            if (selectedTags.length >= 3) {
                alert('最多只能选择 3 个标签进行比对');
                return;
            }
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleScan = async () => {
        if (!username) return alert('请先登录系统');
        if (selectedTags.length !== 3) return alert('请精确选择 3 个标签');
        
        setIsScanning(true);
        setResult(null);
        setIsScratched(false);

        try {
            const res = await fetch('/api/tools/bingo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, selectedTags })
            });
            const data = await res.json();

            if (res.ok) {
                setResult(data);
                setBalance(data.newBalance);
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert('网络连接错误，请检查控制台。');
        } finally {
            setIsScanning(false);
        }
    };

    const handleScratch = () => {
        if (result && !isScratched) {
            setIsScratched(true);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-gray-300 p-6 font-sans select-none">
            <Head><title>标签大乐透 - WikitDB 概率实验中心</title></Head>

            <div className="max-w-md mx-auto">
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold text-white tracking-wider">WikitDB 概率实验中心</h1>
                    <p className="text-gray-500 text-xs mt-1 font-mono uppercase tracking-widest">Tag Bingo Verification</p>
                </div>

                {/* 刮刮乐主卡片主体 - 使用青色/蓝绿色调匹配 Bingo */}
                <div className="bg-[#121212] border-2 border-teal-900/50 rounded-lg p-5 shadow-[0_0_15px_rgba(20,184,166,0.2)] relative overflow-hidden">
                    {/* 顶部装饰条 */}
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <div className="h-px bg-teal-500/50 flex-1"></div>
                        <span className="text-teal-400 font-bold tracking-widest text-sm">标签大乐透</span>
                        <div className="h-px bg-teal-500/50 flex-1"></div>
                    </div>

                    <div className="text-center mb-6">
                        <div className="text-gray-400 text-xs mb-1">当前认证账户余额 (Verified Balance)</div>
                        <div className="text-2xl font-mono text-green-400 font-bold">¥ {balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                    </div>

                    {/* 选号区域 */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">选择扫描参数 (Selected: {selectedTags.length}/3)</span>
                            <span className="text-xs text-teal-500 font-bold">Cost: ¥{scanCost}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {availableTags.length === 0 ? <div className="text-xs text-gray-600 font-mono animate-pulse">Loading tags...</div> : null}
                            {availableTags.map(tag => {
                                const isSelected = selectedTags.includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        onClick={() => toggleTag(tag)}
                                        className={`px-3 py-1.5 rounded text-xs font-bold transition-all border ${
                                            isSelected 
                                            ? 'bg-teal-900/80 text-teal-300 border-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.4)]' 
                                            : 'bg-gray-900 text-gray-500 border-gray-800 hover:border-gray-600'
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 抽卡动作区 */}
                    <button 
                        onClick={handleScan} 
                        disabled={isScanning || selectedTags.length !== 3}
                        className="w-full py-4 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 border border-gray-700 rounded-md text-white font-bold text-sm tracking-widest transition-colors mb-6 shadow-inner"
                    >
                        {isScanning ? '正在检索深层数据 (Scanning)...' : `确认写入参数并扫描 (¥${scanCost})`}
                    </button>

                    <div className="space-y-1.5 mb-6 text-xs text-gray-500 font-mono bg-gray-900/50 p-3 rounded border border-gray-800">
                        <div className="text-gray-400 mb-1 border-b border-gray-700 pb-1">赔率规则 (Odds Verification):</div>
                        <div className="flex justify-between"><span>命中 1 个标签</span><span className="text-blue-400">返还 ¥{scanCost}</span></div>
                        <div className="flex justify-between"><span>命中 2 个标签</span><span className="text-orange-400">奖励 ¥{scanCost * 10}</span></div>
                        <div className="flex justify-between"><span>全中 3 个标签</span><span className="text-red-400 font-bold">大满贯 ¥{scanCost * 100}</span></div>
                    </div>

                    {/* 刮刮乐结果区域 */}
                    <div className="border border-gray-700 rounded-md p-4 bg-black relative min-h-[180px] flex flex-col justify-center">
                        <div className="text-xs text-gray-500 mb-2 font-mono absolute top-3 left-4">Result (Revealed Data):</div>
                        
                        {!result && !isScanning && (
                            <div className="text-center text-gray-600 font-mono text-sm mt-4">
                                等待数据写入...
                            </div>
                        )}

                        {isScanning && (
                            <div className="text-center text-teal-500 font-mono text-sm mt-4 animate-pulse flex flex-col items-center gap-2">
                                <span>[ ██████████ ] Extracting...</span>
                            </div>
                        )}

                        {result && (
                            <div className="relative mt-4 z-10 w-full">
                                {/* 真实内容层（处于下层） */}
                                <div className="space-y-3 w-full">
                                    <div className="text-white font-bold text-sm leading-tight border-b border-gray-800 pb-2">{result.page.title}</div>
                                    <div className="text-gray-400 text-xs font-mono">Author: <span className="text-gray-300">{result.page.author}</span></div>
                                    
                                    <div className="bg-gray-900 border border-gray-800 p-2 rounded">
                                        <div className="text-[10px] text-gray-500 uppercase mb-1">Detected Tags:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {result.page.tags && result.page.tags.length > 0 ? (
                                                result.page.tags.map(t => (
                                                    <span key={t} className={`px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold ${
                                                        result.matchedTags.includes(t) 
                                                        ? 'bg-teal-900 text-teal-300 border border-teal-700' 
                                                        : 'bg-gray-800 text-gray-500'
                                                    }`}>
                                                        {t}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-gray-600 text-[10px]">NO TAGS DETECTED</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-2 flex items-center justify-between">
                                        <div className="font-mono text-xs text-gray-400">
                                            Matches: <span className="text-white font-bold">{result.matchCount} / 3</span>
                                        </div>
                                        <div className="font-bold text-sm">
                                            {result.matchCount === 0 && <span className="text-gray-500">FAILED</span>}
                                            {result.matchCount === 1 && <span className="text-blue-400">+ ¥{scanCost}</span>}
                                            {result.matchCount === 2 && <span className="text-orange-400">+ ¥{scanCost * 10}</span>}
                                            {result.matchCount === 3 && <span className="text-red-400 animate-pulse">+ ¥{scanCost * 100}</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* 灰色刮刮乐遮罩层（未刮开时覆盖在上面） */}
                                {!isScratched && (
                                    <div 
                                        onClick={handleScratch}
                                        className="absolute -inset-2 bg-[#8a8a8a] cursor-pointer flex items-center justify-center rounded-sm overflow-hidden"
                                        style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)' }}
                                    >
                                        <span className="bg-black/60 px-5 py-2.5 rounded text-white font-bold text-sm tracking-widest border border-gray-500/30">
                                            Scratch to Verify
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
