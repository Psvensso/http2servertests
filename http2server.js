var fs = require('fs');
var path = require('path');
var http2 = require('http2');
var connect = require('connect');
var app = connect();
var Builder = require("systemjs-builder");

/**
 * Get the config from our config.js file that JSPM sets up for us.
 * */
var confLoad = {};
var System = {
    config: function (cfg) {
        confLoad = cfg;
    }
};
var source;
try {
    source = fs.readFileSync('./config.js');
}
catch (e) {
    source = '';
}
var cfg = {};
var System = {
    config: function (_cfg) {
        for (var c in _cfg) {
            if (!_cfg.hasOwnProperty(c))
                continue;

            var v = _cfg[c];
            if (typeof v === 'object') {
                cfg[c] = cfg[c] || {};
                for (var p in v) {
                    if (!v.hasOwnProperty(p))
                        continue;
                    cfg[c][p] = v[p];
                }
            }
            else
                cfg[c] = v;
        }
    },
    paths: {},
    map: {},
    versions: {}
};
eval(source.toString());

var config = System.config;
delete System.config;
config(System);

/**
 * Create a new builder based on the conf.
 * */
var builder = new Builder(cfg);

function returnStatic(filename, response) {
    if ((filename.indexOf(__dirname) === 0) && fs.existsSync(filename) && fs.statSync(filename).isFile()) {
        response.writeHead(200);
        fileStream = fs.createReadStream(filename);
        fileStream.pipe(response);
        fileStream.on('finish', response.end);
    }
}

function handleBundleResponse(response, deps) {
    bundleCache["main"] = deps;
    for (var key in deps) {
        //Push the "file"/"path"/"module"
        var path = deps[key].normalized.replace("file://", "");
        var push = response.push(path);
        //Insert content here.
        //Perhaps do something smart with the originalSource here as well.
        push.end(deps[key].source);
    }

}
var bundleCache = {};
app.use(function (request, response) {
    var filename = path.join(__dirname, request.url);
    /**
     *  Should actually figure out  if request is for a bundle here.
     *  For now, hard coded to my main bundle.
     *  Should also cache the build result so we just need to trance the first req.
     **/
    if (request.url.indexOf("main.js") > -1) {
        if (!!bundleCache["main"]) {
            handleBundleResponse(response, bundleCache["main"]);
            returnStatic(filename, response);
        } else {
            builder.trace("main")
                .then(handleBundleResponse.bind(this, response))
                .then(function () {
                    returnStatic(filename, response);
                });
        }


    } else {
        returnStatic(filename, response);
    }


});
var compression = require('compression');
app.use(compression());

var server = http2.createServer({
    key: fs.readFileSync(path.join(__dirname, '/localhost.key')),
    cert: fs.readFileSync(path.join(__dirname, '/localhost.crt'))
}, app);

server.listen(process.env.HTTP2_PORT || 8080);

