import { Html, Head, Main, NextScript } from 'next/document';
import Header from '../components/Header';
import Footer from '../components/Footer';
const config = require('../wikitdb.config.js');


export default function Document() {
  return (
    <Html lang="zh-CN">
      <Head>
        <title>{config.SITE_NAME}</title>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
        <link href="./css/globals.css" rel="stylesheet"></link>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.0/css/all.min.css" rel="stylesheet"></link>
        <script src="https://cdn.jsdelivr.net/npm/@tailwindplus/elements@1" type="module"></script>
      </Head>
      <body>
        <Header />
        <div id="main-content">
          <Main />
        </div>
        <Footer />
        <NextScript />
      </body>
    </Html>
  );
}