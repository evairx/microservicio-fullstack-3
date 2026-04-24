import { Hono } from 'hono'
import { serveStatic } from 'hono/bun';
import { cors } from 'hono/cors';

import { userController } from './controllers/user_controller';
import { postController } from './controllers/post_controller';
import { profileController } from './controllers/profile_controller';
import { uploadController } from './controllers/upload_controller';

const app = new Hono();

app.use('/*', cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
    allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
}));

app.use('/images/*', serveStatic({ root: './' }));


app.route('/user', userController)
app.route('/posts', postController)
app.route('/profile', profileController)
app.route('/upload', uploadController)

export default app
