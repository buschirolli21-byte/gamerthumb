// server.js — GamerThumb backend completo
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const { supabase } = require('./src/lib/supabase');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── MIDDLEWARE: verifica token Supabase ────────────
async function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Token inválido' });
  req.user = user;
  next();
}

// ══════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════

// Registro
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios' });

  const { data, error } = await supabase.auth.admin.createUser({
    email, password,
    user_metadata: { name: name || email.split('@')[0] },
    email_confirm: true
  });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Conta criada! Faça login.', user: data.user });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: 'Email ou senha incorretos' });
  res.json({ token: data.session.access_token, user: data.user });
});

// Logout
app.post('/api/auth/logout', auth, async (req, res) => {
  await supabase.auth.signOut();
  res.json({ message: 'Logout realizado' });
});

// ══════════════════════════════════════════
//  PROFILE ROUTES
// ══════════════════════════════════════════

// Buscar perfil
app.get('/api/profile', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();
  if (error) return res.status(404).json({ error: 'Perfil não encontrado' });
  res.json(data);
});

// Atualizar perfil
app.put('/api/profile', auth, async (req, res) => {
  const { name, username, channel_color, channel_font } = req.body;
  const { data, error } = await supabase
    .from('profiles')
    .update({ name, username, channel_color, channel_font })
    .eq('id', req.user.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// ══════════════════════════════════════════
//  THUMBNAILS ROUTES
// ══════════════════════════════════════════

// Listar thumbnails do usuário
app.get('/api/thumbnails', auth, async (req, res) => {
  const { game, limit = 20, offset = 0 } = req.query;
  let query = supabase
    .from('thumbnails')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (game && game !== 'all') query = query.eq('game', game);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ thumbnails: data, total: count });
});

// Buscar thumbnail específica
app.get('/api/thumbnails/:id', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('thumbnails')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();
  if (error) return res.status(404).json({ error: 'Não encontrada' });
  res.json(data);
});

// Criar thumbnail
app.post('/api/thumbnails', auth, async (req, res) => {
  // Verifica limite do plano
  const { data: profile } = await supabase
    .from('profiles').select('plan,thumbs_used,thumbs_limit').eq('id', req.user.id).single();

  if (profile && profile.thumbs_used >= profile.thumbs_limit) {
    return res.status(403).json({
      error: `Limite do plano ${profile.plan} atingido (${profile.thumbs_limit} thumbnails/mês). Faça upgrade!`,
      upgrade: true
    });
  }

  const { title, game, template, canvas_data, image_url } = req.body;
  const { data, error } = await supabase
    .from('thumbnails')
    .insert({ user_id: req.user.id, title, game, template, canvas_data, image_url })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });

  // Incrementa contador de uso
  await supabase.from('profiles')
    .update({ thumbs_used: (profile?.thumbs_used || 0) + 1 })
    .eq('id', req.user.id);

  res.status(201).json(data);
});

// Atualizar thumbnail
app.put('/api/thumbnails/:id', auth, async (req, res) => {
  const { title, canvas_data, image_url, views, ctr, clicks } = req.body;
  const { data, error } = await supabase
    .from('thumbnails')
    .update({ title, canvas_data, image_url, views, ctr, clicks })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Deletar thumbnail
app.delete('/api/thumbnails/:id', auth, async (req, res) => {
  const { error } = await supabase
    .from('thumbnails')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Thumbnail deletada' });
});

// Upload de imagem para Supabase Storage
app.post('/api/thumbnails/upload', auth, async (req, res) => {
  const { imageBase64, filename } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'Imagem obrigatória' });

  const buffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const filePath = `${req.user.id}/${Date.now()}-${filename || 'thumb.png'}`;

  const { data, error } = await supabase.storage
    .from('thumbnails')
    .upload(filePath, buffer, { contentType: 'image/png', upsert: true });

  if (error) return res.status(500).json({ error: error.message });

  const { data: { publicUrl } } = supabase.storage.from('thumbnails').getPublicUrl(filePath);
  res.json({ url: publicUrl, path: filePath });
});

// ══════════════════════════════════════════
//  ANALYTICS ROUTES
// ══════════════════════════════════════════

// Stats do dashboard
app.get('/api/analytics/summary', auth, async (req, res) => {
  const { data: thumbs, error } = await supabase
    .from('thumbnails')
    .select('views,ctr,clicks,game,created_at')
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });

  const totalViews  = thumbs.reduce((s, t) => s + (t.views  || 0), 0);
  const totalClicks = thumbs.reduce((s, t) => s + (t.clicks || 0), 0);
  const avgCtr      = thumbs.length ? thumbs.reduce((s, t) => s + (t.ctr || 0), 0) / thumbs.length : 0;
  const bestCtr     = thumbs.length ? Math.max(...thumbs.map(t => t.ctr || 0)) : 0;

  // Agrupar por jogo
  const byGame = {};
  thumbs.forEach(t => {
    if (!t.game) return;
    if (!byGame[t.game]) byGame[t.game] = { count: 0, views: 0, totalCtr: 0 };
    byGame[t.game].count++;
    byGame[t.game].views += t.views || 0;
    byGame[t.game].totalCtr += t.ctr || 0;
  });

  res.json({
    totalThumbs: thumbs.length,
    totalViews, totalClicks,
    avgCtr: +avgCtr.toFixed(2),
    bestCtr,
    byGame
  });
});

// ══════════════════════════════════════════
//  IA ROUTE (sugestão de texto)
// ══════════════════════════════════════════

app.post('/api/ai/suggest', auth, async (req, res) => {
  const { title, game } = req.body;
  if (!title) return res.status(400).json({ error: 'Título obrigatório' });

  // Verifica se tem chave OpenAI
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-sua')) {
    // Fallback com sugestões predefinidas
    const suggestions = getFallbackSuggestions(game, title);
    return res.json({ suggestions, source: 'fallback' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: 'Você é especialista em thumbnails virais de YouTube para games. Retorne apenas JSON.'
        },{
          role: 'user',
          content: `Gere 3 sugestões de texto chamativo para thumbnail de YouTube sobre: "${title}" (jogo: ${game || 'desconhecido'}). 
          Formato JSON: {"suggestions": [{"title": "TÍTULO EM CAPS", "subtitle": "subtítulo complementar"}]}`
        }],
        max_tokens: 300
      })
    });
    const aiData = await response.json();
    const content = aiData.choices[0].message.content;
    const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
    res.json({ ...parsed, source: 'openai' });
  } catch (e) {
    const suggestions = getFallbackSuggestions(game, title);
    res.json({ suggestions, source: 'fallback' });
  }
});

function getFallbackSuggestions(game, title) {
  const base = [
    { title: 'VOCÊ NÃO VAI\nACREDITAR', subtitle: 'isso acontece no jogo' },
    { title: 'SEGREDO\nDESCOBERTO', subtitle: 'que os devs esconderam' },
    { title: 'IMPOSSÍVEL\nDE FAZER', subtitle: 'mas eu consegui' },
  ];
  const gameMap = {
    re:  [{ title: 'AS MELHORES\nSAVE ROOMS', subtitle: 'Resident Evil ranked' }],
    dmc: [{ title: 'COMBO\nIMPOSSÍVEL', subtitle: 'S rank garantido' }],
    dbz: [{ title: 'PERSONAGEM\nINVENCÍVEL', subtitle: 'ninguém consegue vencer' }],
    gta: [{ title: 'R$1 MILHÃO\nEM 20 MIN', subtitle: 'glitch que ainda funciona' }],
  };
  return [...(gameMap[game] || []), ...base].slice(0, 3);
}

// ══════════════════════════════════════════
//  STRIPE / PLANOS
// ══════════════════════════════════════════

app.post('/api/billing/checkout', auth, async (req, res) => {
  const { plan } = req.body;
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('sua')) {
    return res.json({
      message: 'Configure STRIPE_SECRET_KEY no .env para ativar pagamentos.',
      demo: true
    });
  }
  // Stripe checkout aqui quando configurado
  res.json({ url: '#', message: 'Redirecionando para o Stripe...' });
});

// ══════════════════════════════════════════
//  SERVE PAGES
// ══════════════════════════════════════════

// Todas as rotas não-API servem o app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── START ────────────────────────────────
app.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════╗');
  console.log('║  🎮 GamerThumb rodando!            ║');
  console.log(`║  → http://localhost:${PORT}           ║`);
  console.log('╠═══════════════════════════════════╣');
  console.log('║  Supabase:', process.env.SUPABASE_URL ? '✅ Configurado' : '⚠️  Configure o .env');
  console.log('║  OpenAI:  ', process.env.OPENAI_API_KEY?.startsWith('sk-sua') ? '⚠️  Configure o .env' : '✅ Configurado');
  console.log('║  Stripe:  ', process.env.STRIPE_SECRET_KEY?.includes('sua') ? '⚠️  Configure o .env' : '✅ Configurado');
  console.log('╚═══════════════════════════════════╝\n');
});
