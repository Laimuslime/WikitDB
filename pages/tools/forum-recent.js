import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import config from '../../wikitdb.config.js'; // 如果你的 config 里配置了站点列表，可以解开这行注释使用

export default function ForumRecent() {
    // 假设这是你配置文件里的站点列表。如果解开了上面的注释，可以换成 config.SITES
    const availableSites = [
        { id: 'ubmh', name: 'SCP-CN' },
        { id: 'scp-wiki', name: 'SCP-EN' },
        { id: 'wanderers-library', name: 'WL-EN' },
        { id: 'backrooms-wiki-cn', name: 'Backrooms-CN' }
    ];

    const [activeSite, setActiveSite] = useState(availableSites[0].id);
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // 当切换 Tab 或初次加载时，触发抓取
    useEffect(() => {
        fetchRecentPosts(activeSite);
    }, [activeSite]);

    const fetchRecentPosts = async (targetSite) => {
        setIsLoading(true);
        setPosts([]); // 切换站点时先清空列表，提升视觉反馈
        
        try {
            // 将选中的站点标识传给后端
            const res = await fetch(`/api/forum/recent?wiki=${targetSite}`);
            const data = await res.json();
            
            if (res.ok) {
                setPosts(data.posts || []);
            } else {
                toast.error(data.error || `抓取 ${targetSite} 失败`);
            }
        } catch (error) {
            toast.error('网络请求超时');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="py-8 font-sans bg-[#0a0a0a] min-h-screen text-gray-200">
            <Head><title>全域通讯监测 - WikitDB</title></Head>
            
            <div className="max-w-6xl mx-auto px-4">
                <div className="mb-6">
                    <Link href="/tools" className="text-blue-500 hover:text-blue-400 text-sm mb-4 inline-block transition-colors">
                        &larr; 返回工具箱
                    </Link>
                    <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                                <i className="fa-solid fa-satellite text-blue-500"></i> 全域通讯监测 (Omni-Link)
                            </h1>
                            <p className="text-gray-400 mt-2 text-sm">
                                实时捕获多个 Wikidot 站点的论坛动态。
                            </p>
                        </div>
                        <button 
                            onClick={() => fetchRecentPosts(activeSite)} 
                            disabled={isLoading}
                            className="bg-gray-900 border border-gray-700 hover:bg-gray-800 text-gray-300 px-6 py-2 rounded font-mono text-sm transition-colors shadow-sm"
                        >
                            {isLoading ? 'SCANNING...' : 'FORCE REFRESH'}
                        </button>
                    </div>
                </div>

                {/* 多站点 Tab 切换栏 */}
                <div className="flex overflow-x-auto custom-scrollbar mb-6 border-b border-gray-800">
                    {availableSites.map(site => (
                        <button
                            key={site.id}
                            onClick={() => setActiveSite(site.id)}
                            className={`px-6 py-3 text-sm font-bold font-mono tracking-wider transition-colors border-b-2 whitespace-nowrap ${
                                activeSite === site.id 
                                ? 'text-blue-400 border-blue-500 bg-blue-900/10' 
                                : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-900/50'
                            }`}
                        >
                            {site.name}
                        </button>
                    ))}
                </div>

                <div className="bg-[#121212] border border-gray-800 rounded-xl shadow-lg overflow-hidden">
                    <div className="bg-gray-900/50 px-6 py-3 border-b border-gray-800 flex justify-between items-center">
                        <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
                            Intercepted from: {activeSite}.wikidot.com
                        </span>
                        <span className="text-xs font-mono font-bold text-blue-400">
                            {posts.length} THREADS DETECTED
                        </span>
                    </div>
                    
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[#0a0a0a] text-gray-500 font-mono text-[10px] uppercase tracking-wider border-b border-gray-800">
                                <tr>
                                    <th className="px-6 py-4 font-normal">Thread Title / ID</th>
                                    <th className="px-6 py-4 font-normal">Sector (Board)</th>
                                    <th className="px-6 py-4 font-normal">Entity (Author)</th>
                                    <th className="px-6 py-4 font-normal text-right">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-16 text-center text-gray-500 font-mono tracking-widest">
                                            [ESTABLISHING CONNECTION TO {activeSite.toUpperCase()}...]
                                        </td>
                                    </tr>
                                ) : posts.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-16 text-center text-gray-500 font-mono tracking-widest flex flex-col items-center">
                                            <i className="fa-solid fa-ghost text-2xl mb-2 opacity-30"></i>
                                            [NO RECENT ACTIVITY DETECTED]
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
                                                    {/* 提供一个快捷跳转按钮，可以直接跳到你之前做的 forum.js 树状图页面去解析这个帖子 */}
                                                    <a href={`/tools/forum?id=${post.id}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <i className="fa-solid fa-arrow-up-right-from-square"></i> Deep Scan
                                                    </a>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-block px-2.5 py-1 bg-gray-900 border border-gray-700 text-gray-400 text-[10px] uppercase font-bold rounded truncate max-w-[150px]">
                                                    {post.board}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded bg-gray-800 text-gray-400 flex items-center justify-center font-mono text-[9px] uppercase border border-gray-700">
                                                        {post.author.substring(0, 2)}
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
    );
}
