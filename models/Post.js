/**
 * Created by linhpv on 4/23/15.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
// var scoreComputor = require('utils/score');
// var response_code = require('./response-code');
var sequenceGenerator = require('./sequence');
var postSequence = sequenceGenerator.genSeq('Post');
var async = require('async');

var postSchema = new Schema({
  _id: { type: Number, index: true },
  type: { type: Number, default: 0 }, //0: Text post, 1: Link post, 2: Image post
  status: { type: Number, default: 1 }, // 0: Inactive, 1: Active, 2: Draft
  title: { type: String, required: true },
  body: { type: String },
  thumbnail: { type: String },
  property: {},
  slug: { type: String, index: true },
  url_description: { type: String },
  content: { type: String },
  new_title: { type: String },
  description: { type: String },
  tags: [{ type: Schema.ObjectId, ref: 'TagsOfCategory' }],
  //Relatings
  cat_id: { type: Number, ref: 'Category' },
  creator_id: { type: Number, ref: 'User' },
  child_comments: [{ type: Number, ref: 'Comment' }],

  //Scoring
  power_point: { type: Number, default: 0 },
  point: { type: Number, default: 0 },
  up_point: { type: Number, default: 0 },
  down_point: { type: Number, default: 0 },
  date_point: { type: Number, default: 0 },
  hot_point: { type: Number, default: 0.0 },
  controlversial_point: { type: Number, default: 0.0 },

  //Miscellaneous
  views_count: { type: Number, default: 0 },
  comment_count: { type: Number, default: 0 },
  title_searchable: { type: String },
  og_image_url: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  is_edit: { type: Number, default: 0 }, //0 : Never been edited, 1: Edited at least one time

  is_comments_classified: { type: Boolean, default: false }
});

postSchema.pre('save', function(next) {
  var self = this;

  var currentDate = Date.now();
  this.updated_at = currentDate;

  // this.point = scoreComputor.calculateNormalScore(this.up_point, this.down_point);
  // this.hot_point = scoreComputor.caculatePostScore(this.up_point, this.down_point, this.power_point, this.created_at || Date.now());
  // this.controlversial_point = scoreComputor.calculateControlversialScore(this.up_point, this.down_point, this.comment_count, this.created_at || Date.now());
  if (this.isNew) {
    postSequence.nextVal(function(next_val) {
      self._id = next_val;
      self.date_point = Date.now();
      return next();
    });
  } else {
    return next();
  }
});

postSchema
  .virtual('quote_link')
  .get(function() {
    if (this.type === 1) {
      var match = this.body.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i);
      if (match !== null && match.length > 2 && typeof match[2] === 'string' && match[2].length > 0)
        return match[2];
    }
    if (this.type === 2) {
      return this.body;
    }
    return null;
  });

function createFindQueryWithDate(cat_id, higher_bound_date, lower_bound_date) {
  var find_q = {};

  if (lower_bound_date !== null && higher_bound_date !== null)
    find_q = { date_point: { $gte: lower_bound_date, $lte: higher_bound_date } };
  else if (lower_bound_date && higher_bound_date === null)
    find_q = { date_point: { $gte: lower_bound_date } };
  else if (lower_bound_date === null && higher_bound_date)
    find_q = { date_point: { $lte: higher_bound_date } };
  else
    find_q = null;

  if (find_q !== null && cat_id) {
    find_q.cat_id = cat_id;
  }

  find_q.status = 1;
  find_q.created_at = { $gte: '2016-08-01T14:11:54.667Z' };

  return find_q;
}

function createFindQueryWithDateAndFilter(cat_id, filter, higher_bound_date, lower_bound_date) {
  var find_q = {};
  var returnQuery = {};
  var andQuery = [];

  if (lower_bound_date !== null && higher_bound_date !== null)
    find_q.date_point = { $gte: lower_bound_date, $lte: higher_bound_date };
  else if (lower_bound_date && higher_bound_date === null)
    find_q.date_point = { $gte: lower_bound_date };
  else if (lower_bound_date === null && higher_bound_date)
    find_q.date_point = { $lte: higher_bound_date };
  else
    find_q = null;

  if (find_q !== null && cat_id) {
    find_q.cat_id = cat_id;
  }

  find_q.status = 1;
  find_q.type = 0;
  if (filter.tags && filter.tags.length) {
    //todo add filter with array tag_id
    var array_tag_object_id = filter.tags.map(
      (x) => {
        return mongoose.Types.ObjectId(x);
      });
    // find_q.tags = { $in : array_tag_object_id};
    andQuery.push({ tags: { $in: array_tag_object_id } });
  }
  if (filter.time) {
    var filterTime = new Date();


    switch (filter.time) {
      case 'week':
        filterTime.setDate(filterTime.getDate() - 7);
        break;
      case '2week':
        filterTime.setDate(filterTime.getDate() - 14);
        break;
      case 'month':
        filterTime.setMonth(filterTime.getMonth() - 1);
        break;
      case 'quarter':
        filterTime.setMonth(filterTime.getMonth() - 3);
        break;
      case 'year':
        filterTime.setYear(filterTime.getYear() - 1);
        break;
      default:
        filterTime = null;
    }

    if (filterTime) {
      andQuery.push({ created_at: { $gte: filterTime.toISOString() } });
    }
  } else {
    andQuery.push({ created_at: { $gte: '2016-08-01T14:11:54.667Z' } });
  }

  if (andQuery.length) {
    andQuery.push(find_q);

    returnQuery.$and = andQuery;
  } else {
    returnQuery = find_q;
  }

  return returnQuery;
}

postSchema.methods.getCreatedAt = function(callback) {

  var date = moment(this.created_at);
  return date.format("DD/MM/YYYY");
};
postSchema.methods.getUpdatedAt = function(callback) {

  var date = moment(this.updated_at);
  return date.format("DD/MM/YYYY");
};

postSchema.statics.getPosts = function(limit, offset, post_ids, callback) {
  var find_q = {
    created_at: {
      $gte: new Date('2018-01-01')
    },
    _id: {
      $in: post_ids
    },
    child_comments: {
      $gte: 1
    },
    status: 1
  };
  console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%");
  if (find_q) {
    this.model('Post')
      .find(find_q)
      .populate('child_comments')
      // .where('_id').nin(notInIds)
      .skip(offset)
      .limit(limit)
      // .sort({ point: 'desc' })
      .lean()
      .exec(
        function(error, results) {
          if (error) {
            return callback(error);
          }
          return callback(null, results);
        }
      );
  }
};

postSchema.statics.getPostsByTop = function(cat_id, notInIds, filter, limit, offset, higher_bound_date, lower_bound_date, callback) {
  var find_q = createFindQueryWithDateAndFilter(cat_id, filter, higher_bound_date, lower_bound_date);
  console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%");
  if (find_q) {
    this.model('Post')
      .find(find_q)
      .populate('creator_id cat_id tags', '-hashed_password -email -settings -count_notification -status -salt')
      .where('_id').nin(notInIds)
      .skip(offset)
      .limit(limit)
      .sort({ point: 'desc' })
      .lean()
      .exec(
        function(error, results) {
          if (error) {
            return callback(error);
          }
          return callback(null, results);
        }
      );
  }
};

postSchema.statics.getPostsByNew = function(cat_id, notInIds, filter, limit, offset, higher_bound_date, lower_bound_date, callback) {
  var find_q = createFindQueryWithDateAndFilter(cat_id, filter, higher_bound_date, lower_bound_date);

  if (find_q) {
    this.model('Post')
      .find(find_q)
      .populate('creator_id cat_id tags', '-hashed_password -email -settings -count_notification -status -salt')
      .where('_id').nin(notInIds)
      .skip(offset)
      .limit(limit)
      .sort({ date_point: 'desc' })
      .lean()
      .exec(
        function(error, results) {
          if (error) {
            return callback(error);
          }
          return callback(null, results);
        }
      );
  }
};

postSchema.statics.getPostsByHot = function(cat_id, notInIds, filter, limit, offset, higher_bound_date, lower_bound_date, callback) {
  var find_q = createFindQueryWithDateAndFilter(cat_id, filter, higher_bound_date, lower_bound_date);

  if (find_q) {
    this.model('Post')
      .find(find_q)
      .populate('creator_id cat_id tags', '-hashed_password -email -settings -count_notification -status -salt')
      .where('_id').nin(notInIds)
      .skip(offset)
      .limit(limit)
      .sort({ hot_point: 'desc' })
      .lean()
      .exec(
        function(err, results) {
          if (err) {
            return callback(err);
          }
          return callback(null, results);
        }
      );
  }
};

postSchema.statics.getPostsByControlverisal = function(cat_id, notInIds, filter, limit, offset, higher_bound_date, lower_bound_date, callback) {
  var find_q = createFindQueryWithDateAndFilter(cat_id, filter, higher_bound_date, lower_bound_date);

  if (find_q) {
    this.model('Post')
      .find(find_q)
      .populate('creator_id cat_id tags', '-hashed_password -email -settings -count_notification -status -salt')
      .where('_id').nin(notInIds)
      .skip(offset)
      .limit(limit)
      .sort({ controlversial_point: 'desc' })
      .lean()
      .exec(
        function(error, results) {
          if (error)
            return callback(error);
          return callback(null, results);
        }
      );
  }
};

postSchema.statics.getHotPostsInFeed = function(filter, subscribedCategories, followings, creator_id, limit, notInIds, offset, higher_bound_date, lower_bound_date, callback) {
  // var find_q = createFindQueryWithDate(null, higher_bound_date, lower_bound_date);
  var find_q = createFindQueryWithDateAndFilter(null, filter, higher_bound_date, lower_bound_date);
  var condition = buildFeedQuery(subscribedCategories, followings, creator_id);
  if (find_q) {
    this.model('Post')
      .find(find_q)
      .or(condition)
      .populate('creator_id cat_id', '-hashed_password -email -settings -count_notification -status -salt')
      .where('_id').nin(notInIds)
      .skip(offset)
      .limit(limit)
      .sort({ hot_point: 'desc' })
      .lean()
      .exec((err, results) => {
        if (err) {
          return callback(err);
        }
        return callback(null, results);
      });
  }
};

postSchema.statics.getNewPostsInFeed = function(filter, subscribedCategories, followings, creator_id, limit, notInIds, offset, higher_bound_date, lower_bound_date, callback) {
  // var find_q = createFindQueryWithDate(null, higher_bound_date, lower_bound_date);
  var find_q = createFindQueryWithDateAndFilter(null, filter, higher_bound_date, lower_bound_date);
  var condition = buildFeedQuery(subscribedCategories, followings, creator_id);
  if (find_q) {
    this.model('Post')
      .find(find_q)
      .or(condition)
      .populate('creator_id cat_id', '-hashed_password -email -settings -count_notification -status -salt')
      .where('_id').nin(notInIds)
      .skip(offset)
      .limit(limit)
      .sort({ date_point: 'desc' })
      .lean()
      .exec((err, results) => {
        if (err) {
          return callback(err);
        }
        return callback(null, results);
      });
  }
};

postSchema.statics.getTopPostsInFeed = function(filter, subscribedCategories, followings, creator_id, limit, notInIds, offset, higher_bound_date, lower_bound_date, callback) {
  // var find_q = createFindQueryWithDate(null, higher_bound_date, lower_bound_date);
  console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$");
  var find_q = createFindQueryWithDateAndFilter(null, filter, higher_bound_date, lower_bound_date);
  var condition = buildFeedQuery(subscribedCategories, followings, creator_id);
  if (find_q) {
    this.model('Post')
      .find(find_q)
      .or(condition)
      .populate('creator_id cat_id', '-hashed_password -email -settings -count_notification -status -salt')
      .where('_id').nin(notInIds)
      .skip(offset)
      .limit(limit)
      .sort({ point: 'desc' })
      .lean()
      .exec((err, results) => {
        if (err) {
          return callback(err);
        }
        return callback(null, results);
      });
  }
};

postSchema.statics.getControversialPostsInFeed = function(filter, subscribedCategories, followings, creator_id, limit, notInIds, offset, higher_bound_date, lower_bound_date, callback) {
  // var find_q = createFindQueryWithDate(null, higher_bound_date, lower_bound_date);
  var find_q = createFindQueryWithDateAndFilter(null, filter, higher_bound_date, lower_bound_date);
  var condition = buildFeedQuery(subscribedCategories, followings, creator_id);
  if (find_q) {
    this.model('Post')
      .find(find_q)
      .or(condition)
      .populate('creator_id cat_id', '-hashed_password -email -settings -count_notification -status -salt')
      .where('_id').nin(notInIds)
      .skip(offset)
      .limit(limit)
      .sort({ controlversial_point: 'desc' })
      .lean()
      .exec((err, results) => {
        if (err) {
          return callback(err);
        }
        return callback(null, results);
      });
  }
};

function buildFeedQuery(subscribedCategories, followings, creator_id) {
  var query = [];
  if (subscribedCategories && subscribedCategories.length > 0) {
    var categoriesQuery = { cat_id: { $in: subscribedCategories } };
    query.push(categoriesQuery);
  }
  if (creator_id) {
    followings.push(creator_id);
  }
  if (followings && followings.length > 0) {
    var followingsQuery = { creator_id: { $in: followings } };
    query.push(followingsQuery);
  }
  return query;
}

postSchema.statics.getPostsByCreated = function(cat_id, creator_id, limit, offset, higher_bound_date, lower_bound_date, callback) {
  var find_q = createFindQueryWithDate(cat_id, higher_bound_date, lower_bound_date);

  if (find_q) {
    find_q.creator_id = creator_id;
    find_q.status = 1;
    this.model('Post')
      .find(find_q)
      .populate('creator_id cat_id', '-hashed_password -email -settings -count_notification -status -salt')
      .skip(offset)
      .limit(limit)
      .sort({ date_point: 'desc' })
      .exec(
        function(error, results) {
          if (error) {
            return callback(error);
          }

          return callback(null, results);
        }
      );
  }
};

postSchema.statics.countPostsByCreated = function(cat_id, creator_id, limit, offset, higher_bound_date, lower_bound_date, callback) {
  var find_q = createFindQueryWithDate(cat_id, higher_bound_date, lower_bound_date);

  if (find_q) {
    find_q.creator_id = creator_id;
    this.model('Post')
      .find(find_q)
      .count(function(err, count) {
        return callback(err, count);
      });
  }
};

postSchema.statics.countPostsToPaginate = function(cat_id, notInIds, filter, limit, offset, higher_bound_date, lower_bound_date, callback) {
  var find_q = createFindQueryWithDateAndFilter(cat_id, filter, higher_bound_date, lower_bound_date);

  if (find_q) {
    this.model('Post')
      .find(find_q)
      .where('_id').nin(notInIds)
      .count(function(err, count) {
        return callback(err, count);
      });
  }
};

postSchema.statics.countPostsInFeed = function(filter, subscribedCategories, followings, creator_id, limit, notInIds, offset, higher_bound_date, lower_bound_date, callback) {
  // var find_q = createFindQueryWithDate(null, higher_bound_date, lower_bound_date);
  var find_q = createFindQueryWithDateAndFilter(null, filter, higher_bound_date, lower_bound_date);
  var condition = buildFeedQuery(subscribedCategories, followings, creator_id);
  if (find_q) {
    this.model('Post')
      .find(find_q)
      .or(condition)
      .where('_id').nin(notInIds)
      .count((err, count) => {
        return callback(err, count);
      });
  }
};

Post = mongoose.model('Post', postSchema);

module.exports = Post;
