(() => {
  const cfg = window.MINHA_FT_CONFIG || {};
  const message = (id, text, type = "") => {
    const el = document.getElementById(id);
    el.textContent = text;
    el.className = "message " + type;
  };
  const $ = (id) => document.getElementById(id);
  const authView = $("auth-view"), profileView = $("profile-view");
  let mode = "login";
  let supabase = null;

  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY ||
      cfg.SUPABASE_URL.includes("SEU-PROJETO") ||
      cfg.SUPABASE_ANON_KEY.includes("SUA_CHAVE")) {
    message("auth-message", "Configure o arquivo config.js com a URL e a chave pública do Supabase.", "error");
    $("submit-btn").disabled = true;
  } else {
    supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    restoreSession();
  }

  document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => {
    mode = btn.dataset.mode;
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b === btn));
    $("form-title").textContent = mode === "login" ? "Entrar na sua conta" : "Criar sua conta";
    $("submit-btn").textContent = mode === "login" ? "Entrar" : "Criar conta";
    $("name-label").classList.toggle("hidden", mode !== "signup");
    $("full-name").classList.toggle("hidden", mode !== "signup");
    $("full-name").required = mode === "signup";
    $("role-wrap").classList.toggle("hidden", mode !== "signup");
    $("password").autocomplete = mode === "login" ? "current-password" : "new-password";
    message("auth-message", "");
  }));

  $("auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!supabase) return;
    const email = $("email").value.trim();
    const password = $("password").value;
    $("submit-btn").disabled = true;
    message("auth-message", mode === "login" ? "Entrando..." : "Criando conta...");
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await loadProfile();
      } else {
        const fullName = $("full-name").value.trim();
        const requestedRole = $("signup-role").value;
        // O cadastro público nunca concede privilégio de administrador.
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName, requested_role: requestedRole } }
        });
        if (error) throw error;
        if (requestedRole === "admin") {
          message("auth-message", "Solicitação enviada. A conta não terá privilégios administrativos até ser autorizada pelo responsável no banco de dados.", "success");
        } else if (!data.session) {
          message("auth-message", "Cadastro criado. Confira seu e-mail para confirmar a conta e depois entre.", "success");
        } else {
          message("auth-message", "Conta criada com sucesso.", "success");
          await loadProfile();
        }
      }
    } catch (err) {
      message("auth-message", humanError(err), "error");
    } finally {
      $("submit-btn").disabled = false;
    }
  });

  $("forgot-btn").addEventListener("click", async () => {
    if (!supabase) return;
    const email = $("email").value.trim();
    if (!email) return message("auth-message", "Digite seu e-mail para receber o link de redefinição.", "error");
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    message("auth-message", error ? humanError(error) : "Se o e-mail estiver cadastrado, você receberá as instruções para redefinir a senha.", error ? "error" : "success");
  });

  $("password-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const p1 = $("new-password").value, p2 = $("confirm-password").value;
    if (p1.length < 8) return message("password-message", "A senha precisa ter pelo menos 8 caracteres.", "error");
    if (p1 !== p2) return message("password-message", "As senhas não coincidem.", "error");
    const { error } = await supabase.auth.updateUser({ password: p1 });
    if (error) return message("password-message", humanError(error), "error");
    $("password-form").reset();
    message("password-message", "Senha atualizada com sucesso.", "success");
  });

  $("logout-btn").addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();
    if (error) message("password-message", humanError(error), "error");
    else showAuth();
  });

  async function restoreSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await loadProfile();
    supabase.auth.onAuthStateChange((_event, sessionNow) => {
      if (!sessionNow) showAuth();
    });
  }

  async function loadProfile() {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return showAuth();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, approval_status")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      await supabase.auth.signOut();
      showAuth();
      return message("auth-message", "Não foi possível carregar seu perfil. Verifique se o SQL de configuração foi executado.", "error");
    }
    if (profile.role === "admin" && profile.approval_status !== "approved") {
      await supabase.auth.signOut();
      showAuth();
      return message("auth-message", "Acesso de administrador ainda não autorizado. Procure o responsável pelo sistema.", "error");
    }
    if (profile.approval_status !== "approved") {
      await supabase.auth.signOut();
      showAuth();
      return message("auth-message", "Seu cadastro está aguardando aprovação do administrador.", "error");
    }

    authView.classList.add("hidden");
    profileView.classList.remove("hidden");
    const isAdmin = profile.role === "admin";
    $("profile-title").textContent = profile.full_name || "Bem-vindo(a)";
    $("profile-email").textContent = user.email || "";
    $("avatar").textContent = (profile.full_name || user.email || "U").trim().charAt(0).toUpperCase();
    $("role-label").textContent = isAdmin ? "PERFIL DO ADMINISTRADOR" : "PERFIL DO USUÁRIO";
    $("profile-role").textContent = isAdmin ? "Administrador" : "Usuário";
    $("profile-status").textContent = "Aprovado";
    $("profile-description").textContent = isAdmin
      ? "Você tem acesso ao perfil administrativo do Minha FT."
      : "Você tem acesso ao seu perfil de usuário do Minha FT.";
    message("auth-message", "");
  }

  function showAuth() {
    profileView.classList.add("hidden");
    authView.classList.remove("hidden");
  }

  function humanError(err) {
    const msg = (err && err.message) || "Ocorreu um erro inesperado.";
    if (/Invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
    if (/Email not confirmed/i.test(msg)) return "Confirme seu e-mail antes de entrar.";
    if (/User already registered/i.test(msg)) return "Este e-mail já possui cadastro.";
    if (/Password should be/i.test(msg)) return "A senha não atende aos requisitos mínimos.";
    return msg;
  }
})();
