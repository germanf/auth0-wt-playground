"use latest";

/**
 * webtask to get notified when bitcoin price fall 10%
 *
 * @mongoApi:
 *    wt create task.js
 *      -n mongo
 *      -s MONGO_URL=mongodb://auth0-wt:<secret>@ds042379.mlab.com:42379/auth0-webtask
 *
 * @run:
 *    wt create https://raw.githubusercontent.com/auth0/wt-cli/master/sample-webtasks/mongodb.js
 *      --name mongo
 *      --secret MONGO_URL=mongodb://webtask:supersecret@ds047592.mongolab.com:47592/webtask-examples
 *
 * @cron:
 *    wt cron schedule
 *        -n mongocron
 *        -s MONGO_URL=mongodb://webtask:supersecret@ds047592.mongolab.com:47592/webtask-examples
 *        10m
 *        https://raw.githubusercontent.com/auth0/wt-cli/master/sample-webtasks/mongodb.js
 *
 */
var {MongoClient} = require('mongodb');
var {parallel} = require('async');
var {waterfall} = require('async');

/**
 * @param {secret} MONGO_URL - Mongo database url
 */
module.exports = (ctx, done) => {
  let {MONGO_URL} = ctx.data;

  if (!MONGO_URL) {
    return done(new Error('MONGO_URL secret is missing'));
  }

  waterfall([
    connectDB,
    extractWords,
    // the next two calls are only for playing, you can do a single insert
    createJobs,
    execJobs
  ], done);

//  INTERNALS

  /**
   * Connect DDBB
   * @param done
   */
  function connectDB(done) {
    console.log("executing connectDB..");
    MongoClient.connect(MONGO_URL, (err, db) => {
      done(null, {db: db});

      if (err) {
        return done(err);
      }
    });
  }

  /**
   * Extract Words
   * @param opts
   * @param done
   */
  function extractWords(opts, done) {
    console.log("executing extractWords..");
    console.log(ctx.data);

    try {
      opts.words = ctx.data.title
        .split(' ')
        .concat(
          ctx.data.excerpt.split(' ')
        );
    } catch (ex) {
      done(new Error('invalid format, expected title & excerpt in query string'));
    } finally {
      done(null, opts);
    }
  }

  /**
   * create Job
   * @param opts
   * @param done
   */
  function createJobs(opts, done) {
    console.log("executing createJobs..");

    opts.jobs = (
      opts.words && opts.words.length > 0 ?
        opts.words.map((word) => {
          return (cb) => {
            let parms = {word: word, db: opts.db};

            saveWord(parms, (err) => {
              if (err) {
                return cb(err);
              }

              cb(null);
            });
          };
        })
        : []);

    done(null, opts);
  }

  /**
   * save the given word
   * @param opts
   * @param done
   */
  function saveWord(params, done) {
    params.db
      .collection('words')
      .insertOne({word: params.word}, (err, result) => {
        if (err) {
          return done(err);
        }

        done(null, result);
      });
  }

  /**
   * exec the given jobs in parallel
   * @param opts
   * @param done
   */
  function execJobs(opts, done) {
    console.log("executing execJobs..");
    parallel(opts.jobs, (err) => {
      if (err) {
        return done(err);
      }

      done(null, 'Success.');
    });
  }
};