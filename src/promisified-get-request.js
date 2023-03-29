import https from 'https';
import { parse as parseUrl } from 'url';

export function getRequest (url, user, password) {
    const { hostname, port, path } = parseUrl(url);

    const options = {
        hostname,
        port,
        path,
        headers: {
            'Authorization': 'Basic ' + new Buffer(user + ':' + password).toString('base64')
        }
    };

    return new Promise((resolve, reject) => {
        const request = https.get(url, options, response => {
            let data = '';
    
            response.on('data', chunk => {
                data += chunk.toString('utf8');
            });

            response.on('end', () => {
                const { statusCode, statusMessage } = response;

                if (statusCode >= 200 && statusCode <= 299)
                    resolve({ body: data });
                else
                    reject({ statusCode, statusMessage });
            });

            response.on('error', reject);
        });

        request.on('error', reject);
    });
}
