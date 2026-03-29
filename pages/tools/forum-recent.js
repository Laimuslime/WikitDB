import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import config from '../../wikitdb.config.js';

export default function ForumRecent() {
    // 读取配置文件
    const availableSites = config.SUPPORT_WIKI || [];
    // 默认选定第一个
    const [activeSite, setActiveSite] = useState(availableSites.length > 0 ? availableSites[0] : null);
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // 当切换站点或初次加载时，触发抓取
    useEffect(() => {
        if (activeSite) {
            fetchRecentPosts(activeSite.URL);
        }
    }, [activeSite]);

    const fetchRecentPosts = async (targetUrl) => {
        setIsLoading(true);
        setPosts([]); // 切换站点时先清空列表，提升视觉反馈
        
        try {
            // 将选中的站点 URL 传给后端
            const res = await fetch(`/api/forum/recent?url=${encodeURIComponent(targetUrl)}`);
            const data = await res.json();
            
            if (res.ok) {
                setPosts(data.posts || []);
            } else {
                // 如果后端返回错误（爬不出来），给一个友好的提示
                toast.error(data.error || `连接到 ${activeSite.NAME} 数据链路失败，为保护资产安全已拦截交易。`);
            }
        } catch (error) {
            toast.error('网络请求超时，请检查节点连接');
        } finally {
            setIsLoading(false);
        }
    };

    if (!activeSite) {
        return <div className="p-8 text-white">请在 wikitdb.config.js 中配置 SUPPORT_WIKI</div>;
    }

    return (
        <div className="py-8 font-sans bg-[#0a0a0a] min-h-screen text-gray-200">
            <Head><title>全域通讯监测 (Omni-Link) - {config.SITE_NAME}</title></Head>
            
            <div className="max-w-6xl mx-auto px-4">
                <div className="mb-8 border-b border-gray-800 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <Link href="/tools" className="text-blue-500 hover:text-blue-400 text-sm mb-4 inline-block transition-colors">&larr; 返回工具箱</Link>
                        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            <i className="fa-solid fa-satellite text-blue-500"></i> 全域通讯监测 (Omni-Link)
                        </h1>
                        <p className="text-gray-400 mt-2 text-sm">
                            接入全域通讯频段，实时捕获并解密结构化的讨论数据记录。本终端基于站点配置自动连接。
                        </p>
                    </div>
                </div>

                {/* --- UI 重构：复刻 Author Stock 的卡片式布局 --- */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    
                    {/* 左侧：站点切换栏 (复刻 Ticker) */}
                    <div className="lg:col-span-1 space-y-3 lg:sticky lg:top-8 lg:h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar">
                        <div className="bg-[#121212] border border-gray-800 rounded-xl p-3 shadow-lg">
                            <h3 className="font-bold text-white mb-3 pb-2 border-b border-gray-800 flex items-center gap-2 uppercase tracking-wider text-xs">
                                <i className="fa-solid fa-satellite-dish text-blue-500"></i> 数据源
                            </h3>
                            <div className="space-y-1">
                                {availableSites.map(site => (
                                    <button
                                        key={site.URL}
                                        onClick={() => setActiveSite(site)}
                                        className={`w-full px-4 py-2.5 text-left text-sm rounded flex items-center gap-2.5 transition-colors border ${
                                            activeSite.URL === site.URL 
                                            ? 'bg-blue-900/20 text-blue-300 border-blue-800' 
                                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800 border-transparent'
                                        }`}
                                    >
                                        {site.ImgURL ? (
                                            <img src={site.ImgURL} alt={site.NAME} className="w-4 h-4 object-contain" />
                                        ) : (
                                            <div className="w-4 h-4 rounded bg-gray-800 text-gray-400 flex items-center justify-center font-mono text-[10px] uppercase border border-gray-700">
                                                {site.NAME.substring(0, 1)}
                                            </div>
                                        )}
                                        <span className="font-medium truncate">{site.NAME}</span>
                                        {activeSite.URL === site.URL && (
                                            <i className="fa-solid fa-circle-check ml-auto text-blue-500 text-xs"></i>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 右侧：交易指令终端与数据展示 (复刻 Trade Terminal) */}
                    <div className="lg:col-span-3 space-y-6 animate-fade-in">
                        
                        {/* 站点详情卡片 */}
                        <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 shadow-lg">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-gray-800 pb-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                        {activeSite.ImgURL ? (
                                            <img src={activeSite.ImgURL} alt={activeSite.NAME} className="h-8 w-8 object-contain shadow-md" />
                                        ) : (
                                            <div className="h-8 w-8 rounded bg-gray-800 text-gray-400 flex items-center justify-center font-mono text-sm uppercase border border-gray-700">
                                                {activeSite.NAME.substring(0, 1)}
                                            </div>
                                        )}
                                        {activeSite.NAME}
                                        <span className="text-[10px] bg-gray-900 text-gray-500 px-2 py-1 rounded border border-gray-700 font-mono uppercase tracking-widest">WIKI</span>
                                    </h2>
                                    <div className="text-xs text-gray-500 mt-2 font-mono flex items-center gap-2">
                                        <i className="fa-solid fa-link text-gray-700"></i>
                                        <a href={activeSite.URL} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-blue-500 truncate max-w-sm">
                                            {activeSite.URL}
                                        </a>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 font-mono uppercase mb-1 tracking-widest">Intercepted from</div>
                                    <div className="text-4xl font-bold text-blue-400 font-mono tracking-tight">
                                        {posts.length} THREADS
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => fetchRecentPosts(activeSite.URL)} 
                                disabled={isLoading} 
                                className="bg-blue-900/50 hover:bg-blue-800 border border-blue-700 disabled:bg-gray-800 disabled:border-gray-700 disabled:text-gray-500 text-blue-300 px-8 py-3 rounded-lg font-bold font-mono transition-colors whitespace-nowrap shadow-md uppercase tracking-wider"
                            >
                                {isLoading ? 'SCANNING SITES...' : 'SCAN SITE'}
                            </button>
                        </div>

                        {/* 数据结果卡片 (复刻 Trading Chart 的位置和风格) */}
                        <div className="bg-[#121212] border border-gray-800 rounded-xl p-5 shadow-lg">
                            <h3 className="font-bold text-white mb-5 border-b border-gray-800 pb-3 flex items-center gap-2 uppercase tracking-wider text-sm">
                                <i className="fa-solid fa-satellite text-blue-500"></i> 全域通讯监测网 (Comm-Link)
                            </h3>
                            
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-[#0a0a0a] text-gray-500 font-mono text-[10px] uppercase tracking-wider border-b border-gray-800">
                                        <tr>
                                            <th className="px-6 py-4 font-normal">Thread Title / ID (节点)</th>
                                            <th className="px-6 py-4 font-normal">Sector / Board (讨论区)</th>
                                            <th className="px-6 py-4 font-normal">Entity / Author (发信人)</th>
                                            <th className="px-6 py-4 font-normal text-right">Timestamp (最后通讯)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/50">
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-16 text-center text-gray-500 font-mono tracking-widest flex flex-col items-center">
                                                    <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2 opacity-50"></i>
                                                    [扫描目标节点中，请稍候...]
                                                </td>
                                            </tr>
                                        ) : posts.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-16 text-center text-gray-500 font-mono tracking-widest flex flex-col items-center">
                                                    <i className="fa-solid fa-ghost text-2xl mb-2 opacity-30"></i>
                                                    [未在该频段发现有效通讯记录]
                                                </td>
                                            </tr>
                                        ) : (
                                            posts.map((post, idx) => (
                                                <tr key={`${post.id}-${idx}`} className="hover:bg-gray-800/40 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-gray-200 group-hover:text-blue-400 transition-colors truncate max-w-md">
                                                            {post.title}
                                                        </div>
                                                        <div className="text-[10px] text-gray-600 font-mono mt-1 flex items-center gap-2">
                                                            <span className="bg-gray-900 px-1.5 py-0.5 rounded border border-gray-700">ID: {post.id}</span>
                                                            <a href={`/tools/forum?id=${post.id}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <i className="fa-solid fa-satellite-dish mr-1"></i> 解析内容
                                                            </a>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-block px-2 py-1 bg-gray-900 border border-gray-700 text-gray-400 text-[10px] uppercase font-bold rounded truncate max-w-[150px]">
                                                            {post.board}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded bg-gray-800 text-gray-400 flex items-center justify-center font-mono text-[9px] uppercase border border-gray-700">
                                                                {post.author.substring(0, 1)}
                                                            </div>
                                                            <span className="text-blue-300 text-xs font-bold tracking-wide">
                                                                {post.author}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-gray-500 font-mono text-xs">
                                                        {post.date}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
