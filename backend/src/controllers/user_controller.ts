import { Hono } from 'hono';
import { UserService } from '../services/user_service';

export const userController = new Hono();

userController.post('/signup', async (c) => await UserService.signUp(c) );
userController.post('/signin', async (c) => await UserService.signIn(c) );