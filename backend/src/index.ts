import app from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`SupportAI v2 backend listening on port ${PORT}`);
});
