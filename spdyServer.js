var spdy = require("spdy");
var fs = require('fs');
var path = require('path');
var systemjs = require("systemjs");
require("./config");

spdy.createServer({
    key: fs.readFileSync(path.join(__dirname, '/localhost.key')),
    cert: fs.readFileSync(path.join(__dirname, '/localhost.crt'))
}, function (req, res) {
    // push JavaScript asset (/main.js) to the client
    if(req.url === "/"){
        var fileReads = [];
        var paths = Object.keys(systemjs.depCache)
            .map(function(p){
                return p.slice(7,p.length);
            })
            .map(function(filePath){
                return new Promise(function(resolve, reject){
                        res.push(filePath, {'content-type': 'application/x-es-module'}, function (err, stream) {
                            var p = path.join(__dirname, filePath);
                            fs.readFile(p,'utf8',function (err, data){
                                stream.end(data);
                                resolve();
                            });
                        });
                })
            });

        Promise.all(fileReads).then(function(){
            fs.readFile(path.join(__dirname, '/index.html'),function (err, data){
                res.writeHead(200, {'Content-Type': 'text/html','Content-Length':data.length});
                res.end(data);
            });
        });
    }
    else {
        var filename = path.join(__dirname, req.url);
        if ((filename.indexOf(__dirname) === 0) && fs.existsSync(filename) && fs.statSync(filename).isFile()) {
            res.writeHead(200);
            var fileStream = fs.createReadStream(filename);
            fileStream.pipe(res);
            fileStream.on('finish',res.end);
        }
        else {
            res.end();
        }
    }


}).listen(443);