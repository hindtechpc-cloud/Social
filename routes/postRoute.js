const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/create', auth, upload.single('image'), postController.createPost);
router.get('/feed', auth, postController.getFeed);
router.put('/like', auth, postController.likePost);
router.put('/comment', auth, postController.addComment);
router.delete('/:postId', auth, postController.deletePost);

module.exports = router;