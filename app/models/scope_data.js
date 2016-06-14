// Example model

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var DataSchema = new Schema({
  domain: [String],
  client_id: {type: String, index: true},
  redirect_uri: [String],
  scope: [String],
  claims: [String],
  user: [{type: String, ref: 'User'}]
});

// FIND
//DataSchema.statics.findByDomain = function(domain, errorCb){
//  return this.find({ domain: new RegExp(domain, 'i') }, errorCb);
//}
DataSchema.statics.findByClientID = function(client_id, cb){
  return this.find({ client_id: new RegExp(client_id, 'i') }, cb);
}

// FIND and ADD or CREATE
DataSchema.statics.pushScope = function(submitedData, user){
    var dataSchema = this
  return new Promise(function(resolve, reject){
      dataSchema.findOneAndUpdate({client_id: submitedData.client_id},
                            { $setOnInsert: {scope: [], claims: [], redirect_uri: [], domain: [], user:[]}},
                            {new:true, upsert:true},
                            function(err, res){
        if(err) {
          reject(err)
        } else {
            //Add domain if needed
            if(res.domain.indexOf(submitedData.domain) == -1) {
              res.domain.push(submitedData.domain)
            }
            //Add redirect_uri if needed
            if(res.redirect_uri.indexOf(submitedData.redirect_uri) == -1) {
              res.redirect_uri.push(submitedData.redirect_uri)
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

            var rTest = function(){
                resolve()
            }

            //Save user then save data
            if(user.data.indexOf(res._id) == -1){
                user.data.push(res._id)
                var saveRes =
                //This return a promise
                user.save()
                .then(res.save().then(rTest))
            } else {
                res.save().then(rTest)
            }
        }
      })
    })
}

var UserSchema = new Schema({
  user_id: String,
  ua: [String],
  data: [{ type: Schema.Types.ObjectId, ref: 'Data' }]
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


mongoose.model('Data', DataSchema)
mongoose.model('User', UserSchema)
