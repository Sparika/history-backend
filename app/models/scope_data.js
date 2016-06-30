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
})

var UserSchema = new Schema({
  user_id: String,
  ua: [String],
  data: [{ type: Schema.Types.ObjectId, ref: 'Data' }],
  domain: [{type: String, ref: 'Domain'}]
})

var IdentityDomainSchema = new Schema({
    domain: {type: String, index: true},
    urls: [String],
    clients: [{ type: Schema.Types.ObjectId, ref: 'Client' }],
})

UserSchema.statics.findOrAdd = function(id, ua, resolve, reject){
  this.findOneAndUpdate({user_id: id},
    { $setOnInsert: {data: []},
      $addToSet: {ua: ua}
    },
    {new:true, upsert:true},
    function(err, res){
        if(err) reject(err)
        else resolve(res)
  })
}


IdentityDomainSchema.statics.findOrAdd = function(domainName, url, resolve, reject){
    this.findOneAndUpdate({domain: domainName},
      { $setOnInsert: {data: [],
                       clients: []},
        $addToSet: {urls: url}
      },
      {new:true, upsert:true},
      function(err, res){
        if(err) reject (err)
        else resolve(res)
      }
    )
}

var UserModel = mongoose.model('User', UserSchema)
var DomainModel = mongoose.model('Domain', IdentityDomainSchema)

// FIND and ADD or CREATE
ClientSchema.statics.update = function(submitedData, domain, user){
  var dataSchema = this
  return new Promise(function(resolve, reject){
    if(submitedData.client_id){
      var splitedScopes = []
      if(submitedData.scope){
        splitedScopes = submitedData.scope.split(/%3A|%20|\+|,|\s/)
        splitedScopes.push(submitedData.scope)
      }
      dataSchema.findOneAndUpdate(
          {client_id: submitedData.client_id},
          {$addToSet: {scope: {$each: splitedScopes},
                      redirect_uri: submitedData.redirect_uri,
                      response_type: submitedData.response_type,
                      acr_values: submitedData.acr_values,
                      user: user._id,
                      claims: submitedData.claims,
                      domain: domain.domain
          }},
          {new:true, upsert:true},
          function(err, res){
            if(err) reject(err)
            else {
                DomainModel.findOneAndUpdate(
                    {_id: domain._id},
                    {$addToSet: {clients: res._id}},
                    function(err, resD){
                        if(err) reject(err)
                        else {
                            UserModel.findOneAndUpdate(
                                {_id: user._id},
                                {$addToSet: {data: res._id, domain: domain.domain}},
                                function(err, resU){
                                    if(err) reject(err)
                                    else resolve(res)
                                }
                            )
                        }
                    })
            }
      })
    } else {
        reject('No client')
    }
  })
}

mongoose.model('Client', ClientSchema)