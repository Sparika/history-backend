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
DataSchema.statics.pushScope = function(submitedData, user, resolve, reject){
  this.findOneAndUpdate({client_id: submitedData.client_id},
                        { $setOnInsert: {scope: [], claims: [], redirect_uri: [], domain: []}},
                        {new:true, upsert:true},
                        function(err, res){
    if(err) reject(err)
    //Add domain if needed
    if(res.domain.indexOf(submitedData.domain) == -1) {
      res.domain.push(submitedData.domain)
    }
    //Add redirect_uri if needed
    if(res.redirect_uri.indexOf(submitedData.redirect_uri) == -1) {
      res.redirect_uri.push(submitedData.redirect_uri)
    }
    //Add user_id if needed
    if(res.user.indexOf(user) == -1) {
      res.user.push(user)
    }
    //Add claims if needed
    if(res.claims.indexOf(submitedData.claims) == -1) {
      res.claims.push(submitedData.claims)
    }
    //Add scope if needed
    if (res.scope.indexOf(submitedData.scope) == -1) {
      res.scope.push(submitedData.scope)
    }

    res.save().then(function(saved){resolve(saved)})
  })
}

var UserSchema = new Schema({
  _id: String,
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
                        { $setOnInsert: {ua: [ua]}},
                        {new:true, upsert:true},
                        function(err, res){
    if(err) reject(err)
    if(res.ua.indexOf(ua) == -1){
      res.ua.push(ua)
    }
    resolve(res)
  })
}


mongoose.model('Data', DataSchema)
mongoose.model('User', UserSchema)
