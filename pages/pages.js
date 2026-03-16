import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
const config = require('../wikitdb.config.js');

const Pages = () => {
    const [selectedSite, setSelectedSite] = useState(config.SUPPORT_WIKI[0]?.PARAM);
    const [searchQuery, setSearchQuery] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 每次切换站点时，清空搜索框并默认拉取该站点的最新文章
    useEffect(() => {
        setSearchQuery('');
        executeSearch('');
    }, [selectedSite]);

    const executeSearch = async (queryToSearch = searchQuery) => {
        setLoading(true);
        setError(null);
        setData(null);
        
        try {
            const apiUrl = `/api/search?site=${selectedSite}&q=${encodeURIComponent(queryToSearch)}`;
            const res = await fetch(apiUrl);
            const result = await res.json();
            
            if (!res.ok) {
                throw new Error(result.details || result.error || '检索请求失败');
            }
            
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        executeSearch();
    };

    return (
        <>
            <Head>
                <title>{`动态检索 - ${config.SITE_NAME}`}</title>
            </Head>

            <div className="py-8">
                <h1 className="text-3xl font-bold text-white mb-8">站点页面动态检索</h1>

                <div className="mb-8 flex flex-wrap gap-4 border-b border-gray-700 pb-6">
                    {config.SUPPORT_WIKI.map((wiki) => (
                        <button
                            key={wiki.PARAM}
                            onClick={() => setSelectedSite(wiki.PARAM)}
                            className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                selectedSite === wiki.PARAM 
                                    ? 'bg-indigo-600 text-white' 
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                        >
                            {wiki.NAME}
                        </button>
                    ))}
                </div>

                <div className="bg-gray-800/50 rounded-xl p-6 border border-white/10 min-h-[400px]">
                    <form onSubmit={handleSearchSubmit} className="mb-8 relative max-w-2xl mx-auto">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <i className="fa-solid fa-magnifying-glass text-gray-400"></i>
                            </div>
                            <input
                                type="text"
                                placeholder="输入页面标题或英文名进行全站搜索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full p-4 pl-10 text-sm text-white bg-gray-900 border border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="text-white absolute right-2.5 bottom-2.5 bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:outline-none focus:ring-indigo-800 font-medium rounded-lg text-sm px-4 py-2 disabled:opacity-50 transition-colors"
                            >
                                {loading ? '检索中...' : '搜索'}
                            </button>
                        </div>
                    </form>
                    
                    {error && (
                        <div className="text-red-400 text-center py-8 bg-red-900/10 rounded-lg border border-red-900/30">
                            检索遇到错误: {error}
                        </div>
                    )}
                    
                    {data && !loading && (
                        <div>
                            <div className="mb-4 text-gray-400 text-sm flex justify-between items-center">
                                <span>来源站点: {data.siteName}</span>
                                <span>显示 {data.results.length} 条检索结果</span>
                            </div>
                            
                            {data.results.length > 0 ? (
                                <div className="space-y-3">
                                    {data.results.map((page, index) => {
                                        const dateStr = page.created_at ? new Date(page.created_at).toLocaleDateString('zh-CN') : '未知时间';
                                        
                                        return (
                                            <div key={index} className="bg-gray-900/40 p-4 rounded-lg border border-gray-700/50 hover:border-gray-500 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div>
                                                    <Link 
                                                        // 按照要求，将目标链接修改为本站的内部结构
                                                        href={`/page?site=${selectedSite}&page=${encodeURIComponent(page.page)}`}
                                                        className="text-lg font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
                                                    >
                                                        {page.title || page.page}
                                                    </Link>
                                                    <div className="text-xs text-gray-500 mt-1.5 flex gap-4">
                                                        <span>系统名: {page.page}</span>
                                                        <span>评分: <span className={page.rating > 0 ? 'text-green-400' : 'text-gray-400'}>{page.rating > 0 ? `+${page.rating}` : (page.rating || 0)}</span></span>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-500 shrink-0">
                                                    发布于 {dateStr}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-16 border border-dashed border-gray-700 rounded-lg bg-gray-900/20">
                                    <p className="text-gray-500 text-lg">
                                        没有找到与 "{searchQuery}" 相关的页面
                                    </p>
                                    <p className="text-gray-600 text-sm mt-2">
                                        尝试使用不同的关键词，或缩短搜索词
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Pages;
