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
       var domainName = dataSet.domain.split('/')[2]
       var url = dataSet.domain
       return new Promise(function(resolve, reject){
            return Domain.findOrAdd(domainName, url, resolve, reject)
       }).then(function(domain){
            return Data.update(dataSet, domain, user)
       }).catch(err){
            console.log('Failed with dataSet:')
            console.log(dataSet)
            console.log(user)
            console.log('Reason is:')
            console.log(err)
       }
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

router.get('/data/user', function(req, res, next){
    User
        .find({}, function(err, users){
        if(err) return next(err)
        res.render('userList', {
            title: 'User list',
            users: users
        })
    })
})

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

router.get('/rm', function(req, res){
  Data.remove({}, function (err) {
    if (err) return handleError(err);
    // removed!
    User.remove({}, function (err) {
      if (err) return handleError(err);
      // removed!
      res.redirect('/data')
    });
  });
})
