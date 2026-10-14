(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const status = $('status');
  const show = (message, kind = '') => {
    status.textContent = message;
    status.className = `status ${kind}`.trim();
    status.hidden = !message;
  };
  const setStage = (stage) => {
    for (const name of ['request', 'update', 'done']) $(`${name}-section`).hidden = name !== stage;
  };
  const cfg = window.ALTIS_SUPABASE;
  const lib = window.supabase;
  if (!cfg?.url || !cfg?.publishableKey || !lib?.createClient) {
    show('Não foi possível carregar a conexão de autenticação. Atualize a página e tente novamente.', 'error');
    return;
  }
  const client = lib.createClient(cfg.url, cfg.publishableKey, {
    auth: { detectSessionInUrl: true, persistSession: false, autoRefreshToken: false }
  });
  // O callback é acessado somente a partir do link de recuperação enviado por e-mail.
  const params = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.slice(1));
  const callback = hash.get('type') === 'recovery' || params.get('type') === 'recovery' || params.has('code');
  const error = params.get('error_description') || hash.get('error_description');
  if (error) show(decodeURIComponent(error.replace(/\+/g, ' ')), 'error');
  if (callback && !error) show('Validando o link de recuperação…');
  let recoveryReady = false;
  let recoveryProcessed = false;
  const handleRecovery = async (event, session) => {
    if (!callback || recoveryProcessed || !session?.access_token) return;
    if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      recoveryReady = true;
      recoveryProcessed = true;
      history.replaceState({}, '', location.pathname);
      setStage('update');
      show('Link validado. Agora escolha sua nova senha.', 'ok');
    }
  };
  client.auth.onAuthStateChange(handleRecovery);
  if (callback && !error) {
    client.auth.getSession().then(({data,error:sessionError}) => {
      if (sessionError || !data?.session) {
        show('Este link é inválido ou expirou. Solicite um novo link abaixo.', 'error');
        setStage('request');
      }
    }).catch(() => show('Não foi possível validar o link. Solicite outro.', 'error'));
  }
  $('request-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const button = ev.currentTarget.querySelector('button');
    button.disabled = true;
    show('Solicitando e-mail de recuperação…');
    try {
      const redirectTo = `${location.origin}/reset-password.html`;
      const {error:requestError} = await client.auth.resetPasswordForEmail($('email').value.trim(), {redirectTo});
      if (requestError) throw requestError;
      show('Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha. Verifique também a pasta de spam.', 'ok');
    } catch (e) { show(e.message || 'Não foi possível enviar o e-mail.', 'error'); }
    finally { button.disabled = false; }
  });
  $('update-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!recoveryReady) {show('Primeiro valide um link de recuperação enviado por e-mail.', 'error');return;}
    if ($('password').value !== $('confirm-password').value) {show('As senhas não coincidem.', 'error');return;}
    const button = ev.currentTarget.querySelector('button');
    button.disabled = true;
    show('Atualizando senha…');
    try {
      const {error:updateError} = await client.auth.updateUser({password:$('password').value});
      if (updateError) throw updateError;
      await client.auth.signOut();
      $('password').value = '';
      $('confirm-password').value = '';
      recoveryReady = false;
      setStage('done');
      show('Senha alterada com sucesso.', 'ok');
    } catch (e) {show(e.message || 'Não foi possível atualizar sua senha.', 'error');}
    finally {button.disabled = false;}
  });
})();
