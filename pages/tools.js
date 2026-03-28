import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

const config = require('../wikitdb.config.js');

export default function Tools() {
    return (
        <div className="py-8">
            <Head>
                <title>工具箱 - {config.SITE_NAME}</title>
            </Head>
            <div className="max-w-5xl mx-auto">
                <div className="mb-8 border-b border-gray-800 pb-4">
                    <h1 className="text-3xl font-bold text-white">工具箱</h1>
                    <p className="text-gray-400 mt-2 text-sm">WikitDB 的各项扩展功能与实验性应用。</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Link href="/tools/gacha" className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 hover:border-purple-500 hover:bg-gray-800 transition-all group flex flex-col justify-between shadow-lg">
                        <div className="grid grid-cols-[min-content_1fr]">
                            <div className="rounded-xl bg-[#24344f] p-[10px_8px] text-purple-400 group-hover:text-purple-500 mb-4 mr-4 max-h-14 text-3xl">
                                <i className="fa-solid fa-box-open"></i>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">档案馆盲盒</h2>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    消耗资产，在浩瀚的数据中随机抽取未知的页面标的进行投资。
                                </p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/tools/member-admin" className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 hover:border-blue-500 hover:bg-gray-800 transition-all group flex flex-col justify-between shadow-lg">
                        <div className="grid grid-cols-[min-content_1fr]">
                            <div className="rounded-xl bg-[#24344f] p-[10px_8px] text-blue-400 group-hover:text-bule-500 mb-4 mr-4 max-h-14 text-3xl">
                                <i className="fa-solid fa-users-gear"></i>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">成员管理</h2>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    在特定站点对指定成员采取封禁、移除等操作。
                                </p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/tools/delete-announcement" className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 hover:border-red-500 hover:bg-gray-800 transition-all group flex flex-col justify-between shadow-lg">
                        <div className="grid grid-cols-[min-content_1fr]">
                            <div className="rounded-xl bg-[#24344f] p-[10px_8px] text-red-400 group-hover:text-red-500 mb-4 mr-4 max-h-14 text-3xl">
                                <i className="fa-solid fa-trash-can"></i>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white mb-2 group-hover:text-red-400 transition-colors">删帖公示</h2>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    查看近期已被删除的页面记录与相关公示信息。
                                </p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
