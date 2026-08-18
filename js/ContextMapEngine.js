window.ContextMapEngine = {
  activeLieuId: "",

  getCustomTokens() {
    const saved = localStorage.getItem("mj_copilot_custom_tokens");
    return saved ? JSON.parse(saved) : ["📦", "⚔️", "🚪", "🕸️", "👿", "👤", "🗣️", "⛺", "💡"];
  },

  saveCustomTokens(tokens) {
    localStorage.setItem("mj_copilot_custom_tokens", JSON.stringify(tokens));
  },

  init() {
    // Choisir le premier lieu par défaut si disponible
    const db = AppState.db;
    if (db && db.lieux && db.lieux.length > 0) {
      this.activeLieuId = db.lieux[0].id;
    }
  },

  setActiveLieu(lieuId) {
    this.activeLieuId = lieuId;
    this.renderMap();
    if (window.syncPlayerView) {
      window.syncPlayerView();
    }
  },

  renderMap() {
    const container = document.getElementById('map-viewport-container');
    if (!container) return;

    container.innerHTML = "";

    const db = AppState.db;
    if (!db || !this.activeLieuId) {
      container.innerHTML = '<div style="color:var(--text-dim); text-align:center; padding:40px;">Aucune carte active. Sélectionnez un lieu dans l\'Encyclopédie.</div>';
      return;
    }

    const lieu = db.lieux.find(l => l.id === this.activeLieuId);
    if (!lieu) {
      container.innerHTML = '<div style="color:var(--text-dim); text-align:center; padding:40px;">Lieu introuvable.</div>';
      return;
    }

    const imgSrc = window.MediaEngine.getEntityImageSrc(lieu, 'lieu');

    // Assurer que le tableau de marqueurs existe
    if (!lieu.mapMarkers) lieu.mapMarkers = [];

    // 1. Créer l'en-tête de contrôle de la carte
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '6px';
    
    const zoomText = this.getMapLevelLabel(lieu.type);
    
    header.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <div style="font-size:0.75rem; color:var(--text-dim); font-weight:700;">
          📍 CARTE : <span style="color:#fff;">${lieu.nom}</span> (${zoomText})
        </div>
        <button class="btn btn-secondary" style="padding:2px 8px; font-size:0.65rem;" onclick="document.getElementById('vtt-grid-overlay')?.classList.toggle('active')">📐 Grille</button>
        <button class="btn btn-secondary" style="padding:2px 8px; font-size:0.65rem; background:rgba(157,78,221,0.2); border-color:rgba(157,78,221,0.4); color:#dfb2ff;" onclick="window.WorldEngine.showOnPlayerScreen('lieu', '${lieu.id}')">👁️ Afficher Joueur</button>
      </div>
      <div style="font-size:0.65rem; color:var(--text-muted);">
        *Double-clic jeton perso pour suppr / Glisser sur carte
      </div>
    `;

    // 2. Créer le bandeau Gestionnaire d'Icônes (Token Manager)
    const defaultTokens = ["📦", "⚔️", "🚪", "🕸️", "👿", "👤", "🗣️", "⛺", "💡"];
    const currentTokens = this.getCustomTokens();

    const iconManager = document.createElement('div');
    iconManager.className = 'icon-manager';
    iconManager.style.display = 'flex';
    iconManager.style.alignItems = 'center';
    iconManager.style.gap = '10px';
    iconManager.style.padding = '8px 12px';
    iconManager.style.marginBottom = '8px';
    iconManager.style.background = 'rgba(255, 255, 255, 0.03)';
    iconManager.style.border = '1px solid var(--glass-border)';
    iconManager.style.borderRadius = '8px';
    iconManager.style.overflowX = 'auto';
    iconManager.style.minHeight = '48px';
    
    const managerLabel = document.createElement('span');
    managerLabel.className = 'icon-manager-label';
    managerLabel.style.fontSize = '0.7rem';
    managerLabel.style.color = 'var(--text-dim)';
    managerLabel.style.fontWeight = '700';
    managerLabel.style.textTransform = 'uppercase';
    managerLabel.style.letterSpacing = '0.5px';
    managerLabel.style.whiteSpace = 'nowrap';
    managerLabel.innerHTML = 'Jetons :';
    iconManager.appendChild(managerLabel);

    currentTokens.forEach(token => {
      const tokenEl = document.createElement('div');
      tokenEl.className = 'token-item';
      tokenEl.textContent = token;
      tokenEl.draggable = true;
      
      // Inline styles for token items
      tokenEl.style.width = '32px';
      tokenEl.style.height = '32px';
      tokenEl.style.borderRadius = '50%';
      tokenEl.style.background = 'rgba(0, 0, 0, 0.3)';
      tokenEl.style.border = '1px solid var(--glass-border)';
      tokenEl.style.display = 'flex';
      tokenEl.style.alignItems = 'center';
      tokenEl.style.justifyContent = 'center';
      tokenEl.style.fontSize = '1.15rem';
      tokenEl.style.cursor = 'grab';
      tokenEl.style.userSelect = 'none';
      tokenEl.style.transition = 'transform 0.2s ease, border-color 0.2s ease, background 0.2s ease';
      tokenEl.style.flexShrink = '0';
      
      const isCustom = !defaultTokens.includes(token);
      if (isCustom) {
        tokenEl.classList.add('custom-token');
        tokenEl.style.borderStyle = 'dashed';
        tokenEl.title = "Double-cliquez pour supprimer";
      } else {
        tokenEl.title = "Glissez-déposez sur la carte";
      }

      // Hover animations in JS
      tokenEl.addEventListener('mouseover', () => {
        tokenEl.style.transform = 'scale(1.15)';
        tokenEl.style.borderColor = 'var(--color-primary)';
        tokenEl.style.background = 'rgba(157, 78, 221, 0.2)';
      });
      tokenEl.addEventListener('mouseout', () => {
        tokenEl.style.transform = 'none';
        tokenEl.style.borderColor = 'var(--glass-border)';
        tokenEl.style.background = 'rgba(0, 0, 0, 0.3)';
      });
      tokenEl.addEventListener('mousedown', () => {
        tokenEl.style.cursor = 'grabbing';
      });
      tokenEl.addEventListener('mouseup', () => {
        tokenEl.style.cursor = 'grab';
      });

      tokenEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData("text/plain", token);
        e.dataTransfer.setData("source", "manager");
      });

      if (isCustom) {
        tokenEl.addEventListener('dblclick', async (e) => {
          if (await window.ModalEngine.confirm(`Supprimer le jeton "${token}" du gestionnaire ?`, { title: "Supprimer un jeton" })) {
            const updated = currentTokens.filter(t => t !== token);
            this.saveCustomTokens(updated);
            this.renderMap();
          }
        });
      }

      iconManager.appendChild(tokenEl);
    });

    const addBtn = document.createElement('div');
    addBtn.className = 'add-token-btn';
    addBtn.textContent = '+';
    addBtn.title = "Ajouter un émoji personnalisé";
    
    // Add button styles
    addBtn.style.width = '32px';
    addBtn.style.height = '32px';
    addBtn.style.borderRadius = '50%';
    addBtn.style.background = 'rgba(255, 255, 255, 0.05)';
    addBtn.style.border = '1px dashed var(--glass-border)';
    addBtn.style.color = 'var(--text-muted)';
    addBtn.style.fontSize = '1.1rem';
    addBtn.style.fontWeight = '700';
    addBtn.style.display = 'flex';
    addBtn.style.alignItems = 'center';
    addBtn.style.justifyContent = 'center';
    addBtn.style.cursor = 'pointer';
    addBtn.style.transition = 'all 0.2s ease';
    addBtn.style.flexShrink = '0';

    addBtn.addEventListener('mouseover', () => {
      addBtn.style.borderColor = 'var(--color-primary)';
      addBtn.style.color = '#fff';
      addBtn.style.background = 'rgba(157, 78, 221, 0.15)';
      addBtn.style.transform = 'scale(1.1)';
    });
    addBtn.addEventListener('mouseout', () => {
      addBtn.style.borderColor = 'var(--glass-border)';
      addBtn.style.color = 'var(--text-muted)';
      addBtn.style.background = 'rgba(255, 255, 255, 0.05)';
      addBtn.style.transform = 'none';
    });

    addBtn.addEventListener('click', async () => {
      const emoji = await window.ModalEngine.prompt("Saisissez un émoji ou une icône (1 seul caractère) :", "", { title: "Nouveau jeton" });
      if (emoji) {
        const trimmed = emoji.trim();
        if (trimmed.length > 0) {
          const char = Array.from(trimmed)[0];
          if (!currentTokens.includes(char)) {
            currentTokens.push(char);
            this.saveCustomTokens(currentTokens);
            this.renderMap();
          }
        }
      }
    });
    iconManager.appendChild(addBtn);

    // 3. Créer la structure de la carte
    const mapWrapper = document.createElement('div');
    mapWrapper.style.position = 'relative';
    mapWrapper.style.display = 'inline-flex';
    mapWrapper.style.alignSelf = 'center';
    mapWrapper.style.maxHeight = 'calc(100vh - 200px)';
    mapWrapper.style.maxWidth = '100%';
    mapWrapper.style.overflow = 'hidden';
    mapWrapper.style.borderRadius = '8px';
    mapWrapper.style.border = '1px solid var(--glass-border)';
    mapWrapper.style.transition = 'box-shadow 0.2s ease, border-color 0.2s ease';

    const img = document.createElement('img');
    img.src = imgSrc;
    img.style.maxWidth = '100%';
    img.style.maxHeight = 'calc(100vh - 200px)';
    img.style.width = 'auto';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.id = 'active-context-map-image';

    const gridOverlay = document.createElement('div');
    gridOverlay.id = 'vtt-grid-overlay';
    gridOverlay.className = 'vtt-grid-overlay';

    mapWrapper.appendChild(img);
    mapWrapper.appendChild(gridOverlay);

    // Rendre les marqueurs
    lieu.mapMarkers.forEach(mark => {
      const markerEl = document.createElement('div');
      markerEl.className = 'map-marker';
      markerEl.style.position = 'absolute';
      markerEl.style.left = `${mark.x}%`;
      markerEl.style.top = `${mark.y}%`;
      markerEl.style.transform = 'translate(-50%, -50%)';
      markerEl.style.zIndex = '10';
      markerEl.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))';
      markerEl.title = `${mark.label} (Glissez pour déplacer / Clic pour supprimer)`;
      markerEl.draggable = true;
      markerEl.style.cursor = 'grab';

      // Vérifier si mark.icon est une URL ou un chemin vers une image
      const isImageUrl = mark.icon && (
        mark.icon.startsWith('http://') ||
        mark.icon.startsWith('https://') ||
        mark.icon.startsWith('data:image/') ||
        mark.icon.includes('/') ||
        mark.icon.includes('.')
      );

      if (isImageUrl) {
        markerEl.style.width = '36px';
        markerEl.style.height = '36px';
        markerEl.style.borderRadius = '50%';
        markerEl.style.backgroundImage = `url('${mark.icon}')`;
        markerEl.style.backgroundSize = 'cover';
        markerEl.style.backgroundPosition = 'center';
        markerEl.style.border = '2px solid var(--color-primary)';
        markerEl.style.boxShadow = '0 0 8px rgba(0, 0, 0, 0.6)';
        markerEl.textContent = ''; // Vider le texte

        // Appliquer un filtre blanc si c'est une icône SVG de game-icons
        if (mark.icon.includes('images/icons/')) {
          markerEl.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.8)) invert(1)';
        }
      } else {
        markerEl.style.fontSize = '1.3rem';
        markerEl.textContent = mark.icon;
      }

      // Drag start pour le repositionnement du marqueur
      markerEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData("text/plain", mark.id);
        e.dataTransfer.setData("source", "map");
        markerEl.style.cursor = 'grabbing';
      });

      markerEl.addEventListener('dragend', () => {
        markerEl.style.cursor = 'grab';
      });

      // Clic pour supprimer
      markerEl.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (await window.ModalEngine.confirm(`Supprimer le marqueur "${mark.label}" ?`, { title: "Supprimer un marqueur" })) {
          this.deleteMarker(mark.id);
        }
      });

      mapWrapper.appendChild(markerEl);
    });

    // Clic sur la carte comme alternative
    img.addEventListener('click', (e) => {
      const rect = img.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      this.promptAddMarker(x, y);
    });

    // Gestionnaires d'événements Drag & Drop de la zone de carte
    mapWrapper.addEventListener('dragover', (e) => {
      e.preventDefault();
      mapWrapper.style.boxShadow = '0 0 18px var(--color-primary)';
      mapWrapper.style.borderColor = 'var(--color-primary)';
    });

    const removeDragOver = () => {
      mapWrapper.style.boxShadow = 'none';
      mapWrapper.style.borderColor = 'var(--glass-border)';
    };

    mapWrapper.addEventListener('dragleave', removeDragOver);
    mapWrapper.addEventListener('dragend', removeDragOver);

    mapWrapper.addEventListener('drop', async (e) => {
      e.preventDefault();
      removeDragOver();

      const source = e.dataTransfer.getData("source");
      const data = e.dataTransfer.getData("text/plain");

      if (!data) return;

      const rect = img.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      const boundedX = Math.min(100, Math.max(0, parseFloat(x.toFixed(2))));
      const boundedY = Math.min(100, Math.max(0, parseFloat(y.toFixed(2))));

      // Vérifier si l'objet déposé est un personnage ou un PNJ (format JSON)
      let dragObj = null;
      try {
        dragObj = JSON.parse(data);
      } catch (err) {
        // Pas du JSON, continuer vers le comportement standard
      }

      if (dragObj && (dragObj.type === 'personnage' || dragObj.type === 'pnj')) {
        const type = dragObj.type;
        const id = dragObj.id;
        const db = AppState.db;
        if (!db) return;

        let entity = null;
        if (type === 'personnage') {
          entity = db.personnages.find(p => p.id === id);
        } else if (type === 'pnj') {
          entity = db.pnjs.find(p => p.id === id);
        }

        if (entity) {
          const avatar = window.MediaEngine.getEntityImageSrc(entity, type);
          this.addMarker(boundedX, boundedY, avatar, entity.nom || entity.titre || "Jeton");
        }
        return;
      }

      if (!source) return;

      if (source === "manager") {
        const token = data;
        const label = await window.ModalEngine.prompt(`Nouveau marqueur "${token}". Saisissez un nom / label :`, "", { title: "Nouveau marqueur" });
        if (label !== null) {
          const trimmedLabel = label.trim() || `Marqueur ${token}`;
          this.addMarker(boundedX, boundedY, token, trimmedLabel);
        }
      } else if (source === "map") {
        const markerId = data;
        const marker = lieu.mapMarkers.find(m => m.id === markerId);
        if (marker) {
          marker.x = boundedX;
          marker.y = boundedY;
          window.CampaignEngine.saveDatabase();
          this.renderMap();
          if (window.syncPlayerView) {
            window.syncPlayerView();
          }
          showNotification(`Marqueur "${marker.label}" déplacé !`, "success");
        }
      }
    });

    // 2.5 Créer la ligne d'insertion rapide depuis le Codex
    const codexRow = document.createElement('div');
    codexRow.className = 'codex-quick-add';
    codexRow.style.display = 'flex';
    codexRow.style.alignItems = 'center';
    codexRow.style.gap = '8px';
    codexRow.style.padding = '6px 10px';
    codexRow.style.marginBottom = '8px';
    codexRow.style.background = 'rgba(255, 255, 255, 0.03)';
    codexRow.style.border = '1px solid var(--glass-border)';
    codexRow.style.borderRadius = '8px';

    const labelCodex = document.createElement('span');
    labelCodex.style.fontSize = '0.72rem';
    labelCodex.style.color = 'var(--text-dim)';
    labelCodex.style.fontWeight = '700';
    labelCodex.style.whiteSpace = 'nowrap';
    labelCodex.textContent = "PLACER DU CODEX :";

    const selectCodex = document.createElement('select');
    selectCodex.id = "vtt-add-codex-select";
    selectCodex.style.padding = '4px 8px';
    selectCodex.style.fontSize = '0.72rem';
    selectCodex.style.borderRadius = '4px';
    selectCodex.style.background = 'rgba(0,0,0,0.4)';
    selectCodex.style.border = '1px solid var(--glass-border)';
    selectCodex.style.color = '#fff';
    selectCodex.style.flex = '1';
    selectCodex.style.minWidth = '0';

    // Populate selectCodex dynamically
    selectCodex.innerHTML = '<option value="">-- Choisir un PJ / PNJ / Bête à placer --</option>';
    if (db) {
      // Add PJs
      if (db.personnages && db.personnages.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = "🧙 Personnages Joueurs";
        db.personnages.forEach(pj => {
          grp.innerHTML += `<option value="pj_${pj.id}">${pj.nom} (Niv ${pj.niveau} ${pj.classe})</option>`;
        });
        selectCodex.appendChild(grp);
      }
      // Add NPCs
      if (db.pnjs && db.pnjs.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = "👤 PNJs / Créatures";
        db.pnjs.forEach(pnj => {
          grp.innerHTML += `<option value="pnj_${pnj.id}">${pnj.nom} (${pnj.role || 'Sans rôle'})</option>`;
        });
        selectCodex.appendChild(grp);
      }
      // Add Beasts
      if (db.betes && db.betes.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = "🐾 Bêtes / Monstres";
        db.betes.forEach(b => {
          grp.innerHTML += `<option value="bete_${b.id}">${b.nom} (${b.role || 'Sans rôle'})</option>`;
        });
        selectCodex.appendChild(grp);
      }
    }

    const btnCodex = document.createElement('button');
    btnCodex.className = "btn btn-primary";
    btnCodex.style.padding = '4px 12px';
    btnCodex.style.fontSize = '0.7rem';
    btnCodex.style.fontWeight = '700';
    btnCodex.style.height = '28px';
    btnCodex.style.whiteSpace = 'nowrap';
    btnCodex.textContent = "Placer au centre 🎯";
    btnCodex.addEventListener('click', () => {
      const val = selectCodex.value;
      if (!val) {
        showNotification("Veuillez choisir une entité", "warning");
        return;
      }
      const firstUnderscore = val.indexOf('_');
      if (firstUnderscore === -1) return;
      const type = val.substring(0, firstUnderscore);
      const id = val.substring(firstUnderscore + 1);

      let entity = null;
      let typeLabel = '';
      if (type === 'pj') {
        entity = db.personnages.find(p => p.id === id);
        typeLabel = 'personnage';
      } else if (type === 'pnj') {
        entity = db.pnjs.find(p => p.id === id);
        typeLabel = 'pnj';
      } else if (type === 'bete') {
        entity = db.betes.find(p => p.id === id);
        typeLabel = 'bete';
      }

      if (entity) {
        const avatar = window.MediaEngine.getEntityImageSrc(entity, typeLabel);
        // Add marker in the center (50%, 50%)
        this.addMarker(50.0, 50.0, avatar, entity.nom || entity.titre || "Jeton");
        selectCodex.value = '';
      }
    });

    codexRow.appendChild(labelCodex);
    codexRow.appendChild(selectCodex);
    codexRow.appendChild(btnCodex);

    container.appendChild(header);
    container.appendChild(iconManager);
    container.appendChild(codexRow);
    container.appendChild(mapWrapper);
  },

  getMapLevelLabel(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('monde') || t.includes('world')) return 'Niveau : Monde 🌍';
    if (t.includes('region') || t.includes('pays')) return 'Niveau : Région 🗺️';
    if (t.includes('ville') || t.includes('village')) return 'Niveau : Ville 🏘️';
    if (t.includes('donjon') || t.includes('ruine')) return 'Niveau : Combat / Tactical ⚔️';
    return 'Niveau : Lieu 📍';
  },

  async promptAddMarker(x, y) {
    // Open a prompt window to choose marker type
    const label = await window.ModalEngine.prompt("Saisissez un nom / label pour le marqueur :", "", { title: "Nouveau marqueur" });
    if (!label) return;

    const iconInput = await window.ModalEngine.prompt(
      "Choisissez une icône D&D :\n" +
      "1 : 📦 (Coffre / Trésor)\n" +
      "2 : ⚔️ (Combat / Ennemi)\n" +
      "3 : 🚪 (Portail / Passage)\n" +
      "4 : 🕸️ (Piège / Danger)\n" +
      "5 : 👿 (Boss / Danger Majeur)\n" +
      "6 : 👤 (PNJ / Rencontre)\n" +
      "7 : 🗣️ (Rumeur / Indice)\n" +
      "Ou saisissez n'importe quel émoji :",
      "📦",
      { title: "Icône du marqueur" }
    );

    if (!iconInput) return;

    let icon = "📦";
    if (iconInput === "1") icon = "📦";
    else if (iconInput === "2") icon = "⚔️";
    else if (iconInput === "3") icon = "🚪";
    else if (iconInput === "4") icon = "🕸️";
    else if (iconInput === "5") icon = "👿";
    else if (iconInput === "6") icon = "👤";
    else if (iconInput === "7") icon = "🗣️";
    else icon = iconInput.trim().substring(0, 4); // Accept custom emojis

    this.addMarker(x, y, icon, label);
  },

  addMarker(x, y, icon, label) {
    const db = AppState.db;
    if (!db || !this.activeLieuId) return;

    const lieu = db.lieux.find(l => l.id === this.activeLieuId);
    if (lieu) {
      if (!lieu.mapMarkers) lieu.mapMarkers = [];
      lieu.mapMarkers.push({
        id: `mark_${Date.now()}`,
        x: parseFloat(x.toFixed(2)),
        y: parseFloat(y.toFixed(2)),
        icon: icon,
        label: label
      });

      window.CampaignEngine.saveDatabase();
      this.renderMap();
      showNotification(`Marqueur "${label}" ajouté !`, "success");
    }
  },

  deleteMarker(markerId) {
    const db = AppState.db;
    if (!db || !this.activeLieuId) return;

    const lieu = db.lieux.find(l => l.id === this.activeLieuId);
    if (lieu && lieu.mapMarkers) {
      lieu.mapMarkers = lieu.mapMarkers.filter(m => m.id !== markerId);
      window.CampaignEngine.saveDatabase();
      this.renderMap();
      showNotification("Marqueur supprimé.", "warning");
    }
  }
};
