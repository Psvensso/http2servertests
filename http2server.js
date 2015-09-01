var fs = require('fs');
var path = require('path');
var http2 = require('http2');

// The callback to handle requests
function onRequest(request, response) {
    var filename = path.join(__dirname, request.url);
    if(request.url === "/"){
        response.writeHead(200);
        fs.createReadStream(path.join(__dirname, "/index.html"))
            .pipe(response)
            .on('finish',response.end);
    }
    else if ((filename.indexOf(__dirname) === 0) && fs.existsSync(filename) && fs.statSync(filename).isFile()) {
        response.writeHead(200);
        var fileStream = fs.createReadStream(filename);
        fileStream.pipe(response);
        fileStream.on('finish',response.end);
    }
    else {
        response.writeHead(404);
        response.end();
    }

}

// Creating a bunyan logger (optional)
var log = require('./util').createLogger('server');

// Creating the server in plain or TLS mode (TLS mode is the default)
var server;
if (process.env.HTTP2_PLAIN) {
    server = http2.raw.createServer({
        log: log
    }, onRequest);
} else {
    server = http2.createServer({
        log: log,
        key: fs.readFileSync(path.join(__dirname, '/localhost.key')),
        cert: fs.readFileSync(path.join(__dirname, '/localhost.crt'))
    }, onRequest);
}
server.listen(443);