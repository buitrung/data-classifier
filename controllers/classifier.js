const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/Member');

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

    res.render('classifier', {
      title: 'Classifier',
      post,
      comments,
      page_number,
      posts_count
    });
  } catch(err) {
    return next(err);
  }
};
