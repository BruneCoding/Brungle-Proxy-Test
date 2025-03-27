const functions = require('firebase-functions');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.proxy = functions.https.onRequest(async (req, res) => {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
        return res.status(400).send('URL parameter is required');
    }

    try {
        // Fetch the target page
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const html = await response.text();
        
        // Modify the HTML to work in an iframe
        const $ = cheerio.load(html);
        
        // Remove X-Frame-Options meta tags
        $('meta[http-equiv="X-Frame-Options"]').remove();
        
        // Remove frame-busting scripts
        $('script').each(function() {
            const scriptContent = $(this).html() || '';
            if (scriptContent.includes('frameElement') || 
                scriptContent.includes('top != self') || 
                scriptContent.includes('parent.frames')) {
                $(this).remove();
            }
        });
        
        // Rewrite URLs to go through our proxy
        $('a[href]').each(function() {
            const href = $(this).attr('href');
            if (href && href.startsWith('http')) {
                $(this).attr('href', `/proxy?url=${encodeURIComponent(href)}`);
            }
        });
        
        // Send the modified HTML
        res.set('Content-Type', 'text/html');
        res.send($.html());
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).send('Error loading the page');
    }
});
