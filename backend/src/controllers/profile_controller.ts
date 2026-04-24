import { Hono } from 'hono';
import { ProfileService } from '../services/profile_service';

export const profileController = new Hono();

profileController.get('/:username', async (c) => await ProfileService.GetProfile(c) );
profileController.get('/:username/posts', async (c) => await ProfileService.GetUserPosts(c) );