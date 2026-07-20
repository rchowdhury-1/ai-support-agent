/**
 * Vercel entrypoint (native Express support). The bare express import lets
 * Vercel's detector recognise this as the Express server; the app itself is
 * prebuilt into dist/ by `node build.mjs`.
 */
import 'express';
import app from './dist/app.js';

export default app;
