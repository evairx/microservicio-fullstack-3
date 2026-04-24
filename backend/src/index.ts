import { Hono } from 'hono'
import { userController } from './controllers/user_controller';

const app = new Hono()

app.route('/user', userController)

export default app
