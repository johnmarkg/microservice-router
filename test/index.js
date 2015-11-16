(function() {
    var http = require('http')
	// process.setMaxListeners(20)

    // var async = require('async')

    // var rewire = require("rewire");
    // var router = rewire("../index.js");
    var checkInterval = 10
    var registerPath = '/register'
    var getProvidersPath = '/get-routes'
    var defaultService = 'default'
    var router = require('../index.js')({
        checkProvidersInterval: checkInterval,
        registerPath: registerPath,
        getProvidersPath: getProvidersPath,
        defaultService: defaultService
    })
    var providerWeb, providerApi, providerApi2;

	var request = require('supertest');
    var assert = require('assert');

    describe('default config', function(){
        it('defaults', function(){
            var _router = require('../index.js')()
            assert.equal(30 * 1000, _router.checkProvidersInterval)
            assert.equal('/router/register', _router.registerPath)
            assert.equal('/routes', _router.getProvidersPath)
            assert.equal('web', _router.defaultService)
            assert.equal(null, _router.accessKey)
        })
    })

    describe('GET /routes', function(){
        it('nothing registered yet', function(done){
            request(router.server)
				.get(getProvidersPath)
                .expect('{}')
				.expect(200, done)
        })
    })

    describe('no providers', function(){
        it('400', function(done){
            request(router.server)
				.get('/')
                .expect(/no providers registered for service/)
				.expect(400, done)
        })
    })

    describe('register providerWeb', function(){

        var port;
        var service = defaultService;
        before(function(done){
            providerWeb = http.createServer(function(req, res  ){
                res.end(service);
            })

            providerWeb.listen(function(){
                port = this.address().port
                done()
            });
        })

        it('providerWeb 200', function(done){

            request(router.server)
				.post(registerPath + '/'+ service+ '/'+ port)
                .expect('')
				.expect(200, done)

        })
        it('200, reregister', function(done){

            request(router.server)
				.post(registerPath + '/'+ service+ '/'+ port)
                .expect('')
				.expect(200, done)

        })
        it('listed once only', function(done){
            var expected = {};
            expected[defaultService] = [{
                host: "127.0.0.1",
                port: port.toString(),
                path : '/'
            }]
            request(router.server)
				.get(getProvidersPath)
                .expect(JSON.stringify(expected))
				.expect(200, done)
        })
        it('`' + defaultService + '` gets routed', function(done){
            request(router.server)
				.get('/' + defaultService)
                .expect(defaultService)
                .expect(200, done)
        })
        it('`' + defaultService + '` is default provider', function(done){
            request(router.server)
				.get('/something-else')
                .expect(defaultService)
                .expect(200, done)
        })
    })

    describe('register providerApi', function(){
        var port;
        var service = 'api'
        before(function(done){
            providerApi = http.createServer(function(req, res  ){
                res.end(service);
            })

            providerApi.listen(function(){
                port = this.address().port
                done()
            });
        })

        it('providerApi 200', function(done){

            request(router.server)
                .post(registerPath + '/'+ service+ '/'+ port + '?checkPath=/up')
                .expect('')
				.expect(200, done)

        })

        it('GET /api is routed', function(done){
            request(router.server)
				.get('/' + service)
                .expect(service)
                .expect(200, done)
        })
    });

    describe('register providerApi2', function(){
        var port;
        var service = 'api'
        before(function(done){
            providerApi2 = http.createServer(function(req, res  ){
                console.info(req.url)
                if(req.url.match('up')){
                    assert(req.url.match(/noLog=1/))    
                }

                res.end(service);
            })

            providerApi2.listen(function(){
                port = this.address().port
                done()
            });
        })

        it('providerApi 200, query in checkPath', function(done){

            request(router.server)
                .post(registerPath + '/'+ service+ '/'+ port + '?checkPath=/up?noLog=1')
                .expect('')
				.expect(200, done)

        })
    });

    describe('lose 1st API provider, removed on routing', function(){
        before(function(done){
            providerApi.close(done)
        })

        it('GET /api is routed after 1st provider fails', function(done){
            request(router.server)
				.get('/api')
                .expect('api')
                .expect(200, done)
        })

    })

    describe('lose 2nd API provider, removed by checkProviders', function(){
        before(function(done){
            providerApi2.close(function(){
                setTimeout(done, checkInterval + 5)
            })
        })

        it('GET /api 400', function(done){
            request(router.server)
				.get('/api')
                .expect('no providers registered for service: api')
                .expect(400, done)
        })

    })


}).call(this);
