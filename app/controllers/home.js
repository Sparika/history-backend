var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  Data = mongoose.model('Data'),
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
    User.find(function(err, users){console.log(users)})
    console.log(userCount)
    if(err) return next(err)
    res.render('data', {
      title: 'Collected data',
      data: data,
      userCount: userCount,
      btoa: btoa
    })
  })
  })
})

function registerData(user, submitedData, res){
  var promiseHead = {}
  var nextPromise = function(sub){
    return new Promise(function(resolve, reject){
      Data.pushScope(sub, user, resolve, reject)
    })
  }
  var chainPromise = function(prev, next){
    return prev.then(function(success){
      return next
    })
  }
  var endPromise = function(chain, res){
  }
  //Chain promise
  for(var i=0; i<submitedData.length; i++){
    if(i == 0) promiseChain = nextPromise(submitedData[i])
    else promiseChain = chainPromise(promiseChain, nextPromise(submitedData[i]))
  }
  promiseChain.then(function(success){
    res.sendStatus(200);
  })

}

router.post('/data', function(req, res){
  var submitedData = req.body.data //Data array
  //Register ID
  new Promise(
  function(resolve, reject){
    User.findOrAdd(req.body.ID, req.body.UA, resolve, reject)
  })
  .then(function(user){registerData(user._id, submitedData, res)})
  .catch(function(err){
    console.log('error with user '+submitedData.ID+' on '+submitedData.UA)
    registerData(-1, submitedData, res)
  })
})

router.get('/data/domain/:domain', function(req, res, next) {
  Data.find({domain: atob(req.params.domain)}, function (err, data) {
    if(err) return next(err)
    res.render('domain', {
      title: atob(req.params.domain),
      data: data,
      btoa: btoa
    })
  })
})

router.get('/data/client/:client', function(req, res, next) {
  Data.find({client_id: atob(req.params.client)}, function (err, data) {
    console.log(data)
    if(err) return next(err)
    res.render('client', {
      title: atob(req.params.client),
      data: data[0],
      btoa: btoa
    })
  })
})


//router.get('/createTest', function(req, res){
//  Data.create({client_id: 'X0X0', domain: 'localhost', scope: ['hellow', 'world']}, function(err, obj){
//    if(err) console.log(err)
//    else res.render('index', {
//               title: 'Data',
//               data: obj
//             })
//  })
//})
//
//router.get('/UpdateTest', function(req, res){
//  var submitedData = [{"domain":"https://www.facebook.com/login.php","scope":"number1","client_id":"274266067164"},
//                      {"domain":"Another domain","scope":"and another scope","clientID":"274266067164"},
//                      {"domain":"https://www.facebook.com/login.php","scope":"number2","client_id":"138566025676"},
//                      {"domain":"https://www.facebook.com/login.php","scope":"third_scope","client_id":"138566025676"},
//                      {"domain":"https://accounts.google.com/ServiceLogin","scope":"profile%2Bemail","clientID":"622686756548-j87bjniqthcq1e4hbf1msh3fikqn892p.apps.googleusercontent.com"}]
//  var promiseHead = {}
//  var nextPromise = function(sub){
//    return new Promise(function(resolve, reject){
//      Data.pushScope(sub, resolve, reject)
//    })
//  }
//  var chainPromise = function(prev, next){
//    return prev.then(function(success){
//      return next
//    })
//  }
//  //Chain promise
//  for(var i=0; i<=submitedData.length; i++){
//  console.log(i)
//    if(i == 0) promiseChain = nextPromise(submitedData[i])
//    else if (i<submitedData.length) promiseChain = chainPromise(promiseChain, nextPromise(submitedData[i]))
//    else{
//      promiseChain.then(function(success){
//        res.redirect('/data')
//      })
//    }
//  }
//})

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
