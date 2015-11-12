var microserviceRouter = require('./index')({
    port: process.argv[2] || 59000,
    checkProvidersInterval: 500

})

microserviceRouter.start()
