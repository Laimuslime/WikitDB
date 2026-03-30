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
                toast.error(data.error || '节点数据抓取失败');
            }
        } catch (error) {
            toast.error('网络请求超时，请检查您的网络连接');
        } finally {
            setIsLoading(false);
        }
    };

    if (!activeSite) {
        return <div className="p-8 text-white">请检查项目根目录的 wikitdb.config.js 配置文件</div>;
    }

    return (
        <div className="py-8 font-sans bg-[#0a0a0a] min-h-screen text-gray-200">
            <Head><title>最新通讯监测 - {config.SITE_NAME}</title></Head>
            
            <div className="max-w-6xl mx-auto px-4">
                {/* 页面头部 */}
                <div className="mb-6 border-b border-gray-800 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <Link href="/tools" className="text-blue-500 hover:text-blue-400 text-sm mb-4 inline-block transition-colors">&larr; 返回工具箱</Link>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <i className="fa-solid fa-satellite-dish text-blue-500"></i> 最新通讯监测
                        </h1>
                        <p className="text-gray-400 mt-2 text-sm">在这里集中查看各个相关站点的论坛最新回复记录。</p>
                    </div>
                    <button 
                        onClick={() => fetchRecentPosts(activeSite.URL)} 
                        disabled={isLoading}
                        className="bg-[#121212] border border-gray-800 hover:bg-gray-800 text-gray-300 px-6 py-2.5 rounded-lg text-sm transition-colors shadow-inner"
                    >
                        {isLoading ? '刷新中...' : '手动刷新数据'}
                    </button>
                </div>

                {/* 顶部站点切换选项卡 */}
                <div className="flex overflow-x-auto custom-scrollbar mb-6 gap-2">
                    {availableSites.map(site => (
                        <button
                            key={site.URL}
                            onClick={() => setActiveSite(site)}
                            className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
                                activeSite.URL === site.URL 
                                ? 'text-blue-400 border-blue-500 bg-[#121212]' 
                                : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-900/50'
                            }`}
                        >
                            {site.ImgURL && <img src={site.ImgURL} alt={site.NAME} className="w-4 h-4 object-contain" />}
                            {site.NAME}
                        </button>
                    ))}
                </div>

                {/* 纯净表格主区域 */}
                <div className="bg-[#121212] border border-gray-800 rounded-xl p-5 shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[#0a0a0a] border-b border-gray-800 text-gray-500 text-xs">
                                <tr>
                                    <th className="px-4 py-3 font-bold">帖子标题</th>
                                    <th className="px-4 py-3 font-bold">所属板块</th>
                                    <th className="px-4 py-3 font-bold">发帖/回复人</th>
                                    <th className="px-4 py-3 font-bold text-right">时间</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="4" className="px-4 py-16 text-center text-gray-500">
                                            <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-3 opacity-50 block"></i>
                                            正在连接 {activeSite.NAME} 并拉取数据...
                                        </td>
                                    </tr>
                                ) : posts.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-4 py-16 text-center text-gray-500">
                                            <i className="fa-solid fa-ghost text-3xl mb-3 opacity-30 block"></i>
                                            暂无最新回复，或目标站点拦截了访问。
                                        </td>
                                    </tr>
                                ) : (
                                    posts.map((post, idx) => (
                                        <tr key={`${post.id}-${idx}`} className="hover:bg-gray-800/40 transition-colors group">
                                            <td className="px-4 py-4">
                                                <div className="font-medium text-gray-200 group-hover:text-blue-400 transition-colors truncate max-w-md">
                                                    {post.title}
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1 flex items-center gap-3">
                                                    <span className="bg-gray-900 px-1.5 py-0.5 rounded border border-gray-700">ID: {post.id}</span>
                                                    <a href={`/tools/forum?id=${post.id}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        阅读内容
                                                    </a>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-gray-400">
                                                <span className="inline-block px-2.5 py-1 bg-gray-900 border border-gray-700 text-xs rounded truncate max-w-[150px]">
                                                    {post.board}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-blue-300 font-bold">
                                                {post.author}
                                            </td>
                                            <td className="px-4 py-4 text-right text-gray-500">
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
