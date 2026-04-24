import { Hono } from 'hono'
import { userController } from './controllers/user_controller';
import { postController } from './controllers/post_controller';

const app = new Hono()

app.route('/user', userController)
app.route('/posts', postController)

export default app
