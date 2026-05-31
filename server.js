const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { load } = require('cheerio');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 搜索大众点评餐厅（轻量级爬虫）
async function searchDianping(restaurantName) {
    try {
        console.log(`[搜索] 正在搜索: ${restaurantName}`);
        
        // 构造搜索 URL
        const searchUrl = `https://www.dianping.com/search/keyword/0_0_${encodeURIComponent(restaurantName)}`;
        console.log(`[访问] ${searchUrl}`);
        
        // 发送 HTTP 请求
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Connection': 'keep-alive'
            },
            timeout: 15000
        });
        
        // 解析 HTML
        const $ = load(response.data);
        
        // 尝试多种选择器提取餐厅链接
        const selectors = [
            '.shop-all-list li:first-child a',
            '.shop-list li:first-child a',
            '.list-item:first-child a',
            'a[data-hippjkhref]',
            'a[href*="/shop/"]'
        ];
        
        let restaurantUrl = null;
        
        for (const selector of selectors) {
            const element = $(selector).first();
            if (element.length > 0) {
                const href = element.attr('href');
                if (href && href.includes('/shop/')) {
                    restaurantUrl = href.startsWith('http') ? href : `https://www.dianping.com${href}`;
                    break;
                }
            }
        }
        
        if (restaurantUrl) {
            console.log(`[成功] 找到餐厅链接: ${restaurantUrl}`);
            return {
                success: true,
                url: restaurantUrl,
                message: '成功获取餐厅链接'
            };
        } else {
            console.log('[失败] 未找到餐厅链接，返回搜索链接');
            return {
                success: false,
                url: searchUrl,
                message: '未找到具体餐厅页面，返回搜索结果页'
            };
        }
        
    } catch (error) {
        console.error(`[错误] 搜索失败: ${error.message}`);
        return {
            success: false,
            url: `https://www.dianping.com/search/keyword/0_0_${encodeURIComponent(restaurantName)}`,
            message: `搜索失败: ${error.message}`
        };
    }
}

// API 端点：搜索餐厅
app.get('/api/search-dianping', async (req, res) => {
    const { name } = req.query;
    
    if (!name) {
        return res.status(400).json({
            success: false,
            message: '请提供餐厅名称'
        });
    }
    
    const result = await searchDianping(name);
    res.json(result);
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📡 API 端点: http://localhost:${PORT}/api/search-dianping?name=餐厅名`);
    console.log(`\n使用方法：`);
    console.log(`  curl "http://localhost:${PORT}/api/search-dianping?name=海底捞"`);
});
