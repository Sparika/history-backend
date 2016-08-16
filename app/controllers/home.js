var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  Data = mongoose.model('Client'),
  Domain = mongoose.model('Domain'),
  User = mongoose.model('User'),
  Promise = require('promise'),
  btoa = require('btoa'),
  atob = require('atob')

module.exports = function (app) {
  app.use('/', router);
};

router.get('/', function (req, res, next) {
    res.render('index', {
      title: 'Generator-Express MVC'})
});

router.get('/data', function(req, res, next) {
  Data.find(function (err, data) {
    if(err) return next(err)
  User.count(function(err, userCount){
    if(err) return next(err)
    res.render('overview', {
      title: 'Collected data',
      data: data,
      userCount: userCount,
      btoa: btoa
    })
  })
  })
})

// Will return a function using factory's closure
// to start a promise
function nextPromiseFactory(dataSet, user){
    //This will return promise
    //using factory's closure
    return function(){
       // Find domain for later
       var fqdn = dataSet.domain.split('/')
       var domainName = fqdn.length > 2 ? dataSet.domain.split('/')[2] : dataSet.domain
       var url = dataSet.domain
       return new Promise(function(resolve, reject){
            return Domain.findOrAdd(domainName, url, resolve, reject)
       }).then(function(domain){
            return Data.update(dataSet, domain, user)
       }).catch(function(err){
            console.log('Failed with dataSet:')
            console.log(dataSet)
            console.log(user.ua)
            console.log('Reason is:')
            console.log(err)
       })
    }
}
// Chain promise by setting the then
// of the previous promise with next
// next is a function that returns a promise
function chainPromise(prev, next){
    return prev.then(next)
}

function registerData(user, submitedData, res){
  var promiseHead = {}
  //Chain promise
  for(var i=0; i<submitedData.length; i++){
    if(i == 0){
      //init promise head
      promiseHead = nextPromiseFactory(submitedData[i], user)()
    }else {
      promiseHead = chainPromise(promiseHead, nextPromiseFactory(submitedData[i], user))
    }
  }
  chainPromise(promiseHead, function(success){res.sendStatus(200)})
}

router.post('/data', function(req, res){
  var submitedData = req.body.data //Data array
  //Register ID
  new Promise(
  function(resolve, reject){
    User.findOrAdd(req.body.ID, req.headers['user-agent'], resolve, reject)
  })
  .then(function(user){registerData(user, submitedData, res)})
  .catch(function(err){
    console.log(err)
    console.log('error with user '+req.body.ID+' on '+req.headers['user-agent'])
    //registerData(-1, submitedData, res)
  })
})

router.get('/data/domain', function(req, res, next){
    Domain.find({}, function (err, domain) {
        res.render('domainList', {
          title: 'Identity Domains',
          data: domain,
          btoa: btoa
        })
    })
})

router.get('/data/domain/:domain', function(req, res, next) {
  Domain.find({domain: atob(req.params.domain)})
  .populate('clients')
  .exec(function (err, data) {
    if(err) return next(err)
    res.render('domain', {
      title: atob(req.params.domain),
      data: data[0],
      btoa: btoa
    })
  })
})

router.get('/data/client', function(req, res, next){
    Data.find(function (err, data) {
        if(err) return next(err)
        res.render('clientList', {
          title: 'Clients',
          data: data
        })
    })
})

router.get('/data/client/:client', function(req, res, next) {
  Data
    .find({_id: req.params.client})
    //populate to fin user_id instead of _id
    .populate('user')
    .exec(function(err, data){
      if(err) return next(err)
      res.render('client', {
        title: data[0].client_id,
        data: data[0],
        btoa: btoa
      })
    })
})

//router.get('/data/user', function(req, res, next){
//    User
//        .find({}, function(err, users){
//        if(err) return next(err)
//        res.render('userList', {
//            title: 'User list',
//            users: users
//        })
//    })
//})

router.get('/data/user/:user', function(req, res, next) {
  User
    .find({user_id: req.params.user}, function (err, user) {
    if(err) return next(err)
    res.render('user', {
      title: req.params.user,
      user: user[0],
      btoa: btoa
    })
  })
})

router.get('/data/scope', function(req, res, next){
    Data
        .find({}, function(err, clients){
        if(err) return next(err)
        var scopes = []
        var count = []
        for(var i=0; i<clients.length; i++){
            for(var j=0; j<clients[i].scope.length; j++){
                if(scopes.indexOf(clients[i].scope[j]) == -1){
                    scopes.push(clients[i].scope[j])
                    count[clients[i].scope[j]] = 1
                } else {
                    count[clients[i].scope[j]] ++
                }


            }
        }
        res.render('scopeList', {
            title: 'Scope list',
            scopes: scopes,
            clientCount: count
        })
    })
})

router.get('/api/all', function(req, res, next){
  User.find({}, function(err, user){
    if(err)
        user = err
    Data.find({}, function(err, data){
      if(err)
        data = err
      var dump = {user: user, data: data}
      res.send(dump)
    })
  })
})

router.get('/api/user/:user', function(req, res, next){
    User.find({user_id: req.params.user}, function(err, user){
        res.send(user||err)
    })
})

router.get('/api/client/:client', function(req, res, next){
    Data.find({client_id: req.params.client}, function(err, data){
        res.send(data||err)
    })
})

router.get('/api/client/fqdn/:fqdn', function(req, res, next){
    Data.find({redirect_uri: {'$regex': req.params.fqdn, "$options": "i" }}, function(err, data){
        res.send(data||err)
    })
})

function getFQDN(URL){
    if(URL && URL.split('/').length > 3){
        var fqdn = URL.split('/')[2]
        if(fqdn.indexOf('.') > -1)
            return fqdn
	else
            return URL
    }
    // In invalid or incomplete case, use full URL
    //console.log(URL)
    return 'invalid FQDN'
}

// DATA is an array of client who share redirect_uri FQDN
function getAllScopeForFQDN(data, fqdn){
    var fqdn = 'NULL'
    if(data && data.length > 0) fqdn = getFQDN(data[0].redirect_uri[0])
    var fqdnClient = {domain: fqdn,
                      provider: []}
    for(var j=0; j<data.length; j++){
        var provider = {
            client_id:data[j].client_id,
            _id:data[j]._id,
            domain:data[j].domain,
            scope:data[j].scope,
            redirect_uri:data[j].redirect_uri}
        fqdnClient.provider.push(provider)
    }
    return fqdnClient
}

// Get a diff of scope for each CLIENT used by USER
// Mark provider which registered USER for CLIENT
function getScopeDiffForUser(user){
    var fqdnList = [],
        promises = []
    for(var i=0; i<user.data.length; i++){
        var fqdn = getFQDN(user.data[i].redirect_uri[0])
        if(!fqdnList.indexOf(fqdn)>-1){
            fqdnList.push(fqdn)
            var p = new Promise(function(resolve, reject){
                Data.find({redirect_uri: {'$regex': fqdn, "$options": "i" }})
                    .exec(function(err, data){
                        if(err) reject(err)
                        else {
                            var scopeFQDN = getAllScopeForFQDN(data)
                            for(var j=0; j<scopeFQDN.provider.length; j++){
                                for(var k=0; k<user.data.length; k++){
                                    if(user.data[k].client_id == scopeFQDN.provider.client_id)
                                        scopeFQDN.provider.used = true
                                }
                            }
                            resolve(scopeFQDN)
                        }
                })
            })
            promises.push(p)
        }
    }
    return Promise.all(promises)
}

// Get a diff of scope for all DATA
function getScopeDiffForAll(data){
    var fqdnList = [],
        promises = []
    for(var i=0; i<data.length; i++){
        var fqdn = getFQDN(data[i].redirect_uri[0])
        if(!fqdnList.indexOf(fqdn)>-1){
            fqdnList.push(fqdn)
            var p = new Promise(function(resolve, reject){
                Data.find({redirect_uri: {'$regex': fqdn, "$options": "i" }})
                    .exec(function(err, data){
                        if(err) reject(err)
                        else {
                            var scopeFQDN = getAllScopeForFQDN(data)
                            resolve(scopeFQDN)
                        }
                })
            })
            promises.push(p)
        }
    }
    return Promise.all(promises)

}

router.get('/api/user/:user/view', function(req, res, next){
    User.findOne({user_id: req.params.user})
    .populate('data')
    .exec(function(err, user){
        if(err) res.send(err)
        else if(user) {
            getScopeDiffForUser(user)
            .then(function(dataArray){
                var dataObject = {
                    user: user.user_id,
                    fqdnClient: dataArray}
                res.send(dataObject)
            })
        }
        else res.send('No user found for id '+req.params.user)
    })
})

router.get('/api/diff', function(req, res, next){
	console.log('in')
    Data.find()
    .exec(function(err, data){
        if(err) res.send(err)
        else if(data) {
	console.log('found data')
            getScopeDiffForAll(data)
            .then(function(dataArray){
		var dataObject = {fqdnClient: dataArray}
		res.send(dataObject)
            })
	    .catch(function(err){console.log(err)})
        }
        else res.send('No data found')
    })
})

router.get('/api/diff/matrix', function(req, res, next){
	console.log('in')
    Data.find()
    .exec(function(err, data){
        if(err) res.send(err)
        else if(data) {
	console.log('found data')
            getScopeDiffForAll(data)
            .then(function(dataArray){
                var csvArray = [["Client"]]
                var providerIndex = {}
                var maxIndex = 1
                for(var i=0; i<dataArray.length; i++){
                    var csvLine = [dataArray[i].domain]
                    for(var j=0; j<dataArray[i].provider.length; j++){
                        var idp = dataArray[i].provider[j].domain[0]
                        var index = providerIndex[idp]
                        if(!index){
                            index = maxIndex
                            providerIndex[idp] = index
                            csvArray[0].push(idp)
                            maxIndex++
                        }
                        csvLine[index] = dataArray[i].provider[j].scope
                    }
                    csvArray.push(csvLine)
                }
                res.send(csvArray.toString())
            })
	    .catch(function(err){console.log(err)})
        }
        else res.send('No data found')
    })
})

router.get('/data/diff', function(req, res, next){
    Data.find()
    .exec(function(err, data){
        if(err) res.send(err)
        else if(data) {
            getScopeDiffForAll(data)
            .then(function(dataArray){
                res.render('fqdnScopeList', {
                      title: 'Client Diff',
                      data: dataArray
                })
            })
        }
        else res.send('No data found')
    })
})

//router.get('/rm', function(req, res){
//  Data.remove({}, function (err) {
//    if (err) return handleError(err);
//    // removed!
//    User.remove({}, function (err) {
//      if (err) return handleError(err);
//      // removed!
//      res.redirect('/data')
//    });
//  });
//})
