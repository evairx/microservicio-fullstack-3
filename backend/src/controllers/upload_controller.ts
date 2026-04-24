import { Hono } from 'hono';
import { UploadService } from '../services/upload_service';

export const uploadController = new Hono();

uploadController.post('/', async (c) => await UploadService.UploadFile(c) );