import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

const config = require('../wikitdb.config.js');

export default function Tools() {
    return (
        <div className="min-h-screen bg-gray-950 text-white py-12 px-4">
            <Head>
                <title>工具箱 - {config.SITE_NAME}</title>
            </Head>
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 border-b border-gray-800 pb-4">
                    <h1 className="text-3xl font-bold text-gray-100">工具箱</h1>
                    <p className="text-gray-500 mt-2 text-sm">WikitDB 的各项扩展功能与实验性应用。</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* 盲盒抽卡入口 (新增) */}
                    <Link href="/tools/gacha" className="bg-gray-900 p-6 rounded-xl border border-gray-800 hover:border-purple-500 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all group relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                            HOT
                        </div>
                        <div>
                            <div className="text-purple-500 mb-3 text-2xl">
                                <i className="fa-solid fa-box-open"></i>
                            </div>
                            <h2 className="text-lg font-bold mb-2 group-hover:text-purple-400 transition-colors">档案馆盲盒</h2>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                消耗资产，在浩瀚的数据中随机抽取未知的页面标的进行投资。
                            </p>
                        </div>
                    </Link>

                    {/* 成员管理入口 */}
                    <Link href="/tools/member-admin" className="bg-gray-900 p-6 rounded-xl border border-gray-800 hover:border-blue-500 transition-all group flex flex-col justify-between">
                        <div>
                            <div className="text-blue-500 mb-3 text-2xl">
                                <i className="fa-solid fa-users-gear"></i>
                            </div>
                            <h2 className="text-lg font-bold mb-2 group-hover:text-blue-400 transition-colors">成员管理</h2>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                查阅、管理网站成员的权限状态。
                            </p>
                        </div>
                    </Link>

                    {/* 删帖公示入口 */}
                    <Link href="/tools/delete-announcement" className="bg-gray-900 p-6 rounded-xl border border-gray-800 hover:border-red-500 transition-all group flex flex-col justify-between">
                        <div>
                            <div className="text-red-500 mb-3 text-2xl">
                                <i className="fa-solid fa-trash-can"></i>
                            </div>
                            <h2 className="text-lg font-bold mb-2 group-hover:text-red-400 transition-colors">删帖公示</h2>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                查看近期已被删除的页面记录与相关公示信息。
                            </p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
