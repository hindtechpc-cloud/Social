const Post = require('../models/Post');

const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "posts" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

exports.createPost = async (req, res) => {
  try {
    const { text } = req.body;
    let imageUrl = "";

    if (!text && !req.file) {
      return res
        .status(400)
        .json({ error: "Post must have text or image" });
    }

    // 🌥️ Upload image to Cloudinary
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      imageUrl = result.secure_url;
    }

    const post = new Post({
      userId: req.user._id,
      username: req.user.name,
      text: text || "",
      image: imageUrl,
    });

    await post.save();

    res.status(201).json({
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({
      error: "Failed to create post",
    });
  }
};


exports.getFeed = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'name profilePic');

        const totalPosts = await Post.countDocuments();

        res.json({
            posts,
            currentPage: page,
            totalPages: Math.ceil(totalPosts / limit),
            totalPosts
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.likePost = async (req, res) => {
    try {
        const { postId } = req.body;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check if already liked
        const alreadyLiked = post.likes.find(
            like => like.userId.toString() === req.user._id.toString()
        );

        if (alreadyLiked) {
            // Remove like
            post.likes = post.likes.filter(
                like => like.userId.toString() !== req.user._id.toString()
            );
        } else {
            // Add like
            post.likes.push({
                userId: req.user._id,
                username: req.user.name
            });
        }

        await post.save();

        res.json({
            message: alreadyLiked ? 'Post unliked' : 'Post liked',
            likes: post.likes
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addComment = async (req, res) => {
    try {
        const { postId, text } = req.body;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const comment = {
            userId: req.user._id,
            username: req.user.name,
            text
        };

        post.comments.push(comment);
        await post.save();

        res.json({
            message: 'Comment added',
            comment: post.comments[post.comments.length - 1]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const { postId } = req.params;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check if user owns the post
        if (post.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await post.deleteOne();

        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};