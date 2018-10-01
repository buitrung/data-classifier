const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/Member');

const sentiment = require('../const/enum').sentiment;

/**
 * GET /
 * Classifier page.
 */
exports.renderAdminPage = async (req, res, next) => {
  if (!req.user) {
    req.flash('errors', { msg: 'You have to login first' });
    return res.redirect('/login');
  }

  try {
    const users = await User.find().exec();

    let all_post_ids = [];
    let all_assigned_post_ids = [];

    for (const user of users) {
      all_assigned_post_ids = all_assigned_post_ids.concat(user.assigned_post_ids);
    }

    all_assigned_post_ids = Array.from(new Set(all_assigned_post_ids));

    const all_posts = await Post.find({
      created_at: { $gte: new Date('2018-01-01') },
      comment_count: { $gt: 0 },
      status: 1
    }).exec();
    let all_posts_map = {};
    all_posts.forEach(post => {
      all_posts_map[post._id] = post;
      all_post_ids.push(post._id);
    });

    let all_comments_cnt = {
      positive: 0,
      neutral: 0,
      negative: 0,
      all: 0
    };

    all_comments_cnt.all = await Comment.find({
      post_id: { $in: all_post_ids }
    }).count().exec();

    const all_assigned_comments = await Comment.find({
      post_id: { $in: all_assigned_post_ids }
    }).exec();

    for (let user of users) {
      user.comments_cnt = {
        positive: 0,
        neutral: 0,
        negative: 0,
        all: 0
      };

      const user_comments = all_assigned_comments.filter(
        comment => user.assigned_post_ids.includes(comment.post_id)
      );

      user_comments.forEach(comment => {
        if (comment.positiveness === sentiment.positive) {
          user.comments_cnt.positive++;
        } else if (comment.positiveness === sentiment.neutral) {
          user.comments_cnt.neutral++;
        } else if (comment.positiveness === sentiment.negative) {
          user.comments_cnt.negative++;
        }
        user.comments_cnt.all++;
      });

      all_comments_cnt.positive += user.comments_cnt.positive;
      all_comments_cnt.neutral += user.comments_cnt.neutral;
      all_comments_cnt.negative += user.comments_cnt.negative;
    }

    res.render('admin', {
      title: 'Admin',
      users,
      all_comments_cnt,
      all_assigned_post_ids,
      all_posts,
      all_assigned_comments
    });
  } catch (err) {
    return next(err);
  }
}