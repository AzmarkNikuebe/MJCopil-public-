window.CombatEngine = {
  // Retrieve the state from AppState.db
  getState() {
    if (!window.AppState) return { active: false, round: 1, currentTurnIndex: 0, combatants: [] };
    if (!window.AppState.db.combatState) {
      window.AppState.db.combatState = {
        active: false,
        round: 1,
        currentTurnIndex: 0,
        combatants: []
      };
    }
    return window.AppState.db.combatState;
  },

  saveState() {
    if (window.CampaignEngine && typeof window.CampaignEngine.saveDatabase === 'function') {
      window.CampaignEngine.saveDatabase();
    }
    this.syncPlayerView();
  },

  startCombat() {
    const state = this.getState();
    state.active = true;
    state.round = 1;
    state.currentTurnIndex = 0;
    this.saveState();
    this.renderCombatTab();
    if (typeof showNotification === 'function') {
      showNotification("Combat démarré ! Mode Initiative activé.", "success");
    }
  },

  endCombat() {
    const state = this.getState();
    
    // Log the end of combat in the journal before clearing combatants
    if (state.combatants && state.combatants.length > 0) {
      const survivors = state.combatants.filter(c => c.hp > 0).map(c => c.name).join(', ');
      const defeated = state.combatants.filter(c => c.hp === 0).map(c => c.name).join(', ');
      
      const log = {
        id: `evt_session_${Date.now()}`,
        title: `Combat résolu — Round ${state.round}`,
        type: 'combat',
        description: `Le combat s'est achevé. Survivants : ${survivors || 'Aucun'}. Vaincus : ${defeated || 'Aucun'}.`,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };
      
      if (window.AppState) {
        if (!window.AppState.sessionLogs) {
          window.AppState.sessionLogs = [];
        }
        window.AppState.sessionLogs.push(log);
        localStorage.setItem("mj_copilot_session_logs", JSON.stringify(window.AppState.sessionLogs));
        
        if (window.EventEngine && typeof window.EventEngine.renderSessionLogs === 'function') {
          window.EventEngine.renderSessionLogs();
        }
        if (window.SessionEngine && typeof window.SessionEngine.renderSessionControlCard === 'function') {
          window.SessionEngine.renderSessionControlCard();
        }
      }
    }

    state.active = false;
    state.round = 1;
    state.currentTurnIndex = 0;
    state.combatants = [];
    this.saveState();
    this.renderCombatTab();
    if (typeof showNotification === 'function') {
      showNotification("Combat terminé.", "info");
    }
  },

  addCombatant(name, hp, maxHp, ca, initiative, isPlayer, id = null, avatar = "") {
    const state = this.getState();
    
    // Auto-activate combat if inactive when adding a participant
    if (!state.active) {
      state.active = true;
      state.round = 1;
      state.currentTurnIndex = 0;
      state.combatants = [];
    }

    const combatantId = id || 'cbt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Eviter les doublons de PNJ ou PJ si ID fourni
    if (id && state.combatants.some(c => c.id === id)) {
      if (typeof showNotification === 'function') {
        showNotification("Ce participant est déjà engagé dans le combat !", "warning");
      }
      return;
    }

    let initialConditions = [];
    if (isPlayer) {
      const db = AppState.db;
      if (db && db.personnages) {
        const pj = db.personnages.find(p => p.id === id || p.nom === name);
        if (pj && Array.isArray(pj.etats)) {
          initialConditions = pj.etats;
        }
      }
    }

    state.combatants.push({
      id: combatantId,
      name: name,
      hp: parseInt(hp) || 10,
      maxHp: parseInt(maxHp) || parseInt(hp) || 10,
      ca: parseInt(ca) || 10,
      initiative: parseInt(initiative) || 0,
      isPlayer: !!isPlayer,
      avatar: avatar || (isPlayer ? 'https://picsum.photos/id/1018/150/150' : 'https://picsum.photos/id/1025/150/150'),
      conditions: initialConditions
    });

    this.sortCombatants();
    this.saveState();
    this.renderCombatTab();
  },

  removeCombatant(id) {
    const state = this.getState();
    const index = state.combatants.findIndex(c => c.id === id);
    if (index !== -1) {
      state.combatants.splice(index, 1);
      if (state.currentTurnIndex >= state.combatants.length && state.combatants.length > 0) {
        state.currentTurnIndex = state.combatants.length - 1;
      }
      this.saveState();
      this.renderCombatTab();
    }
  },

  updateHP(id, amount) {
    const state = this.getState();
    const combatant = state.combatants.find(c => c.id === id);
    if (combatant) {
      combatant.hp = Math.max(0, Math.min(combatant.maxHp, combatant.hp + amount));
      
      // Update player character sheet pointsVie in database
      if (combatant.isPlayer && window.AppState && window.AppState.db && window.AppState.db.personnages) {
        const pj = window.AppState.db.personnages.find(p => p.id === combatant.id);
        if (pj) {
          pj.pointsVie = combatant.hp;
          if (window.CharacterEngine && typeof window.CharacterEngine.renderPlayers === 'function') {
            window.CharacterEngine.renderPlayers();
          }
        }
      }
      
      this.saveState();
      this.renderCombatTab();
    }
  },

  sortCombatants() {
    const state = this.getState();
    state.combatants.sort((a, b) => {
      if (b.initiative !== a.initiative) {
        return b.initiative - a.initiative;
      }
      return a.name.localeCompare(b.name);
    });
  },

  changeInitiative(id, val) {
    const state = this.getState();
    const combatant = state.combatants.find(c => c.id === id);
    if (combatant) {
      combatant.initiative = parseInt(val) || 0;
      this.sortCombatants();
      this.saveState();
      this.renderCombatTab();
    }
  },

  nextTurn() {
    const state = this.getState();
    if (state.combatants.length === 0) return;
    
    state.currentTurnIndex++;
    if (state.currentTurnIndex >= state.combatants.length) {
      state.currentTurnIndex = 0;
      state.round++;
      if (typeof showNotification === 'function') {
        showNotification(`Début du Round ${state.round} !`, "info");
      }
    }
    
    this.saveState();
    this.renderCombatTab();
  },

  syncPlayerView() {
    const state = this.getState();
    if (window.AppState && window.AppState.playerState) {
      window.AppState.playerState.combatActive = state.active;
      window.AppState.playerState.combatants = state.combatants.map((c, index) => ({
        name: c.name,
        avatar: c.avatar,
        initiative: c.initiative,
        isPlayer: c.isPlayer,
        isActiveTurn: state.active && (index === state.currentTurnIndex),
        healthStatus: c.isPlayer ? `${c.hp}/${c.maxHp}` : (c.hp === 0 ? "Vaincu" : (c.hp <= c.maxHp / 2 ? "Blessé" : "En forme")),
        conditions: c.conditions || []
      }));
      
      localStorage.setItem("mj_copilot_player_sync", JSON.stringify(window.AppState.playerState));
      
      if (window.AppState.playerWindow && !window.AppState.playerWindow.closed) {
        window.AppState.playerWindow.postMessage({ type: 'SYNC_PLAYER_VIEW', state: window.AppState.playerState }, '*');
      }
    }
  },

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  },

  handleDrop(e) {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      
      if (data && data.type) {
        if (data.type === 'personnage' || data.type === 'pj') {
          const pj = window.AppState.db.personnages.find(p => p.id === data.id);
          if (pj) {
            const hp = pj.pointsVie !== undefined ? pj.pointsVie : 20;
            const hpMax = pj.pointsVieMax !== undefined ? pj.pointsVieMax : hp;
            this.addCombatant(pj.nom, hp, hpMax, pj.ca || 10, 0, true, pj.id, window.MediaEngine.getEntityImageSrc(pj, 'personnage'));
            if (typeof showNotification === 'function') {
              showNotification(`${pj.nom} ajouté (définissez son initiative sur sa carte)`, "success");
            }
          }
        } else if (data.type === 'pnj') {
          const pnj = window.AppState.db.pnjs.find(p => p.id === data.id);
          if (pnj) {
            let initMod = 0;
            if (pnj.initiative) {
              const match = pnj.initiative.match(/([+-]?\d+)/);
              initMod = match ? parseInt(match[1]) : 0;
            }
            const init = Math.floor(Math.random() * 20) + 1 + initMod;
            const hp = pnj.hp || 15;
            const ca = pnj.ca || 12;
            this.addCombatant(pnj.nom, hp, hp, ca, init, false, pnj.id, window.MediaEngine.getEntityImageSrc(pnj, 'pnj'));
            if (typeof showNotification === 'function') {
              showNotification(`${pnj.nom} ajouté (Init lancée : ${init})`, "success");
            }
          }
        }
      }
    } catch (err) {
      console.error("Drop failed:", err);
    }
  },

  async addCustomCombatantFromForm() {
    const nameEl = document.getElementById('combat-add-name');
    const hpEl = document.getElementById('combat-add-hp');
    const caEl = document.getElementById('combat-add-ca');
    const initEl = document.getElementById('combat-add-init');
    const isPlayerEl = document.getElementById('combat-add-is-player');

    if (!nameEl || !nameEl.value.trim()) {
      await window.ModalEngine.alert("Veuillez saisir un nom.", { title: "Ajout combattant" });
      return;
    }

    const name = nameEl.value.trim();
    const hp = parseInt(hpEl.value) || 10;
    const ca = parseInt(caEl.value) || 10;
    const init = parseInt(initEl.value) || 0;
    const isPlayer = isPlayerEl ? isPlayerEl.checked : false;

    this.addCombatant(name, hp, hp, ca, init, isPlayer);

    // Reset inputs
    nameEl.value = '';
    hpEl.value = '10';
    caEl.value = '10';
    initEl.value = '10';
    if (isPlayerEl) isPlayerEl.checked = false;

    if (typeof showNotification === 'function') {
      showNotification(`${name} ajouté au combat !`, "success");
    }
  },

  async addCodexParticipant() {
    const select = document.getElementById('combat-add-codex-select');
    if (!select || !select.value) {
      await window.ModalEngine.alert("Veuillez sélectionner un PNJ ou un PJ.", { title: "Ajout Codex" });
      return;
    }

    const val = select.value;
    const firstUnderscore = val.indexOf('_');
    if (firstUnderscore === -1) return;

    const type = val.substring(0, firstUnderscore);
    const id = val.substring(firstUnderscore + 1);

    if (type === 'pj') {
      const pj = window.AppState.db.personnages.find(p => p.id === id);
      if (pj) {
        const hp = pj.pointsVie !== undefined ? pj.pointsVie : 20;
        const hpMax = pj.pointsVieMax !== undefined ? pj.pointsVieMax : hp;
        this.addCombatant(pj.nom, hp, hpMax, pj.ca || 10, 0, true, pj.id, window.MediaEngine.getEntityImageSrc(pj, 'personnage'));
        if (typeof showNotification === 'function') {
          showNotification(`${pj.nom} ajouté (modifiez son initiative sur sa carte)`, "success");
        }
      }
    } else if (type === 'pnj') {
      const pnj = window.AppState.db.pnjs.find(p => p.id === id);
      if (pnj) {
        let initMod = 0;
        if (pnj.initiative) {
          const match = pnj.initiative.match(/([+-]?\d+)/);
          initMod = match ? parseInt(match[1]) : 0;
        }
        const init = Math.floor(Math.random() * 20) + 1 + initMod;
        const hp = pnj.hp || 15;
        const ca = pnj.ca || 12;
        this.addCombatant(pnj.nom, hp, hp, ca, init, false, pnj.id, window.MediaEngine.getEntityImageSrc(pnj, 'pnj'));
        if (typeof showNotification === 'function') {
          showNotification(`${pnj.nom} ajouté (Init lancée : ${init})`, "success");
        }
      }
    } else if (type === 'bete') {
      const b = window.AppState.db.betes.find(x => x.id === id);
      if (b) {
        let initMod = 0;
        if (b.initiative) {
          const match = b.initiative.match(/([+-]?\d+)/);
          initMod = match ? parseInt(match[1]) : 0;
        }
        const init = Math.floor(Math.random() * 20) + 1 + initMod;
        const hp = b.pointsVie !== undefined ? b.pointsVie : 15;
        const hpMax = b.pointsVieMax !== undefined ? b.pointsVieMax : hp;
        const ca = b.ca || 12;
        this.addCombatant(b.nom, hp, hpMax, ca, init, false, b.id, window.MediaEngine.getEntityImageSrc(b, 'bete'));
        if (typeof showNotification === 'function') {
          showNotification(`${b.nom} ajouté (Init lancée : ${init})`, "success");
        }
      }
    }

    select.value = '';
  },

  populateCodexSelect() {
    const select = document.getElementById('combat-add-codex-select');
    if (!select) return;

    select.innerHTML = '<option value="">-- Choisir un PJ / PNJ du Codex --</option>';

    if (window.AppState && window.AppState.db) {
      // Add PJs
      if (window.AppState.db.personnages && window.AppState.db.personnages.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = "🧙 Personnages Joueurs";
        window.AppState.db.personnages.forEach(pj => {
          grp.innerHTML += `<option value="pj_${pj.id}">${pj.nom} (Niv ${pj.niveau} ${pj.classe})</option>`;
        });
        select.appendChild(grp);
      }

      // Add NPCs
      if (window.AppState.db.pnjs && window.AppState.db.pnjs.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = "👤 PNJs / Créatures du Codex";
        window.AppState.db.pnjs.forEach(pnj => {
          grp.innerHTML += `<option value="pnj_${pnj.id}">${pnj.nom} (${pnj.role || 'Sans rôle'})</option>`;
        });
        select.appendChild(grp);
      }

      // Add Beasts
      if (window.AppState.db.betes && window.AppState.db.betes.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = "🐾 Bêtes / Monstres du Codex";
        window.AppState.db.betes.forEach(b => {
          grp.innerHTML += `<option value="bete_${b.id}">${b.nom} (${b.role || 'Sans rôle'})</option>`;
        });
        select.appendChild(grp);
      }
    }
  },

  renderCombatTab() {
    const container = document.getElementById('combat-initiative-list');
    if (!container) return;

    const state = this.getState();
    this.populateCodexSelect();

    if (!state.active) {
      container.innerHTML = `
        <div style="text-align:center; padding:60px 20px; color:var(--text-muted); display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; box-sizing:border-box;">
          <div style="font-size:3.5rem; margin-bottom:15px; filter: drop-shadow(0 0 10px rgba(157,78,221,0.3));">⚔️</div>
          <h2 style="font-family:var(--font-title); font-size:1.2rem; color:#fff; margin-bottom:8px;">Aucun Combat Actif</h2>
          <p style="font-size:0.85rem; max-width:320px; margin-bottom:20px; line-height:1.4;">Activez le mode combat pour ordonner l'initiative et synchroniser l'affichage avec l'écran joueur.</p>
          <button class="btn btn-primary" onclick="window.CombatEngine.startCombat()" style="padding:10px 24px; font-weight:bold; font-size:0.9rem; letter-spacing:0.5px;">DÉMARRER LE COMBAT</button>
        </div>
      `;
      
      const rollMonstersBtn = document.getElementById('combat-roll-monsters-btn');
      if (rollMonstersBtn) rollMonstersBtn.style.display = 'none';
      const nextBtn = document.getElementById('combat-next-turn-btn');
      if (nextBtn) nextBtn.disabled = true;
      const endBtn = document.getElementById('combat-end-btn');
      if (endBtn) endBtn.style.display = 'none';
      const roundEl = document.getElementById('combat-round-counter');
      if (roundEl) roundEl.textContent = 'En attente...';
      return;
    }

    const rollMonstersBtn = document.getElementById('combat-roll-monsters-btn');
    if (rollMonstersBtn) rollMonstersBtn.style.display = 'inline-block';
    const nextBtn = document.getElementById('combat-next-turn-btn');
    if (nextBtn) nextBtn.disabled = false;
    const endBtn = document.getElementById('combat-end-btn');
    if (endBtn) endBtn.style.display = 'inline-block';

    const roundEl = document.getElementById('combat-round-counter');
    if (roundEl) roundEl.textContent = `Round ${state.round}`;

    if (state.combatants.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:var(--text-muted); border: 2px dashed rgba(157,78,221,0.25); border-radius:10px; margin: 10px 0; background:rgba(0,0,0,0.15);" ondragover="window.CombatEngine.handleDragOver(event)" ondrop="window.CombatEngine.handleDrop(event)">
          <div style="font-size:2rem; margin-bottom:10px;">📥</div>
          <p style="font-size:0.9rem; color:#fff; margin-bottom:4px; font-weight:600;">Le combat est vide</p>
          <p style="font-size:0.8rem; line-height:1.4; max-width:280px; margin: 0 auto 12px;">Glissez-déposez des PJ (liste droite) ou des PNJs (encyclopédie) ici.</p>
          <p style="font-size:0.75rem; color:var(--color-secondary);">Ou ajoutez-les via le panneau latéral droit.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div style="display:flex; flex-direction:column; gap:8px;" ondragover="window.CombatEngine.handleDragOver(event)" ondrop="window.CombatEngine.handleDrop(event)">
    `;

    state.combatants.forEach((c, index) => {
      const isActive = index === state.currentTurnIndex;
      const activeStyle = isActive 
        ? 'border: 1px solid var(--color-secondary); box-shadow: 0 0 12px rgba(0, 245, 212, 0.25); background: rgba(0, 245, 212, 0.08);' 
        : 'border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02);';
        
      const hpPercent = Math.max(0, Math.min(100, (c.hp / c.maxHp) * 100));
      const hpColor = hpPercent <= 25 ? '#ef233c' : (hpPercent <= 50 ? '#ffd166' : '#06d6a0');

      let actionButtons = '';
      if (c.isPlayer && window.AppState && window.AppState.db) {
        const pj = window.AppState.db.personnages.find(p => p.nom === c.name || p.id === c.id);
        if (pj) {
          const weapon = pj.equipement?.arme || "Sans arme";
          actionButtons = `
            <div style="display:flex; align-items:center; gap:5px; margin-top:5px; flex-wrap:wrap;">
              <button class="btn" style="padding:2px 7px; font-size:0.62rem; background:rgba(255,107,107,0.18); border:1px solid #ff6b6b; color:#ff8e8e; border-radius:3px; font-weight:600; letter-spacing:0.3px;" onclick="window.CharacterEngine.rollPlayerWeaponAttack('${pj.id}')" title="Flux complet D&amp;D 5e : d20 → CA → Dégâts → HP">⚔️ Attaquer <span style="font-size:0.55rem; opacity:0.7;">(${weapon})</span></button>
              ${pj.sorts && pj.sorts.length > 0 ? `
                <select onchange="if(this.value) { window.CharacterEngine.castSpellFromCombat('${pj.id}', this.value); this.value=''; }" style="font-size:0.6rem; padding:1px 3px; border-radius:3px; background:#2a1045; border:1px solid #9d4edd; color:#dfb2ff; cursor:pointer; max-width:90px; outline:none;">
                  <option value="" style="background:#1a0a30; color:#dfb2ff;">🔮 Sort</option>
                  ${pj.sorts.map(s => `<option value="${s}" style="background:#1a0a30; color:#fff;">${s}</option>`).join('')}
                </select>
              ` : ''}
            </div>
          `;

        }
      }

      html += `
        <div class="combatant-card" style="display:grid; grid-template-columns: 25px 36px 1.2fr 130px 45px 50px 25px; align-items:center; gap:8px; padding:8px 10px; border-radius:6px; transition: all 0.25s ease; ${activeStyle}">
          <!-- Turn Indicator -->
          <div style="text-align:center; font-weight:bold; font-size:0.95rem; color:${isActive ? 'var(--color-secondary)' : 'rgba(255,255,255,0.15)'};">
            ${isActive ? '➔' : `${index + 1}`}
          </div>
          
          <!-- Avatar -->
          <div style="width:30px; height:30px; border-radius:50%; border: 1.5px solid ${c.isPlayer ? '#9d4edd' : '#ef233c'}; background-image:url('${c.avatar}'); background-size:cover; background-position:center; flex-shrink:0; filter: ${c.avatar.includes('images/icons/') ? 'invert(1)' : 'none'};"></div>
          
          <!-- Name & Conditions -->
          <div style="display:flex; flex-direction:column; min-width:0;">
            <strong style="font-size:0.82rem; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.name}</strong>
            <span style="font-size:0.68rem; color:${c.isPlayer ? '#c77dff' : '#ff85a1'};">${c.isPlayer ? 'PJ (Joueur)' : 'Monstre/PNJ'}</span>
            <!-- Condition badges and Quick Add -->
            <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:4px; align-items:center;">
              ${(c.conditions || []).map(cond => `
                <span class="badge-condition" style="font-size:0.6rem; font-weight:700; background:rgba(217,4,41,0.15); color:#ff6b6b; border:1px solid rgba(217,4,41,0.3); padding:1px 4px; border-radius:3px; display:inline-flex; align-items:center; gap:3px;">
                  ${cond}
                  <span style="cursor:pointer; color:#fff; font-weight:bold; font-size:0.75rem;" onclick="window.CombatEngine.toggleCondition('${c.id}', '${cond}', false)">×</span>
                </span>
              `).join('')}
              <select onchange="window.CombatEngine.toggleCondition('${c.id}', this.value, true); this.value='';" style="font-size:0.6rem; padding:1px 3px; border-radius:3px; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.12); color:#fff; cursor:pointer; width:62px;">
                <option value="">+ État</option>
                <option value="À terre">À terre</option>
                <option value="Empoisonné">Empoisonné</option>
                <option value="Charmé">Charmé</option>
                <option value="Paralysé">Paralysé</option>
                <option value="Inconscient">Inconscient</option>
                <option value="Étourdi">Étourdi</option>
                <option value="Invisible">Invisible</option>
                <option value="Entravé">Entravé</option>
                <option value="Pétrifié">Pétrifié</option>
                <option value="Apeuré">Apeuré</option>
                <option value="Aveuglé">Aveuglé</option>
                <option value="Assourdi">Assourdi</option>
              </select>
              ${actionButtons}
            </div>
          </div>

          <!-- HP & Controls -->
          <div style="display:flex; flex-direction:column; gap:3px;">
            <div style="display:flex; justify-content:space-between; font-size:0.68rem; color:var(--text-muted); font-weight:600;">
              <span>PV: ${c.hp}/${c.maxHp}</span>
            </div>
            <div style="width:100%; height:5px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden;">
              <div style="width:${hpPercent}%; height:100%; background:${hpColor}; transition: width 0.2s ease;"></div>
            </div>
            <!-- HP Adjust Buttons -->
            <div style="display:flex; gap:4px; margin-top:2px;">
              <button class="btn btn-secondary" onclick="window.CombatEngine.updateHP('${c.id}', -1)" style="padding:1px 3px; font-size:0.65rem; font-weight:bold; border-radius:3px; min-width:18px; height:18px;">-1</button>
              <button class="btn btn-secondary" onclick="window.CombatEngine.updateHP('${c.id}', -5)" style="padding:1px 3px; font-size:0.65rem; font-weight:bold; border-radius:3px; min-width:18px; height:18px;">-5</button>
              <button class="btn btn-secondary" onclick="window.CombatEngine.updateHP('${c.id}', 1)" style="padding:1px 3px; font-size:0.65rem; font-weight:bold; border-radius:3px; min-width:18px; height:18px;">+1</button>
              <button class="btn btn-secondary" onclick="window.CombatEngine.updateHP('${c.id}', 5)" style="padding:1px 3px; font-size:0.65rem; font-weight:bold; border-radius:3px; min-width:18px; height:18px;">+5</button>
            </div>
          </div>

          <!-- CA -->
          <div style="text-align:center;">
            <div style="font-size:0.68rem; color:var(--text-muted);">CA</div>
            <strong style="font-size:0.8rem; color:#fff;">🛡️ ${c.ca}</strong>
          </div>

          <!-- Initiative Score -->
          <div style="text-align:center;">
            <div style="font-size:0.68rem; color:var(--text-muted); margin-bottom:1px;">Init</div>
            <input type="number" value="${c.initiative}" onchange="window.CombatEngine.changeInitiative('${c.id}', this.value)" style="width:36px; text-align:center; padding:1px; font-size:0.75rem; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.12); border-radius:4px; color:#fff; font-weight:bold;">
          </div>

          <!-- Delete -->
          <div style="text-align:right;">
            <button style="background:none; border:none; padding:4px; cursor:pointer; font-size:0.8rem; color:rgba(255,255,255,0.35);" onclick="window.CombatEngine.removeCombatant('${c.id}')" title="Retirer du combat">❌</button>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  },

  async getAIAdvice() {
    const state = this.getState();
    if (!state.active || state.combatants.length === 0) {
      await window.ModalEngine.alert("Aucun combat actif ou aucun combattant présent.", { title: "Conseil IA" });
      return;
    }

    const currentCombatant = state.combatants[state.currentTurnIndex];
    if (!currentCombatant) return;

    const adviceContainer = document.getElementById('combat-ai-advice');
    if (adviceContainer) {
      adviceContainer.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; gap:8px; padding:15px;"><div class="spinner"></div><p style="font-style:italic; font-size:0.78rem; color:var(--text-muted);">L'IA analyse la situation tactique...</p></div>`;
    }

    const combatantsSummary = state.combatants.map(c => 
      `- ${c.name} (${c.isPlayer ? 'PJ' : 'Monstre'}) : PV=${c.hp}/${c.maxHp}, CA=${c.ca}, Initiative=${c.initiative}`
    ).join('\n');

    const contextLieu = (window.AppState && window.AppState.playerState && window.AppState.playerState.activeEntity) 
      ? `Lieu : ${window.AppState.playerState.activeEntity.name} (${window.AppState.playerState.activeEntity.role})`
      : `Lieu : Urithiru profondeurs`;

    const userPrompt = `Tu es l'assistant de table de jeu de rôle D&D 5E.
Nous sommes en combat dans le contexte suivant :
${contextLieu}
Round actuel : ${state.round}

Liste des participants dans l'ordre d'initiative :
${combatantsSummary}

C'est actuellement le tour de : ${currentCombatant.name} (${currentCombatant.isPlayer ? 'PJ' : 'Monstre'}).
${currentCombatant.isPlayer 
  ? `Donne-moi une idée d'action inattendue ou de tactique environnementale pour ${currentCombatant.name} (le joueur) afin de surprendre ses ennemis.` 
  : `Propose une manœuvre tactique optimale pour ${currentCombatant.name} (l'ennemi) selon les règles D&D 5E (qui attaquer, comment se déplacer, quelle compétence utiliser) et propose une réplique de combat théâtrale en français pour le monstre.`
}

Sois concis, direct et immersif (maximum 3-4 phrases). Réponds directement au format Markdown.`;

    try {
      if (window.AIAssistantEngine && typeof window.AIAssistantEngine.callGeminiAPI === 'function') {
        const response = await window.AIAssistantEngine.callGeminiAPI(userPrompt, "Tu es un assistant de table de jeu de rôle expert. Donne des conseils tactiques rapides et des répliques théâtrales.");
        
        if (adviceContainer) {
          const cleanText = response.replace(/\n/g, '<br>');
          adviceContainer.innerHTML = `
            <div style="background:rgba(157,78,221,0.1); padding:12px; border-radius:8px; border:1px solid rgba(157,78,221,0.22); font-size:0.8rem; line-height:1.45; animation: fadeIn 0.4s ease;">
              <strong style="color:var(--color-secondary); display:block; margin-bottom:6px; font-size:0.85rem;">🔮 Conseil pour ${currentCombatant.name} :</strong>
              <div style="color:var(--text-main);">${cleanText}</div>
            </div>
          `;
        }
      } else {
        throw new Error("L'Assistant IA n'est pas disponible.");
      }
    } catch (err) {
      console.error(err);
      if (adviceContainer) {
        adviceContainer.innerHTML = `<div style="padding:10px; border:1px solid rgba(220,53,69,0.3); background:rgba(220,53,69,0.08); border-radius:6px; color:#ff6b6b; font-size:0.75rem;">Erreur : ${err.message}</div>`;
      }
    }
  },

  toggleCondition(id, conditionName, shouldAdd) {
    if (!conditionName) return;
    const state = this.getState();
    const combatant = state.combatants.find(c => c.id === id);
    if (combatant) {
      if (!combatant.conditions) combatant.conditions = [];
      if (shouldAdd) {
        if (!combatant.conditions.includes(conditionName)) {
          combatant.conditions.push(conditionName);
        }
      } else {
        combatant.conditions = combatant.conditions.filter(c => c !== conditionName);
      }

      // Synchroniser avec les états du personnage (pj.etats) si c'est un PJ
      const db = AppState.db;
      if (db && db.personnages) {
        const pj = db.personnages.find(p => p.id === id || p.nom === combatant.name);
        if (pj) {
          pj.etats = combatant.conditions;
          if (window.CampaignEngine && typeof window.CampaignEngine.saveDatabase === 'function') {
            window.CampaignEngine.saveDatabase();
          }
        }
      }

      this.saveState();
      this.renderCombatTab();
    }
  },

  rollAllMonstersInitiative() {
    const state = this.getState();
    if (!state.active || state.combatants.length === 0) return;
    
    let rolledCount = 0;
    state.combatants.forEach(c => {
      if (!c.isPlayer) {
        const d20 = Math.floor(Math.random() * 20) + 1;
        let modifier = 0;
        
        const db = AppState.db;
        if (db) {
          const bete = (db.betes || []).find(b => b.id === c.id || b.nom === c.name);
          if (bete && bete.initiative) {
            modifier = this.parseInitiativeModifier(bete.initiative);
          } else {
            const pnj = (db.pnjs || []).find(p => p.id === c.id || p.nom === c.name);
            if (pnj && pnj.initiative) {
              modifier = this.parseInitiativeModifier(pnj.initiative);
            }
          }
        }
        
        c.initiative = d20 + modifier;
        rolledCount++;
        console.log(`Roll Initiative for ${c.name}: 1d20 (${d20}) + ${modifier} = ${c.initiative}`);
      }
    });
    
    if (rolledCount > 0) {
      this.sortCombatants();
      this.saveState();
      this.renderCombatTab();
      if (typeof showNotification === 'function') {
        showNotification(`Initiative lancée pour ${rolledCount} monstres !`, "success");
      }
    }
  },
  
  parseInitiativeModifier(initStr) {
    if (!initStr) return 0;
    const match = initStr.match(/([+-]?\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
};
