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
            
            if (res.ok) {
                setPosts(data.posts || []);
            } else {
                toast.error(data.error || '数据拉取失败');
            }
        } catch (error) {
            toast.error('网络请求超时');
        } finally {
            setIsLoading(false);
        }
    };

    if (!activeSite) {
        return <div className="p-8 text-white">请在 wikitdb.config.js 中配置 SUPPORT_WIKI</div>;
    }

    return (
        <div className="py-8 font-sans bg-[#0a0a0a] min-h-screen text-gray-200">
            <Head><title>论坛最新动态 - {config.SITE_NAME}</title></Head>
            
            <div className="max-w-6xl mx-auto px-4">
                <div className="mb-8 border-b border-gray-800 pb-4">
                    <Link href="/tools" className="text-blue-500 hover:text-blue-400 text-sm mb-4 inline-block transition-colors">
                        返回工具箱
                    </Link>
                    <h1 className="text-3xl font-bold text-white">论坛最新动态</h1>
                    <p className="text-gray-400 mt-2 text-sm">查看各个站点的论坛最新回复记录。</p>
                </div>

                <div className="flex space-x-2 mb-6 overflow-x-auto">
                    {availableSites.map(site => (
                        <button
                            key={site.URL}
                            onClick={() => setActiveSite(site)}
                            className={`px-5 py-2.5 rounded-t-lg text-sm font-medium transition-colors ${
                                activeSite.URL === site.URL 
                                ? 'bg-[#121212] text-blue-400 border-t border-l border-r border-gray-800' 
                                : 'bg-transparent text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {site.NAME}
                        </button>
                    ))}
                </div>

                <div className="bg-[#121212] border border-gray-800 rounded-xl p-6 shadow-lg">
                    <div className="mb-6">
                        <button 
                            onClick={() => fetchRecentPosts(activeSite.URL)} 
                            disabled={isLoading} 
                            className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2 rounded text-sm transition-colors disabled:opacity-50"
                        >
                            {isLoading ? '正在刷新...' : '刷新数据'}
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-800 text-gray-400">
                                    <th className="pb-3 font-medium">帖子标题</th>
                                    <th className="pb-3 font-medium">讨论区</th>
                                    <th className="pb-3 font-medium">最新回复人</th>
                                    <th className="pb-3 font-medium text-right">回复时间</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="4" className="py-12 text-center text-gray-500">正在加载数据...</td>
                                    </tr>
                                ) : posts.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="py-12 text-center text-gray-500">暂无数据</td>
                                    </tr>
                                ) : (
                                    posts.map((post, idx) => (
                                        <tr key={`${post.id}-${idx}`} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                            <td className="py-4 pr-4">
                                                <div className="text-gray-200 font-medium mb-1">{post.title}</div>
                                                <div className="text-xs text-gray-500">
                                                    ID: {post.id}
                                                    <a href={`/tools/forum?id=${post.id}`} target="_blank" rel="noreferrer" className="text-blue-500 ml-3 hover:underline">
                                                        查看内容
                                                    </a>
                                                </div>
                                            </td>
                                            <td className="py-4 pr-4 text-gray-400">{post.board}</td>
                                            <td className="py-4 pr-4 text-blue-400">{post.author}</td>
                                            <td className="py-4 text-right text-gray-500">{post.date}</td>
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
