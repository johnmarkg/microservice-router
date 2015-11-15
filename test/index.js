(function() {
    var http = require('http')
	// process.setMaxListeners(20)

    // var rewire = require("rewire");
    // var router = rewire("../index.js");
    var checkInterval = 10
    var router = require('../index.js')({checkProvidersInterval: checkInterval})
    var providerWeb, providerApi, providerApi2;

	var request = require('supertest');
    // var assert = require('assert');

    // var router = require('../index.js')()
    // console.info(router)
    // var server = re

    describe('GET /routes', function(){
        it('nothing registered yet', function(done){
            request(router.server)
				.get('/routes')
                .expect('{}')
				.expect(200, done)
        })
    })

    describe('register providerWeb', function(){

        var port;
        var service = 'web';
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
				.post('/router/register/'+ service+ '/'+ port)
                .expect('')
				.expect(200, done)

        })
        it('200, reregister', function(done){

            request(router.server)
				.post('/router/register/web/'+ port)
                .expect('')
				.expect(200, done)

        })
        it('listed once only', function(done){
            request(router.server)
				.get('/routes')
                .expect(JSON.stringify({
                    "web" : [{
                        host: "127.0.0.1",
                        port: port.toString(),
                        path : '/'
                    }]
                }))
				.expect(200, done)
        })
        it('`web` gets routed', function(done){
            request(router.server)
				.get('/web')
                .expect('web')
                .expect(200, done)
        })
        it('web is defaul provider', function(done){
            request(router.server)
				.get('/something else')
                .expect('web')
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
				.post('/router/register/'+ service+ '/'+ port + '?checkPath=/up')
                .expect('')
				.expect(200, done)

        })

        it('GET /api is routed', function(done){
            request(router.server)
				.get('/api')
                .expect('api')
                .expect(200, done)
        })
    });

    describe('register providerApi2', function(){
        var port;
        var service = 'api'
        before(function(done){
            providerApi2 = http.createServer(function(req, res  ){
                res.end(service);
            })

            providerApi2.listen(function(){
                port = this.address().port
                done()
            });
        })

        it('providerApi 200', function(done){

            request(router.server)
				.post('/router/register/'+ service+ '/'+ port + '?checkPath=/up')
                .expect('')
				.expect(200, done)

        })
    });


    // describe('GET /routes', function(){
    //     it('3 providers registered', function(done){
    //         request(router.server)
	// 			.get('/routes')
	// 			.expect(200, function(err, res){
    //                 if(err){
    //                     throw err
    //                 }
    //                 var json = JSON.parse(res.text)
    //                 assert.equal(1, json.web.length)
    //                 assert.equal(2, json.api.length)
    //                 done()
    //             })
    //     })
    // })

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

        // it('2 providers registered', function(done){
        //     request(router.server)
		// 		.get('/routes')
        //         // .expect('{}')
		// 		.expect(200, function(err, res){
        //             if(err){
        //                 throw err
        //             }
        //             var json = JSON.parse(res.text)
        //             assert.equal(1, json.web.length)
        //             assert.equal(1, json.api.length)
        //             done()
        //         })
        // })
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

        // it('2 providers registered', function(done){
        //     request(router.server)
		// 		.get('/routes')
        //         // .expect('{}')
		// 		.expect(200, function(err, res){
        //             // console.info(JSON.parse(res.text));
        //             var json = JSON.parse(res.text)
        //             assert.equal(1, json.web.length)
        //             assert.equal(1, json.api.length)
        //             done()
        //         })
        // })
    })


    // describe('checkProvider', function(){
    //     var port;
    //     var service = 'web'
    //     before(function(done){
    //         router = require('../index.js')({checkProvidersInterval: 10})
    //
    //         var provider = http.createServer(function(req, res){
    //             res.end(service);
    //         })
    //
    //         provider.listen(function(){
    //             port = this.address().port
    //             done()
    //         });
    //     })
    //     it('register', function(done){
    //
    //         request(router.server)
	// 			.post('/router/register/' + service + '/'+ port)
    //             .expect('')
	// 			.expect(200, done)
    //
    //     })
    //
    //     it('routed', function(done){
    //
    //         request(router.server)
	// 			.get('/' + service)
    //             .expect(service)
	// 			.expect(200, done)
    //
    //     })
    //
    //
    // })

}).call(this);
