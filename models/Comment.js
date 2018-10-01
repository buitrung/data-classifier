/**
 * Created by linhpv on 4/23/15.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var sequenceGenerator = require('./sequence');
// var scoreComputor = require('utils/score');
// var timeAgo = require('../../../models/time-ago-helper');
var commentSequence = sequenceGenerator.genSeq('Comment');

var commentSchema = new Schema({
  _id: { type: Number, index: true },
  body: { type: String },
  status: { type: Number, default: 1 }, // 0: inactive, 1: active, 2: draft
  post_id: { type: Number, ref: 'Post', require: true },
  user_id: { type: Number, ref: 'User', require: true },
  child_comments: [{ type: Number, ref: 'Comment' }],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  parent_id: { type: Number, ref: 'Comment' },
  depth: { type: Number, default: 0 },
  point: { type: Number, default: 0 },
  up_point: { type: Number, default: 0 },
  down_point: { type: Number, default: 0 },
  top_point: { type: Number, default: 0.0 },
  child_count: { type: Number, default: 0 },
  is_edit: { type: Number, default: 0 }, //1: edited
  positiveness: { type: Number, default: null }
});

commentSchema.pre('save', function(next) {
  var self = this;

  var currentDate = Date.now();
  this.updated_at = currentDate;

  // this.point = scoreComputor.calculateNormalScore(this.up_point, this.down_point);
  // this.top_point = scoreComputor.calculateCommentScore(this.up_point, this.down_point);
  if (this.isNew) {
    commentSequence.nextVal(function(next_val) {
      self._id = next_val;
      return next();
    });
  } else {
    return next();
  }
});

// commentSchema
//   .virtual('timeago')
//   .get(function() {
//     return timeAgo.ago(this.created_at);
//   });

commentSchema.methods.getCreatedAt = function(cb) {
  var date = moment(this.created_at);
  return date.format("DD/MM/YYYY");
};

commentSchema.methods.getUpdatedAt = function(cb) {

  var date = moment(this.updated_at);
  return date.format("DD/MM/YYYY");
};

commentSchema.statics.getCommentByUserId = function(user_id, limit, offset, callback) {
  var find_q = {};
  if (user_id) {
    find_q.user_id = user_id;
    find_q.status = 1;
  }
  this.model('Comment')
    .find(find_q)
    .populate(['post_id', 'user_id', 'parent_id'])
    .skip(offset)
    .limit(limit)
    .sort({ created_at: 'desc' })
    .exec(
      function(error, results) {
        if (error) {
          return callback(error);
        }
        Comment.populate(results, [{ path: 'post_id.creator_id', model: 'User' }, { path: 'comment_id.user_id', model: 'User' }, { path: 'parent_id.user_id', model: 'User' }], function(err1, resultPopu) {
          if (err1) {
            return callback(err1);
          }
          return callback(null, resultPopu);
        });

      }
    );
};

commentSchema.statics.countUserComment = function(user_id, callback) {
  var find_q = {};
  if (user_id) {
    find_q.user_id = user_id;
  }
  this.model('Comment')
    .find(find_q)
    .count(
      function(error, count) {
        if (error) {
          return callback(error);
        }

        return callback(null, count);
      }
    );

};

Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
