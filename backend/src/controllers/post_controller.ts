import { Hono } from 'hono';
import { PostService } from '../services/post_service';

export const postController = new Hono();

postController.post('/add', async (c) => await PostService.AddPost(c) );
postController.get('/', async (c) => await PostService.GetPosts(c) );
postController.get('/:id', async (c) => await PostService.GetPostById(c) );
postController.post('/:id/like', async (c) => await PostService.ToggleLike(c) );
postController.post('/:id/comment', async (c) => await PostService.AddComment(c) );