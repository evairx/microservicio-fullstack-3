import { Hono } from 'hono';
import { UserService } from '../services/user_service';

export const userController = new Hono();

userController.post('/add', async (c) => await UserService.addUser(c) );