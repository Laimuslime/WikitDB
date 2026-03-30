import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import config from '../../wikitdb.config.js';

export default function ForumRecent() {
    const availableSites = config.SUPPORT_WIKI || [];
    const [activeSite, setActiveSite] = useState(availableSites.length > 0 ? availableSites[0] : null);
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (activeSite) {
            fetchRecentPosts(activeSite.URL);
        }
    }, [activeSite]);

    const fetchRecentPosts = async (targetUrl) => {
        setIsLoading(true);
        setPosts([]);
        try {
            const res = await fetch(`/api/forum/recent?url=${encodeURIComponent(targetUrl)}`);
            const data = await res.json();
            if (res.ok) setPosts(data.posts || []);
            else toast.error(data.error || '节点数据抓取失败');
        } catch (error) {
            toast.error('网络请求超时');
        } finally {
            setIsLoading(false);
        }
    };

    if (!activeSite) return <div className="p-8 text-white">请检查项目配置</div>;

    return (
        <div className="py-8 font-sans bg-[#0a0a0a] min-h-screen text-gray-200">
            <Head><title>最新通讯监测 - {config.SITE_NAME}</title></Head>
            
            <div className="max-w-4xl mx-auto px-4">
                
                {/* 头部标题与操作 */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <Link href="/tools" className="text-blue-500 hover:text-blue-400 text-sm mb-2 inline-block">&larr; 返回工具箱</Link>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            最新通讯监测
                        </h1>
                    </div>
                    <button 
                        onClick={() => fetchRecentPosts(activeSite.URL)} 
                        disabled={isLoading}
                        className="bg-[#121212] border border-gray-800 hover:bg-gray-800 text-gray-300 px-4 py-2 rounded text-sm transition-colors"
                    >
                        {isLoading ? '刷新中...' : '刷新节点数据'}
                    </button>
                </div>

                {/* 站点切换 (无边框极简流) */}
                <div className="flex overflow-x-auto gap-1 mb-6 border-b border-gray-800 pb-2">
                    {availableSites.map(site => (
                        <button
                            key={site.URL}
                            onClick={() => setActiveSite(site)}
                            className={`px-4 py-1.5 text-sm rounded transition-colors whitespace-nowrap ${
                                activeSite.URL === site.URL 
                                ? 'bg-gray-800 text-gray-100 font-bold' 
                                : 'text-gray-500 hover:text-gray-300 hover:bg-[#121212]'
                            }`}
                        >
                            {site.NAME}
                        </button>
                    ))}
                </div>

                {/* 状态提示区 */}
                {isLoading && (
                    <div className="text-gray-500 text-sm text-center py-10">正在同步节点数据...</div>
                )}
                {!isLoading && posts.length === 0 && (
                    <div className="text-gray-500 text-sm text-center py-10">当前节点无近期通讯记录</div>
                )}

                {/* 列表渲染：复刻图三的流式卡片设计 */}
                {!isLoading && posts.length > 0 && (
                    <div className="space-y-3">
                        {posts.map((post, idx) => (
                            <div key={`${post.id}-${idx}`} className="group bg-[#121212] hover:bg-[#1a1a1a] border border-gray-800 rounded-lg p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                
                                {/* 左侧：标题、讨论区标签 */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded">
                                            {post.board}
                                        </span>
                                        <span className="text-xs text-gray-600 font-mono">
                                            #{post.id}
                                        </span>
                                    </div>
                                    <a 
                                        href={`/tools/forum?id=${post.id}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-base font-bold text-gray-200 group-hover:text-blue-400 transition-colors block truncate"
                                        title={post.title}
                                    >
                                        {post.title}
                                    </a>
                                </div>

                                {/* 右侧：作者与时间信息 */}
                                <div className="sm:text-right flex items-center sm:block gap-3 sm:gap-0 shrink-0">
                                    <div className="flex items-center gap-2 sm:justify-end mb-1">
                                        {/* 头像占位符 */}
                                        <div className="w-5 h-5 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center text-[10px] font-bold">
                                            {post.author.substring(0, 1).toUpperCase()}
                                        </div>
                                        <span className="text-sm text-gray-300 font-medium">
                                            {post.author}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {post.date}
                                    </div>
                                </div>

                            </div>
                        ))}
                    </div>
                )}
                
            </div>
        </div>
    );
}
