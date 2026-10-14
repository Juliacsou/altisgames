const grid = document.getElementById('game-grid');
const count = document.getElementById('game-count');
const message = document.getElementById('catalog-message');
const toast = document.getElementById('toast');
let toastTimer;
const filters = document.getElementById('category-filters');
let allGames = [];
let selectedCategory = null;
const normalizeCategory = value => String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
function gameCategories(game){
  return Array.isArray(game.categories) ? game.categories.filter(c => typeof c === 'string' && c.trim()).map(c => c.trim()) : [];
}
function updateCatalog(){
  const visible = selectedCategory === null ? allGames : allGames.filter(game => gameCategories(game).some(c => normalizeCategory(c) === selectedCategory));
  renderGames(visible);
  if(!visible.length && allGames.length) message.textContent = 'Nenhum jogo encontrado nesta categoria.';
  for(const button of filters.querySelectorAll('button')){
    const active = button.dataset.category === (selectedCategory ?? '');
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
}
function setupFilters(games){
  allGames = games;
  const names = new Map();
  for(const game of games) for(const category of gameCategories(game)){
    const key = normalizeCategory(category);
    if(key && !names.has(key)) names.set(key, category);
  }
  filters.replaceChildren();
  filters.hidden = names.size === 0;
  if(selectedCategory !== null && !names.has(selectedCategory)) selectedCategory = null;
  const options = [['', 'Todos'], ...[...names].sort((a,b) => a[1].localeCompare(b[1], 'pt-BR'))];
  for(const [key,label] of options){
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'category-filter';
    button.textContent = label;
    button.dataset.category = key;
    button.addEventListener('click', () => {selectedCategory = key || null; updateCatalog();});
    filters.append(button);
  }
  updateCatalog();
}

function notifyUnavailable(){
  toast.textContent = 'O link deste jogo ainda não foi configurado.';
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}
function safeImagePath(path){
  if(typeof path !== 'string') return null;
  const value = path.trim();
  // Imagens locais em assets/ (não aceita caminhos ascendentes, scripts ou URLs externas).
  if(/^assets\/[a-zA-Z0-9_./-]+\.(png|jpg|jpeg|webp|gif|avif)$/i.test(value) && !value.includes('..')) return value;
  try {const u=new URL(value);const base=new URL(window.ALTIS_SUPABASE.url);if(u.protocol==='https:' && !u.pathname.includes('..') && ((u.origin===base.origin && u.pathname.startsWith('/storage/v1/object/public/game-images/')) || (u.origin==='https://audio.altigames.com.br' && /^\/portfolio\/games\/[a-zA-Z0-9_.-]+\.(png|jpg|jpeg|webp|gif|avif)$/i.test(u.pathname))))return u.href;}catch{}
  return null;
}
function safeGameUrl(url){
  if(typeof url !== 'string' || !url.trim()) return null;
  try {
    const parsed = new URL(url.trim(), window.location.href);
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : null;
  } catch { return null; }
}
function renderGames(games){
  grid.replaceChildren();
  for(const game of games){
    const imagePath = safeImagePath(game.image_path);
    if(!imagePath) continue;
    const link = document.createElement('a');
    link.className = 'game-card';
    link.setAttribute('aria-label', `Jogar ${game.name}`);
    const image = document.createElement('img');
    image.src = imagePath;
    image.alt = String(game.name || 'Jogo');
    image.loading = 'lazy';
    image.width = 1600;
    image.height = 900;
    link.append(image);
    const url = safeGameUrl(game.link);
    if(url){
      link.href = url;
      if(new URL(url).origin !== window.location.origin){
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    } else {
      link.href = '#jogos';
      link.addEventListener('click', e => {e.preventDefault(); notifyUnavailable();});
    }
    grid.append(link);
  }
  const total = grid.children.length;
  count.textContent = `${String(total).padStart(2, '0')} ${total === 1 ? 'JOGO' : 'JOGOS'}`;
  message.hidden = total > 0;
  if(!total) message.textContent = 'Nenhum jogo disponível no momento.';
}
async function loadGames(){
  const {url, publishableKey} = window.ALTIS_SUPABASE || {};
  if(!url || !publishableKey) throw new Error('Configuração do Supabase ausente');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${url}/rest/v1/games?select=id,name,link,image_path,categories,sort_order&is_active=eq.true&order=sort_order.asc,created_at.asc`, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}`, Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store'
    });
    if(!response.ok) throw new Error(`Supabase HTTP ${response.status}`);
    const games = await response.json();
    if(!Array.isArray(games)) throw new Error('Resposta inesperada');
    setupFilters(games);
  } finally {clearTimeout(timeout);}
}
document.getElementById('year').textContent = new Date().getFullYear();
loadGames().catch(err => {
  console.error('Falha ao carregar catálogo:', err);
  count.textContent = 'JOGOS';
  message.hidden = false;
  message.textContent = 'Não foi possível carregar os jogos. Atualize a página para tentar novamente.';
});
