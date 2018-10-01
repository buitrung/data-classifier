const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/Member');

const sentiment = require('../const/enum').sentiment;

/**
 * GET /
 * Classifier page.
 */
exports.renderClassifierPage = async (req, res, next) => {
  if (!req.user) {
    req.flash('errors', { msg: 'You have to login first' });
    return res.redirect('/login');
  }

  try {
    const user = await User.findById(req.user.id);

    let { page_number } = req.params;
    page_number = Number(page_number);

    // If page number is not specified, then we will redirect to the nearest unfinished page
    if (!page_number || page_number <= 0) {
      const assigned_posts = await Post.find({
        _id: { $in: user.assigned_post_ids }
      }).sort().exec();

      let assigned_posts_map = {};
      assigned_posts.forEach(post => {
        assigned_posts_map[post._id] = post;
      });

      let min_unfinished_post_index = null;
      for (let i = 0; i < user.assigned_post_ids.length; i++) {
        const assigned_post = assigned_posts_map[user.assigned_post_ids[i]];
        if (!assigned_post.is_comments_classified) {
          min_unfinished_post_index = i;
          break;
        }
      }

      return res.redirect(`/classifier/${min_unfinished_post_index + 1}`);
    }

    const posts_count = user.assigned_post_ids.length;
    const post_id = user.assigned_post_ids[page_number - 1];

    const post = await Post.findById(post_id).exec();

    const comments = await Comment.find({ post_id: post._id }).lean().exec();

    const all_comments = await Comment.find({
      post_id: { $in: user.assigned_post_ids }
    }).exec();

    const comments_cnt = all_comments.reduce(
      (result, comment) => {
        if (comment.positiveness === sentiment.positive) {
          result.positive++;
        } else if (comment.positiveness === sentiment.neutral) {
          result.neutral++;
        } else if (comment.positiveness === sentiment.negative) {
          result.negative++;
        }
        result.all++;
        return result;
      },
      {
        positive: 0,
        neutral: 0,
        negative: 0,
        all: 0
      }
    );

    res.render('classifier', {
      title: 'Classifier',
      post,
      comments,
      comments_cnt,
      page_number,
      posts_count
    });
  } catch(err) {
    return next(err);
  }
};

/**
 * POST /
 * Classify a Coment
 */
exports.updateCommentPositiveness = async (req, res, next) => {
  const comment_id = req.params.comment_id;
  const comment_ids = req.body.comment_ids;
  const positiveness = req.body.positiveness;

  try {
    await Comment.findByIdAndUpdate(comment_id, {
      positiveness
    }).exec();

    const all_comments = await Comment.find({
      _id: { $in: comment_ids }
    }).exec();

    let is_comments_classified = true;
    for (const comment of all_comments) {
      if (comment.positiveness == null || comment.positiveness == undefined) {
        is_comments_classified = false;
        break;
      }
    }

    if (is_comments_classified) {
      const post_id = all_comments[0].post_id;
      await Post.findByIdAndUpdate(post_id, {
        is_comments_classified
      }).exec();
    }

    res.json({
      comment_id,
      positiveness,
      message: 'Success'
    });
  } catch (err) {
    return next(err);
  }
};
