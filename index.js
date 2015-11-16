(function () {

    var http = require('http');
    var querystring = require('querystring')
    var httpProxy = require('http-proxy');
    var debug = require('debug')('microservice-router')
    var ipaddr = require('ipaddr.js');

    var md5 = require('md5')
    var serviceProviders = {}
    var serviceIds = {};
    var proxy = httpProxy.createProxyServer({});

    function Router(config) {
        if (!config) {
            config = {};
        }

        this.port = config.port || 59000
        this.checkProvidersInterval = config.checkProvidersInterval || (1000 * 30)
        this.registerPath = config.registerPath || '/router/register'
        this.getProvidersPath = config.getProvidersPath || '/routes'
        this.defaultService = config.defaultService || 'web'

        var t = this

        this.server = http.createServer(t.createHandler.bind(this));

        setInterval(checkProviders, t.checkProvidersInterval)

        return this;
    }

    module.exports = function (config) {
        return new Router(config)
    }

    Router.prototype.createHandler = function (req, res) {

        var t = this;

        debug(Date.now() + ' ' + req.method + ' - ' + req.url)

        if (req.url.indexOf(t.registerPath) == 0) {
            req.url = req.url.replace(t.registerPath, '');
            return registerProvider(req, res)
        } else if (req.url.indexOf(t.getProvidersPath) == 0) {
            return res.end(JSON.stringify(serviceProviders))
        }

        var service = t.defaultService
        var splitPath = req.url.split('/').slice(1);

        if (splitPath[0]) {
            service = splitPath[0]
        }

        if (serviceProviders[service]) {
            return balance(service, req, res);
        } else if (serviceProviders[t.defaultService]) {
            return balance(t.defaultService, req, res);
        } else {
            return noProvider(service, req, res)
        }

        // res.end()
    }

    Router.prototype.start = function (cb) {

        var t = this;

        if (typeof cb !== 'function') {
            cb = function () {
                console.log("listening on port " + t.port)
            }
        }
        t.server.listen(t.port, cb);
    }

    function checkProviders() {
        debug('checkProviders')

        for (var service in serviceProviders) {
            debug('checkProviders: ' + service)

            serviceProviders[service].forEach(function (config, index) {
                debug(JSON.stringify(arguments))
                var req = http.get({
                    host: config.host,
                    port: config.port,
                    path: config.path || '/'
                }, function (res) {
                    if (res.statusCode != 200) {
                        removeProvider(service, index)
                    }
                })

                req.on('error', function () {
                    removeProvider(service, index)
                })
            })
        }
    }

    function noProvider(service, req, res) {
        res.statusCode = 400
        return res.end('no providers registered for service: ' + service)
    }

    function removeProvider(service, index) {
        var config = serviceProviders[service][index]
        console.info('lost provider for ' + service + ': ' + JSON.stringify(
            config))
        serviceProviders[service].splice(index, 1)
            // if(serviceProviders[service].length == 0){
            //     delete serviceProviders[service]
            // }
    }

    function balance(service, req, res) {
        console.info('routing for service: ' + service)
        console.info(serviceProviders[service])
        if (!serviceProviders[service] || serviceProviders[service].length ==
            0) {
            return noProvider(service, req, res)
        }
        var index = 0
        var config = serviceProviders[service][index]
        var url = 'http://' + config.host + ':' + config.port

        proxy.web(req, res, {
            target: url
        }, function (err) {
            if (err) {
                removeProvider(service, index)
                balance(service, req, res)
            }
        })
    }

    function registerProvider(req, res) {
        debug('registerProvider: ' + req.url)


        // parse request query
        var splitQuery = req.url.split('?')
        var query;
        if (splitQuery[1]) {
            // account for unencoded url
            query = querystring.parse(splitQuery.slice(1).join('?'))
        }

        // account for leading slash presence/absence
        var splitPath = splitQuery[0].split('/')
        if(!splitPath[0]){
            splitPath = splitPath.slice(1)
        }

        var service = splitPath[0];
        var port = splitPath[1];

        var host = req.headers["x-forwarded-for"] || req.connection.remoteAddress; //splitPath[1];
        host = ipaddr.process(host)
        if (host.octets) {
            host = host.octets.join('.')
        }

        // dont re-add registered service
        var hash = md5([service, host, port].join(':'))
        if (serviceIds[hash]) {
            return res.end()
        }


        serviceIds[hash] = {
            service: service,
            host: host,
            port: port
        }

        if (!serviceProviders[service]) {
            serviceProviders[service] = []
        }

        var checkPath = '/'
        if (query && query.checkPath) {
            checkPath = query.checkPath
        }

        serviceProviders[service].push({
            host: host,
            port: port,
            path: checkPath
        })
        return res.end();
    }

}).call(this)
