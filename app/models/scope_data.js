// Example model

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var ClientSchema = new Schema({
  domain: [{type: String, ref: 'Domain'}],
  client_id: {type: String, index: true},
  redirect_uri: [String],
  scope: [String],
  claims: [String],
  response_type: [String],
  acr_values: [String],
  user: [{type: String, ref: 'User'}]
});

// FIND
//DataSchema.statics.findByDomain = function(domain, errorCb){
//  return this.find({ domain: new RegExp(domain, 'i') }, errorCb);
//}
ClientSchema.statics.findByClientID = function(client_id, cb){
  return this.find({ client_id: new RegExp(client_id, 'i') }, cb);
}

// FIND and ADD or CREATE
ClientSchema.statics.update = function(submitedData, domain, user){
    var dataSchema = this
  return new Promise(function(resolve, reject){
      dataSchema.findOneAndUpdate({client_id: submitedData.client_id},
                            { $setOnInsert: {scope: [], claims: [], redirect_uri: [], domain: [], user:[]}},
                            {new:true, upsert:true},
                            function(err, res){
        if(err) {
          reject(err)
        } else {
            //Add scope if needed
            if (res.scope.indexOf(submitedData.scope) == -1) {
              res.scope.push(submitedData.scope)
            }
            //Add response_type if needed
            if (res.response_type.indexOf(submitedData.response_type) == -1) {
              res.response_type.push(submitedData.response_type)
            }
            //Add acr_values if needed
            if (res.acr_values.indexOf(submitedData.acr_values) == -1) {
              res.acr_values.push(submitedData.acr_values)
            }
            //Add user_id if needed
            if(res.user.indexOf(user._id) == -1) {
              res.user.push(user._id)
            }
            //Add claims if needed
            if(res.claims.indexOf(submitedData.claims) == -1) {
              res.claims.push(submitedData.claims)
            }
            //Add scope if needed
            if (res.scope.indexOf(submitedData.scope) == -1) {
              res.scope.push(submitedData.scope)
            }
            //Then add individual scopes
            var splitedScopes = submitedData.scope.split(/%3A|%20|\+|,|\s/)
            for(var i=0; i<splitedScopes.length; i++){
                if(res.scope.indexOf(splitedScopes[i]) == -1 && splitedScopes[i] != "" )
                    res.scope.push(splitedScopes[i])
            }

            var rTest = function(){
                resolve()
            }

            //Found domain, update and save it
            if(domain.clients.indexOf(res._id) == -1){
                domain.clients.push(res._id)
            }
            if(res.domain.indexOf(domain.domain) == -1){
                res.domain.push(domain.domain)
            }
            //Save domain
            console.log('saving domain')
            domain.save()
            //Save user then save data
            .then(function(domain){
                if(user.data.indexOf(res._id) == -1){
                    user.data.push(res._id)
                }
                if(user.domain.indexOf(domain.domain) == -1){
                    user.domain.push(domain.domain)
                }
                //This return a promise
                console.log('Saving everything')
                user.save()
                .then(res.save())
                .then(resolve)
            })
        }
      })
    })
}

var UserSchema = new Schema({
  user_id: String,
  ua: [String],
  data: [{ type: Schema.Types.ObjectId, ref: 'Data' }],
  domain: [{type: String, ref: 'Domain'}]
})
// FIND
//DataSchema.statics.findByDomain = function(domain, errorCb){
//  return this.find({ domain: new RegExp(domain, 'i') }, errorCb);
//}
UserSchema.statics.findByClientID = function(user_id, cb){
  return this.find({user_id: user_id}, cb);
}
UserSchema.statics.findOrAdd = function(id, ua, resolve, reject){
  this.findOneAndUpdate({user_id: id},
                        { $setOnInsert: {ua: [], data: []}},
                        {new:true, upsert:true},
                        function(err, res){
    if(err) reject(err)
    if(res.ua.indexOf(ua) == -1){
      res.ua.push(ua)
      console.log('Push UA'+ua)
    }
    resolve(res)
  })
}

var IdentityDomainSchema = new Schema({
    domain: {type: String, index: true},
    urls: [String],
    clients: [{ type: Schema.Types.ObjectId, ref: 'Client' }],
})

IdentityDomainSchema.statics.findOrAdd = function(domainName, url, resolve, reject){
    this.findOneAndUpdate({domain: domainName},
                          { $setOnInsert: {urls: [],
                                           data: [],
                                           clients: []}},
                          {new:true, upsert:true},
                          function(err, res){
        if(err){
            console.log(err)
            reject (err)
        } else {
            if(res.urls.indexOf(url) == -1){
                res.urls.push(url)
            }
            console.log('resolve IDP: '+res)
            resolve(res)
        }
    })
}

mongoose.model('Client', ClientSchema)
mongoose.model('User', UserSchema)
mongoose.model('Domain', IdentityDomainSchema)
