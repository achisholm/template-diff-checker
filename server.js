import http from 'http'
import https from 'https'
import fs from 'fs/promises'
import path from 'path'
import { URL } from 'url'

const proxyTargets = {
    templates: 'https://tlc-www.netlify.app/templates',
    dev: 'http://www.priyank.tlc-direct.co.uk',
    testing: 'http://www.testing.tlc-direct.co.uk',
    live: 'http://www.tlc-direct.co.uk'
}

const server = http.createServer(async (req, res) => {
    const targetKey = req.url.split('/')[1] // e.g. /templates/... => templates

    if (proxyTargets[targetKey]) {
        const targetURL = new URL(proxyTargets[targetKey])
        const isHttpsTarget = targetURL.protocol === 'https:'

        const options = {
            hostname: targetURL.hostname,
            port: targetURL.port || (isHttpsTarget ? 443 : 80),
            path: req.url.replace(`/${targetKey}`, ''),
            method: req.method,
            headers: {
                ...req.headers,
                host: targetURL.hostname,
                cookie: (req.headers.cookie || '') + (req.headers.cookie?.includes('customer_session_key') ? '' : '; customer_session_key=')
            }
        }

        const proxyRequest = (isHttpsTarget ? https : http).request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers)
            proxyRes.pipe(res, { end: true })
        })

        req.pipe(proxyRequest, { end: true })

        proxyRequest.on('error', (err) => {
            console.error('Proxy Request Error:', err)
            res.writeHead(500)
            res.end('Proxy error')
        })
    } else {
        // Static file serving
        try {
            const filePath = path.join(process.cwd(), req.url === '/' ? '/index.html' : req.url)
            const ext = path.extname(filePath)
            const content = await fs.readFile(filePath)

            res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' })
            res.end(content)
        } catch (error) {
            res.writeHead(404)
            res.end('Not found')
        }
    }


})

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css'
}

server.listen(8888, () => console.info('Server is running at http://localhost:8888/'))
