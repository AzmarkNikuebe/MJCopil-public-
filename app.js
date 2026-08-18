// Error catching diagnostic setup
window.onerror = function(message, source, lineno, colno, error) {
  if (typeof showNotification === 'function') {
    showNotification(`Erreur JS: ${message} (${source ? source.split('/').pop() : 'inconnu'}:${lineno})`, "error");
  } else {
    console.error(message, source, lineno, colno, error);
  }
  return false;
};
window.onunhandledrejection = function(event) {
  if (typeof showNotification === 'function') {
    showNotification(`Rejection JS: ${event.reason}`, "error");
  } else {
    console.error(event.reason);
  }
};

// Instance de l'application
const AppState = {
  db: null, // Données de la campagne active
  activeSessionId: localStorage.getItem("mj_copilot_active_session_id") || null,
  playerState: {
    campaignTitle: 'MJ Copilot V2',
    sessionTitle: 'Aucune séance active',
    activeMap: '',
    activeMapMarkers: [],
    activeEntity: null,
    ambianceImage: 'https://picsum.photos/id/1015/1200/800',
    notes: 'Prêt pour l\'aventure.'
  },
  playerWindow: null,
  activeEntityDetails: null,
  aiConfig: JSON.parse(localStorage.getItem("mj_copilot_ai_config") || JSON.stringify({
    engine: 'simulation',
    geminiKey: '',
    geminiModel: 'gemini-3.5-flash',
    openaiKey: '',
    openaiModel: 'gpt-4o-mini',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3',
    contextOptimization: 'optimized'
  })),
  aiChatHistory: [],
  sessionLogs: JSON.parse(localStorage.getItem("mj_copilot_session_logs") || "[]"),
  proposedConsequences: []
};
window.AppState = AppState;

// Initialisation globale
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("view") === "player") {
    // Mode Écran Joueur autonome
    document.body.innerHTML = getPlayerLayoutHTML();
    startPlayerSyncListener();
    checkPlayerMode();

    // Signaler au MJ que l'écran joueur est prêt (utile pour restaurer le lien si le MJ a rafraîchi sa page)
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'PLAYER_WINDOW_READY' }, '*');
    }
    
    // Heartbeat toutes les 2 secondes pour maintenir/restaurer le lien
    setInterval(() => {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'PLAYER_WINDOW_READY' }, '*');
      }
    }, 2000);
    return;
  }

  // Mode MJ Standard
  window.CampaignEngine.initDatabase();
  window.SettingsEngine.initTheme();
  window.ContextMapEngine.init();
  setupEventListeners();

  // Écouter le signalement de l'écran joueur pour synchroniser
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'PLAYER_WINDOW_READY') {
      AppState.playerWindow = e.source;
      syncPlayerView();
    }
  });
  
  // Rendu de démarrage
  updateDashboardUI();
  window.WorldEngine.renderEncyclopedia();
  window.CharacterEngine.renderPlayers();
  window.SessionEngine.updateSessionsUI();
  window.ContextMapEngine.renderMap();
  
  // Rendre la barre des Skills IA
  if (window.SkillsEngine && typeof window.SkillsEngine.renderSkillSelector === 'function') {
    window.SkillsEngine.renderSkillSelector();
  }

  // Configurer les champs de la modale IA
  initAIConfigModalFields();

  // Synchroniser l'état initial avec l'écran joueur / stockage
  window.syncPlayerView();
});

// Mettre à jour l'en-tête général du MJ
function updateDashboardUI() {
  const db = AppState.db;
  if (!db) return;

  const headerTitle = document.getElementById('header-campaign-title');
  const headerStyle = document.getElementById('header-visual-style');
  
  if (headerTitle) headerTitle.textContent = db.campagne.titre || 'Nouvelle Campagne';
  if (headerStyle) {
    const styleLabel = db.campagne.style_visuel ? db.campagne.style_visuel.replace('_', ' ') : 'fantasy';
    headerStyle.textContent = `Style : ${styleLabel.toUpperCase()}`;
  }
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
  // Changement de campagne / Import
  const fileUploadInput = document.getElementById('import-file-uploader');
  if (fileUploadInput) {
    fileUploadInput.addEventListener('change', () => {
      // Bouton confirm cliqué géré par handleCampJsonImport
    });
  }

  // Double écran - Ouvrir la fenêtre
  const openPlayerBtn = document.getElementById('btn-open-player');
  if (openPlayerBtn) {
    openPlayerBtn.addEventListener('click', () => {
      AppState.playerWindow = window.open(window.location.pathname + '?view=player', 'PlayerWindow', 'width=1000,height=700');
      setTimeout(() => syncPlayerView(), 1000);
    });
  }

  // Soumission Création Séance
  const createForm = document.getElementById('form-create-session');
  if (createForm) {
    createForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('new-session-title').value.trim();
      const date = document.getElementById('new-session-date').value;
      const lieu = document.getElementById('new-session-lieu').value.trim();
      const chapId = document.getElementById('new-session-chapter').value;
      
      window.SessionEngine.createNewSession(title, date, lieu, chapId);
      document.getElementById('create-session-modal').classList.remove('active');
    });
  }

  // Modale Clôture listeners
  const aiSummaryBtn = document.getElementById('btn-ai-generate-summary');
  if (aiSummaryBtn) {
    aiSummaryBtn.addEventListener('click', () => {
      window.SessionEngine.generateAISessionSummary();
    });
  }
}

// Gestion des importations de campagne JSON
window.handleCampJsonImport = function() {
  const fileInput = document.getElementById('import-file-uploader');
  if (fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
      try {
        const success = window.CampaignEngine.importCampaignJSON(e.target.result);
        if (success) {
          showNotification("Campagne importée avec succès !", "success");
          document.getElementById('import-codex-modal').classList.remove('active');
          updateDashboardUI();
          window.WorldEngine.renderEncyclopedia();
          window.CharacterEngine.renderPlayers();
          window.SessionEngine.updateSessionsUI();
          window.ContextMapEngine.init();
          window.ContextMapEngine.renderMap();
          window.syncPlayerView();
        }
      } catch (err) {
        showNotification("Erreur d'import : " + err.message, "error");
      }
    };
    reader.readAsText(file);
  } else {
    showNotification("Veuillez sélectionner un fichier JSON.", "error");
  }
};

// Clôture définitive de séance
window.handleConfirmCloseSession = function() {
  const summary = document.getElementById('close-session-summary').value.trim();
  const duree = document.getElementById('close-session-duree').value.trim();
  if (!summary) {
    showNotification("Veuillez saisir ou générer un résumé.", "error");
    return;
  }
  window.SessionEngine.closeActiveSession(summary, duree);
  document.getElementById('close-session-modal').classList.remove('active');
};

// Initialisation des champs de configuration IA dans la modale
function initAIConfigModalFields() {
  const engineSelect = document.getElementById('config-ai-engine');
  if (engineSelect) {
    engineSelect.value = AppState.aiConfig.engine;
    window.handleConfigEngineChange(AppState.aiConfig.engine);
  }

  const keyGemini = document.getElementById('config-key-gemini');
  if (keyGemini) keyGemini.value = AppState.aiConfig.geminiKey || '';

  const modelGemini = document.getElementById('config-model-gemini');
  if (modelGemini) modelGemini.value = AppState.aiConfig.geminiModel || 'gemini-2.5-flash';

  const keyOpenAI = document.getElementById('config-key-openai');
  if (keyOpenAI) keyOpenAI.value = AppState.aiConfig.openaiKey || '';

  const modelOpenAI = document.getElementById('config-model-openai');
  if (modelOpenAI) modelOpenAI.value = AppState.aiConfig.openaiModel || 'gpt-4o-mini';

  const urlOllama = document.getElementById('config-url-ollama');
  if (urlOllama) urlOllama.value = AppState.aiConfig.ollamaUrl || 'http://localhost:11434';

  const modelOllama = document.getElementById('config-model-ollama');
  if (modelOllama) modelOllama.value = AppState.aiConfig.ollamaModel || 'llama3.2:1b';

  const optSelect = document.getElementById('config-ai-context-opt');
  if (optSelect) optSelect.value = AppState.aiConfig.contextOptimization || 'optimized';
}

window.refreshOllamaUI = async function(autoStart = false) {
  const badge = document.getElementById('ollama-status-badge');
  const select = document.getElementById('config-model-ollama-select');
  const manualInput = document.getElementById('config-model-ollama');

  if (badge) badge.innerHTML = `<span>⏳ Recherche du serveur Ollama...</span>`;

  try {
    let models = [];
    // 1. Try directly contacting Ollama 11434
    let res = await fetch("http://127.0.0.1:11434/api/tags").catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      models = data.models || [];
    } else {
      // 2. Otherwise ask backend (8001) to start/status
      const endpoint = autoStart ? "http://127.0.0.1:8001/api/ollama/start" : "http://127.0.0.1:8001/api/ollama/status";
      res = await fetch(endpoint, { method: autoStart ? "POST" : "GET" }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        models = data.models || [];
      }
    }

    if (models.length > 0) {
      const count = models.length;
      if (badge) badge.innerHTML = `<span>🟢 Ollama Connecté (${count} modèle${count > 1 ? 's' : ''} détecté${count > 1 ? 's' : ''})</span>`;
      
      if (select) {
        const currentSelected = manualInput?.value || AppState.aiConfig.ollamaModel || 'qwen2.5:1.5b';
        select.innerHTML = models.map(m => {
          const name = m.name || m.model || '';
          const isRec = name.includes('qwen') || name.includes('1b');
          const sizeStr = m.size ? ` (${(m.size / 1e9).toFixed(1)} Go)` : '';
          const selected = (name === currentSelected || (currentSelected === 'qwen2.5:1.5b' && name.includes('qwen'))) ? 'selected' : '';
          return `<option value="${name}" ${selected}>${name}${sizeStr} ${isRec ? '⭐ Recommandé' : ''}</option>`;
        }).join('');

        if (manualInput && select.value) {
          manualInput.value = select.value;
        }
      }
      return;
    }
  } catch (e) {
    console.warn("Erreur refreshOllamaUI:", e);
  }

  if (badge) {
    badge.innerHTML = `<span style="color:#ffd166;">🟠 Ollama en veille (Sera lancé automatiquement)</span>`;
  }
};

window.handleConfigEngineChange = function(engine) {
  document.getElementById('config-field-gemini').style.display = (engine === 'gemini') ? 'flex' : 'none';
  document.getElementById('config-field-openai').style.display = (engine === 'openai') ? 'flex' : 'none';
  document.getElementById('config-field-ollama').style.display = (engine === 'ollama') ? 'flex' : 'none';

  if (engine === 'ollama') {
    window.refreshOllamaUI(true); // Auto-start Ollama when user selects it
  }
};

window.handleSaveAIConfig = function() {
  const selectedModelOllama = document.getElementById('config-model-ollama-select')?.value || document.getElementById('config-model-ollama').value.trim() || 'llama3.2:1b';
  const config = {
    engine: document.getElementById('config-ai-engine').value,
    geminiKey: document.getElementById('config-key-gemini').value.trim(),
    geminiModel: document.getElementById('config-model-gemini').value,
    openaiKey: document.getElementById('config-key-openai').value.trim(),
    openaiModel: document.getElementById('config-model-openai').value,
    ollamaUrl: document.getElementById('config-url-ollama').value.trim() || 'http://localhost:11434',
    ollamaModel: selectedModelOllama,
    contextOptimization: document.getElementById('config-ai-context-opt').value
  };

  window.SettingsEngine.saveAIConfig(config);
  document.getElementById('ai-config-modal').classList.remove('active');
};

// Notification Toast système
function showNotification(message, type = "info") {
  const notification = document.createElement('div');
  notification.className = 'glass-panel';
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.left = '20px';
  notification.style.padding = '10px 20px';
  notification.style.borderRadius = '8px';
  notification.style.zIndex = '2000';
  notification.style.fontSize = '0.85rem';
  notification.style.fontWeight = '600';
  notification.style.borderLeft = '4px solid';
  notification.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
  notification.style.display = 'flex';
  notification.style.alignItems = 'center';
  notification.style.gap = '8px';

  if (type === "success") {
    notification.style.borderLeftColor = "#00f5d4";
    notification.innerHTML = `✔️ ${message}`;
  } else if (type === "error") {
    notification.style.borderLeftColor = "#d90429";
    notification.innerHTML = `❌ ${message}`;
  } else if (type === "warning") {
    notification.style.borderLeftColor = "#ffd166";
    notification.innerHTML = `⚠️ ${message}`;
  } else {
    notification.style.borderLeftColor = "#9d4edd";
    notification.innerHTML = `ℹ️ ${message}`;
  }

  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// --------------------------------------------------------------------------
// Double Écran - Synchronisation Écran Joueur
// --------------------------------------------------------------------------
function syncPlayerView() {
  const db = AppState.db;
  if (!db) return;

  AppState.playerState.campaignTitle = db.campagne.titre;
  if (AppState.activeSessionId) {
    const seance = db.seances.find(s => s.id === AppState.activeSessionId);
    if (seance) AppState.playerState.sessionTitle = seance.titre;
  } else {
    AppState.playerState.sessionTitle = "Aucune séance active";
  }

  // Synchroniser la carte et les marqueurs du lieu visualisé
  if (window.ContextMapEngine && window.ContextMapEngine.activeLieuId) {
    const lieu = db.lieux.find(l => l.id === window.ContextMapEngine.activeLieuId);
    if (lieu) {
      AppState.playerState.activeMap = window.MediaEngine.getEntityImageSrc(lieu, 'lieu');
      AppState.playerState.activeMapMarkers = lieu.mapMarkers || [];
    }
  }

  // Tenter de stocker dans le localStorage avec fallback en cas de quota dépassé
  try {
    localStorage.setItem("mj_copilot_player_sync", JSON.stringify(AppState.playerState));
  } catch (e) {
    console.warn("Quota LocalStorage dépassé pour mj_copilot_player_sync. Stockage d'une version allégée sans images base64.");
    try {
      // Créer une copie allégée sans les grosses images Base64
      const cleanState = JSON.parse(JSON.stringify(AppState.playerState));
      if (cleanState.activeMap && cleanState.activeMap.startsWith("data:")) {
        cleanState.activeMap = ""; // Retirer l'image base64
      }
      if (cleanState.ambianceImage && cleanState.ambianceImage.startsWith("data:")) {
        cleanState.ambianceImage = "";
      }
      if (cleanState.activeEntity && cleanState.activeEntity.avatar && cleanState.activeEntity.avatar.startsWith("data:")) {
        cleanState.activeEntity.avatar = "";
      }
      localStorage.setItem("mj_copilot_player_sync", JSON.stringify(cleanState));
    } catch (err) {
      console.error("Échec critique du stockage de synchronisation allégée", err);
    }
  }

  if (AppState.playerWindow && !AppState.playerWindow.closed) {
    AppState.playerWindow.postMessage({ type: 'SYNC_PLAYER_VIEW', state: AppState.playerState }, '*');
  }
}
window.syncPlayerView = syncPlayerView;

function checkPlayerMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("view") === "player") {
    const saved = localStorage.getItem("mj_copilot_player_sync");
    if (saved) {
      updatePlayerDOM(JSON.parse(saved));
    }
  }
}

function startPlayerSyncListener() {
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SYNC_PLAYER_VIEW') {
      updatePlayerDOM(e.data.state);
    }
  });

  window.addEventListener('storage', (e) => {
    if (e.key === 'mj_copilot_player_sync' && e.newValue) {
      updatePlayerDOM(JSON.parse(e.newValue));
    }
  });
}

function updatePlayerDOM(state) {
  const title = document.getElementById('player-camp-title');
  const sess = document.getElementById('player-session-badge');
  const desc = document.getElementById('player-desc');
  const avatar = document.getElementById('player-avatar');
  const name = document.getElementById('player-entity-name');
  const role = document.getElementById('player-entity-role');
  const layout = document.getElementById('player-bg-layout');
  const notes = document.getElementById('player-notes');

  const mapImg = document.getElementById('player-map');
  const markersContainer = document.getElementById('player-map-markers-container');

  if (title) title.textContent = state.campaignTitle;
  if (sess) sess.textContent = state.sessionTitle;
  
  if (state.activeEntity) {
    if (name) name.textContent = state.activeEntity.name;
    if (role) role.textContent = state.activeEntity.role;
    if (desc) desc.textContent = state.activeEntity.description;
    if (avatar) {
      avatar.style.backgroundImage = `url(${state.activeEntity.avatar})`;
      avatar.style.filter = state.activeEntity.avatar.includes('images/icons/') ? 'invert(1)' : 'none';
    }
  } else {
    if (name) name.textContent = "MJ Copilot V2";
    if (role) role.textContent = "Bienvenue dans l'aventure";
    if (desc) desc.textContent = "Le Maître du Jeu affiche les détails des secrets, cartes et PNJ en temps réel ici.";
    if (avatar) avatar.style.backgroundImage = `url('https://picsum.photos/id/1018/150/150')`;
  }

  if (layout && state.ambianceImage) {
    layout.style.backgroundImage = `url(${state.ambianceImage})`;
  }
  
  if (notes) notes.textContent = state.notes || 'En attente du MJ...';

  // Synchroniser la carte et les marqueurs
  if (mapImg && state.activeMap) {
    mapImg.src = state.activeMap;
  }
  
  if (markersContainer) {
    markersContainer.innerHTML = "";
    if (state.activeMapMarkers && state.activeMapMarkers.length > 0) {
      state.activeMapMarkers.forEach(mark => {
        const markerEl = document.createElement('div');
        markerEl.className = 'map-marker';
        markerEl.style.position = 'absolute';
        markerEl.style.left = `${mark.x}%`;
        markerEl.style.top = `${mark.y}%`;
        markerEl.style.transform = 'translate(-50%, -50%)';
        markerEl.style.zIndex = '10';
        markerEl.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))';
        markerEl.title = mark.label;

        // Vérifier si mark.icon est une URL ou un chemin vers une image
        const isImageUrl = mark.icon && (
          mark.icon.startsWith('http://') ||
          mark.icon.startsWith('https://') ||
          mark.icon.startsWith('data:image/') ||
          mark.icon.includes('/') ||
          mark.icon.includes('.')
        );

        if (isImageUrl) {
          markerEl.style.width = '42px';
          markerEl.style.height = '42px';
          markerEl.style.borderRadius = '50%';
          markerEl.style.backgroundImage = `url('${mark.icon}')`;
          markerEl.style.backgroundSize = 'cover';
          markerEl.style.backgroundPosition = 'center';
          markerEl.style.border = '2.5px solid var(--color-primary)';
          markerEl.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.7)';
          markerEl.textContent = ''; // Vider le texte
          
          // Appliquer un filtre blanc si c'est une icône SVG de game-icons
          if (mark.icon.includes('images/icons/')) {
            markerEl.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.8)) invert(1)';
          }
        } else {
          markerEl.style.fontSize = '1.8rem';
          markerEl.textContent = mark.icon;
        }

        markersContainer.appendChild(markerEl);
      });
    }
  }

  // Handle Combat UI sync
  const normalSidebar = document.getElementById('player-normal-sidebar');
  const combatSidebar = document.getElementById('player-combat-sidebar');
  const combatList = document.getElementById('player-combat-list');

  if (normalSidebar && combatSidebar) {
    if (state.combatActive && state.combatants && state.combatants.length > 0) {
      normalSidebar.style.display = 'none';
      combatSidebar.style.display = 'flex';
      
      if (combatList) {
        combatList.innerHTML = '';
        state.combatants.forEach(c => {
          const item = document.createElement('div');
          
          const activeStyle = c.isActiveTurn 
            ? 'border: 1.5px solid #00f5d4; background: rgba(0, 245, 212, 0.12); box-shadow: 0 0 8px rgba(0, 245, 212, 0.35);' 
            : 'border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02);';
          
          item.style.cssText = `display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 6px; ${activeStyle}`;
          
          // Color based on health status
          let healthColor = '#06d6a0';
          if (c.healthStatus === 'Vaincu' || c.healthStatus.includes('0/')) {
            healthColor = '#ef233c';
          } else if (c.healthStatus === 'Blessé') {
            healthColor = '#ffd166';
          }

          const conditionsHtml = (c.conditions || []).map(cond => `
            <span style="font-size: 0.55rem; font-weight: bold; background: rgba(239,35,60,0.15); color: #ff85a1; border: 1px solid rgba(239,35,60,0.3); padding: 1px 4px; border-radius: 3px;">
              ${cond}
            </span>
          `).join('');

          item.innerHTML = `
            <div style="width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid ${c.isPlayer ? '#9d4edd' : '#ef233c'}; background-image: url('${c.avatar}'); background-size: cover; background-position: center; flex-shrink:0; filter: ${c.avatar.includes('images/icons/') ? 'invert(1)' : 'none'};"></div>
            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column;">
              <span style="font-size: 0.8rem; font-weight: 700; color: #fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:left;">${c.name}</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 0.65rem; color: ${c.isPlayer ? '#c77dff' : '#ff85a1'}; text-align:left;">${c.isPlayer ? 'PJ' : 'Monstre'}</span>
                <div style="display: flex; gap: 3px; flex-wrap: wrap;">${conditionsHtml}</div>
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <span style="font-size: 0.72rem; font-weight: bold; color: ${healthColor}; border: 1px solid ${healthColor}40; background: ${healthColor}15; padding: 2px 6px; border-radius: 4px;">
                ${c.healthStatus}
              </span>
            </div>
          `;
          combatList.appendChild(item);
        });
      }
    } else {
      normalSidebar.style.display = 'flex';
      combatSidebar.style.display = 'none';
    }
  }
}

function getPlayerLayoutHTML() {
  return `
    <div id="player-bg-layout" class="player-layout" style="background-image: url('https://picsum.photos/id/1015/1200/800'); background-size: cover; background-position: center; width: 100vw; height: 100vh; position: relative;">
      <div style="background: rgba(0,0,0,0.65); width: 100%; height: 100%; display: grid; grid-template-rows: 70px 1fr 60px; grid-template-columns: 1fr 340px; grid-template-areas: 'header header' 'main sidebar' 'footer footer'; font-family: var(--font-main); color: #f1f5f9; box-sizing: border-box;">
        
        <header style="grid-area: header; display: flex; justify-content: space-between; align-items: center; padding: 0 30px; border-bottom: 1px solid rgba(255,255,255,0.08);">
          <div id="player-camp-title" style="font-size: 1.4rem; font-weight: 700; font-family: var(--font-title);">MJ Copilot V2</div>
          <div id="player-session-badge" style="font-size: 0.8rem; background: rgba(157,78,221,0.2); border: 1px solid #9d4edd; padding: 4px 10px; border-radius: 20px;">Séance Active</div>
        </header>
        
        <main style="grid-area: main; display: flex; align-items: center; justify-content: center; padding: 20px;">
          <div style="position: relative; display: inline-flex; max-width: 100%; max-height: 80vh; border-radius: 12px; overflow: hidden; border: 2px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
            <img id="player-map" src="https://picsum.photos/id/1015/800/450" style="max-width: 100%; max-height: 80vh; width: auto; height: auto; display: block;" />
            <div id="player-map-markers-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;">
              <!-- Sync markers dynamically -->
            </div>
          </div>
        </main>
        
        <aside style="grid-area: sidebar; border-left: 1px solid rgba(255,255,255,0.08); padding: 25px; display: flex; flex-direction: column; gap: 20px; background: rgba(0,0,0,0.4); backdrop-filter: blur(10px); overflow-y: auto;">
          <!-- Normal Exploration Sidebar -->
          <div id="player-normal-sidebar" style="display: flex; flex-direction: column; gap: 15px; align-items: center; text-align: center;">
            <div id="player-avatar" style="width: 120px; height: 120px; border-radius: 50%; border: 3px solid #9d4edd; background-image: url('https://picsum.photos/id/1018/150/150'); background-size: cover; background-position: center;"></div>
            <div>
              <h2 id="player-entity-name" style="font-family: var(--font-title); font-size: 1.25rem; font-weight: 700; color: #fff; margin: 0;">MJ Copilot V2</h2>
              <div id="player-entity-role" style="font-size: 0.8rem; color: #00f5d4; margin-top: 4px;">Assistant</div>
            </div>
            <p id="player-desc" style="font-size: 0.85rem; color: #94a3b8; line-height: 1.5; margin: 0; text-align: left;">
              Le Maître du Jeu affiche les détails des secrets, cartes et PNJ en temps réel ici.
            </p>
          </div>
          <!-- Combat Tracker Sidebar -->
          <div id="player-combat-sidebar" style="display: none; flex-direction: column; gap: 15px;">
            <h3 style="font-family: var(--font-title); font-size: 1.1rem; color: #00f5d4; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin: 0; display:flex; justify-content:space-between; align-items:center;">
              <span>⚔️ Initiative</span>
            </h3>
            <div id="player-combat-list" style="display: flex; flex-direction: column; gap: 8px;">
              <!-- Dynamic list of initiative -->
            </div>
          </div>
        </aside>
        
        <footer style="grid-area: footer; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; padding: 0 30px; background: rgba(0,0,0,0.5);">
          <div id="player-notes" style="font-size: 0.85rem; font-style: italic; color: #e2e8f0;">En attente du MJ...</div>
          <div style="font-size: 0.75rem; color: rgba(255,255,255,0.3);">MJ Copilot V2 Screen</div>
        </footer>
        
      </div>
    </div>
  `;
}

// Gestion du changement d'onglet de la colonne centrale
window.switchCenterTab = function(tabName) {
  const tabs = {
    'game': { content: document.getElementById('center-tab-game-content'), btn: document.getElementById('btn-center-tab-game'), display: 'flex' },
    'map': { content: document.getElementById('center-tab-map-content'), btn: document.getElementById('btn-center-tab-map'), display: 'flex' },
    'combat': { content: document.getElementById('center-tab-combat-content'), btn: document.getElementById('btn-center-tab-combat'), display: 'flex' },
    'lore': { content: document.getElementById('center-tab-lore-content'), btn: document.getElementById('btn-center-tab-lore'), display: 'flex' },
    'encyclo': { content: document.getElementById('center-tab-encyclo-content'), btn: document.getElementById('btn-center-tab-encyclo'), display: 'flex' }
  };

  for (const [key, tab] of Object.entries(tabs)) {
    if (tab.content) {
      if (key === tabName) {
        tab.content.style.display = tab.display;
      } else {
        tab.content.style.display = 'none';
      }
    }
    if (tab.btn) {
      if (key === tabName) {
        tab.btn.classList.add('active');
      } else {
        tab.btn.classList.remove('active');
      }
    }
  }

  if (tabName === 'map' && window.ContextMapEngine) {
    window.ContextMapEngine.renderMap();
  } else if (tabName === 'combat' && window.CombatEngine) {
    window.CombatEngine.renderCombatTab();
  } else if (tabName === 'lore') {
    // Populate lore if not done
    const descEl = document.getElementById('lore-campaign-desc');
    if (descEl && window.AppState && window.AppState.db && window.AppState.db.campagne) {
      descEl.textContent = window.AppState.db.campagne.description || 'Aucune description disponible.';
      const arcsList = document.getElementById('lore-arcs-list');
      if (arcsList && window.AppState.db.chapitres) {
        arcsList.innerHTML = window.AppState.db.chapitres.map(arc => `
          <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:6px;">
            <strong style="color:var(--color-secondary); font-size:0.9rem;">${arc.titre}</strong>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">${arc.description}</p>
            <div style="margin-top:6px; font-size:0.75rem; color:#fff;">
              <strong>XP / Niveaux :</strong> ${arc.tests ? arc.tests.join(' | ') : 'N/A'}
            </div>
          </div>
        `).join('');
      }
    }
  }
};
