'use strict';

/**
 * webtask to get notified when bitcoin price fall 10%
 *
 * @run: wt create --secret MONGO_URL=mongodb://https://api.mlab.com/api/1/databases?apiKey={token} task.js
 */

var parallel    = require('async').parallel;
var MongoClient = require('mongodb').MongoClient;

module.exports = function (ctx, done) {
  var words = ctx.data.title
    .split(' ')
    .concat(
      ctx.data.excerpt.split(' ')
    );

  MongoClient.connect(ctx.data.MONGO_URL, function (err, db) {
    if(err) return done(err);

    var job_list = words.map(function (word) {

      return function (cb) {
        save_word(word, db, function (err) {
          if(err) return cb(err);

          cb(null);
        });
      };

    });

    parallel(job_list, function (err) {
      if(err) return done(err);

      done(null, 'Success.');
    });

  });
};