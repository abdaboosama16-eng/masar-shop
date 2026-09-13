import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const geminiApiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'gemini-api-endpoint',
        configureServer(server) {
          server.middlewares.use('/api/gemini-extract', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const rawText = parsed.rawText || '';
                const prompt = parsed.prompt || '';
                const apiKey = geminiApiKey || process.env.GEMINI_API_KEY || '';

                if (!apiKey) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'مفتاح GEMINI_API_KEY غير موجود في متغيرات البيئة.' }));
                  return;
                }

                const fullUserContent = prompt ? `${prompt}\n\nالنص المستخرج من ملف Word:\n"""\n${rawText}\n"""` : rawText;

                // Try gemini-2.5-flash then fallback to gemini-1.5-flash
                let geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: fullUserContent }] }],
                    generationConfig: {
                      responseMimeType: 'application/json',
                      temperature: 0.1,
                    },
                  }),
                });

                if (!geminiRes.ok) {
                  geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contents: [{ parts: [{ text: fullUserContent }] }],
                      generationConfig: {
                        responseMimeType: 'application/json',
                        temperature: 0.1,
                      },
                    }),
                  });
                }

                const data = await geminiRes.json();
                res.statusCode = geminiRes.ok ? 200 : 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Error processing request' }));
              }
            });
          });
        },
      },
    ],
    define: {
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiApiKey),
      'import.meta.env.NEXT_PUBLIC_GEMINI_API_KEY': JSON.stringify(geminiApiKey),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiApiKey),
      'process.env.NEXT_PUBLIC_GEMINI_API_KEY': JSON.stringify(geminiApiKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 3000,
      rollupOptions: {
        // لا نضع أي ملفات داخلية أو server.ts في external
        // لضمان بناء سليم ومباشر دون تعارض مع بيئة Netlify
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
