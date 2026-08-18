window.WorldEngine = {
  activeCategory: 'pnj',
  searchQuery: '',

  changeCategory(category) {
    this.activeCategory = category;
    const buttons = document.querySelectorAll('.encyclopedia-tab-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
    this.renderEncyclopedia();
  },

  setSearchQuery(query) {
    this.searchQuery = query.toLowerCase().trim();
    this.renderEncyclopedia();
  },

  renderEncyclopedia() {
    const listEl = document.getElementById('encyclopedia-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    const db = AppState.db;
    if (!db) {
      listEl.innerHTML = '<div class="empty-state">Veuillez importer une campagne.</div>';
      return;
    }

    let entities = [];
    const cat = this.activeCategory;

    if (cat === 'regles') {
      if (this.searchQuery) {
        let results = [];
        window.RulesEngine.combatActions.forEach(a => {
          if (a.nom.toLowerCase().includes(this.searchQuery) || a.description.toLowerCase().includes(this.searchQuery)) {
            results.push({ nom: a.nom, desc: a.description, type: 'actions', id: a.id });
          }
        });
        window.RulesEngine.movementRules.forEach(m => {
          if (m.nom.toLowerCase().includes(this.searchQuery) || m.description.toLowerCase().includes(this.searchQuery)) {
            results.push({ nom: m.nom, desc: m.description, type: 'movements', id: m.id });
          }
        });
        window.RulesEngine.conditions.forEach(c => {
          if (c.nom.toLowerCase().includes(this.searchQuery) || c.description.toLowerCase().includes(this.searchQuery)) {
            results.push({ nom: c.nom, desc: c.description, type: 'conditions', id: c.id });
          }
        });
        window.RulesEngine.skills.forEach(s => {
          if (s.nom.toLowerCase().includes(this.searchQuery) || s.description.toLowerCase().includes(this.searchQuery)) {
            results.push({ nom: s.nom, desc: s.description, type: 'skills', id: s.id });
          }
        });
        window.RulesEngine.spells.forEach(s => {
          if (s.nom.toLowerCase().includes(this.searchQuery) || s.description.toLowerCase().includes(this.searchQuery)) {
            results.push({ nom: s.nom, desc: s.description, type: 'spells', id: s.nom });
          }
        });
        window.RulesEngine.items.forEach(i => {
          if (i.nom.toLowerCase().includes(this.searchQuery) || i.description.toLowerCase().includes(this.searchQuery)) {
            results.push({ nom: i.nom, desc: i.description, type: 'items', id: i.nom });
          }
        });
        
        if (results.length === 0) {
          listEl.innerHTML = `<div class="empty-state">Aucune règle ou sort trouvé pour "${this.searchQuery}".</div>`;
          return;
        }
        
        results.forEach(res => {
          const card = document.createElement('div');
          card.className = 'glass-panel card entity-list-item';
          card.style.cursor = 'pointer';
          card.style.padding = '10px 12px';
          card.innerHTML = `
            <div style="font-size:0.55rem; color:var(--color-primary); text-transform:uppercase; font-weight:bold;">
              ${res.type === 'spells' ? 'sorts' : (res.type === 'skills' ? 'compétences' : (res.type === 'movements' ? 'déplacements' : (res.type === 'conditions' ? 'états' : (res.type === 'items' ? 'équipements' : res.type))))}
            </div>
            <strong style="color:#fff; font-size:0.8rem; display:block; margin-top:2px;">${res.nom}</strong>
            <p style="font-size:0.7rem; color:var(--text-dim); margin:2px 0 0 0;">
              ${res.desc.replace(/<[^>]*>/g, '').substring(0, 100)}...
            </p>
          `;
          card.onclick = () => window.RulesEngine.showRuleDetail(res.type, res.id);
          listEl.appendChild(card);
        });
        return;
      } else {
        const subCats = [
          { id: "actions", label: "⚔️ Actions de Combat" },
          { id: "movements", label: "🏃 Déplacements & Mouvement" },
          { id: "conditions", label: "🤢 Altérations & États" },
          { id: "skills", label: "📊 Compétences D&D 5E" },
          { id: "spells", label: "🔮 Grimoire de Sorts (AideDD)" },
          { id: "items", label: "🎒 Équipement & Objets de Base" }
        ];
        
        subCats.forEach(sub => {
          const card = document.createElement('div');
          card.className = 'glass-panel card entity-list-item';
          card.style.cursor = 'pointer';
          card.style.padding = '15px 12px';
          card.innerHTML = `
            <strong style="color:#ffd166; font-size:0.85rem; display:block;">${sub.label}</strong>
          `;
          card.onclick = () => {
            listEl.innerHTML = window.RulesEngine.renderRulesCategory(sub.id);
            const backBtn = document.createElement('button');
            backBtn.className = 'btn btn-secondary';
            backBtn.style.margin = '10px 10px 0 10px';
            backBtn.style.fontSize = '0.72rem';
            backBtn.innerHTML = '← Retour aux Règles';
            backBtn.onclick = () => this.renderEncyclopedia();
            listEl.prepend(backBtn);
          };
          listEl.appendChild(card);
        });
        return;
      }
    }

    if (cat === 'pnj') entities = db.pnjs || [];
    else if (cat === 'lieu') entities = db.lieux || [];
    else if (cat === 'faction') entities = db.factions || [];
    else if (cat === 'objet') entities = db.objets || [];
    else if (cat === 'secret') entities = db.secrets || [];
    else if (cat === 'bete') entities = db.betes || [];
    else if (cat === 'chrono') {
      entities = (db.evenements || []).concat(db.seances || []);
      // Sort chronologically
      entities.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // Filter based on search query
    if (this.searchQuery) {
      entities = entities.filter(e => {
        const name = (e.nom || e.titre || '').toLowerCase();
        const desc = (e.description || e.role || e.resume || '').toLowerCase();
        return name.includes(this.searchQuery) || desc.includes(this.searchQuery);
      });
    }

    if (entities.length === 0) {
      if (cat === 'bete') {
        listEl.innerHTML = `
          <div class="empty-state" style="display:flex; flex-direction:column; align-items:center; gap:12px; padding:20px;">
            <div style="font-size:2rem;">🐾</div>
            <div style="color:var(--text-muted); font-size:0.85rem; text-align:center;">Aucune créature dans le bestiaire.<br>Importez un PDF de bestiaire D&D 5e.</div>
            <label class="btn btn-primary" style="cursor:pointer; display:flex; align-items:center; gap:6px; padding:8px 16px;">
              📄 Importer un bestiaire PDF
              <input type="file" id="bestiary-pdf-input" accept=".pdf" style="display:none;" onchange="window.CampaignEngine.importBestiaryFromPDF(this.files[0])">
            </label>
          </div>
        `;
      } else {
        listEl.innerHTML = `<div class="empty-state">Aucun élément trouvé.</div>`;
      }
      return;
    }

    entities.forEach(entity => {
      const card = document.createElement('div');
      card.className = 'glass-panel card entity-list-item';
      card.style.cursor = 'pointer';
      card.style.padding = '10px 12px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '4px';
      card.style.position = 'relative';

      if (cat === 'pnj' || cat === 'bete' || cat === 'objet') {
        card.setAttribute('draggable', 'true');
        card.addEventListener('dragstart', (e) => {
          const dragData = {
            type: cat,
            id: entity.id
          };
          e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
        });
      }

      // Background preview for places/NPCs/items/beasts
      let bgSrc = '';
      if (cat === 'pnj' || cat === 'lieu' || cat === 'objet' || cat === 'faction' || cat === 'bete') {
        bgSrc = window.MediaEngine.getEntityImageSrc(entity, cat);
      }

      const titleText = entity.nom || entity.titre || 'Sans nom';
      let subText = entity.role || entity.description || entity.type || '';
      if (subText.length > 80) subText = subText.substring(0, 80) + '...';

      let avatarHtml = '';
      if (bgSrc) {
        // Round avatar for PNJ and beasts, rounded square for Factions/Lieux/Objets
        const borderRadius = (cat === 'pnj' || cat === 'bete') ? '50%' : '6px';
        const isInverted = bgSrc.includes('images/icons/');
        avatarHtml = `
          <div style="width:38px; height:38px; border-radius:${borderRadius}; background-image:url('${bgSrc}'); background-size:cover; background-position:center; border:1px solid var(--glass-border); flex-shrink:0; margin-right:4px; filter: ${isInverted ? 'invert(1)' : 'none'};"></div>
        `;
      }

      let actionButtons = `<button class="btn btn-secondary btn-quick-player-show" data-id="${entity.id}" style="padding:2px 6px; font-size:0.7rem; background:rgba(255,255,255,0.08);">👁️ Screen</button>`;
      if (cat === 'lieu') {
        actionButtons = `
          <button class="btn btn-secondary btn-quick-map-activate" data-id="${entity.id}" style="padding:2px 6px; font-size:0.7rem; background:rgba(0,245,212,0.12); border-color:rgba(0,245,212,0.3); color:#00f5d4;">🗺️ Carte</button>
          ${actionButtons}
        `;
      }

      card.innerHTML = `
        <div style="display:flex; gap:10px; align-items:center; width:100%;">
          ${avatarHtml}
          <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <strong style="color:#fff; font-size:0.85rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${titleText}</strong>
              <div style="display:flex; gap:4px; align-items:center; flex-shrink:0;">
                ${actionButtons}
                <button class="btn btn-danger btn-quick-delete" data-id="${entity.id}" style="padding:2px 6px; font-size:0.7rem; background:rgba(220,53,69,0.15); border-color:rgba(220,53,69,0.3); color:#ff6b6b;">🗑️</button>
              </div>
            </div>
            <span style="font-size:0.75rem; color:var(--text-muted); line-height:1.3; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${subText}</span>
          </div>
        </div>
      `;

      // Event Listeners
      card.addEventListener('click', async (e) => {
        if (e.target.closest('.btn-quick-map-activate')) {
          e.stopPropagation();
          window.ContextMapEngine.setActiveLieu(entity.id);
          window.switchCenterTab('map');
        } else if (e.target.closest('.btn-quick-player-show')) {
          e.stopPropagation();
          this.showOnPlayerScreen(cat, entity.id);
        } else if (e.target.closest('.btn-quick-delete')) {
          e.stopPropagation();
          if (await window.ModalEngine.confirm(`Voulez-vous supprimer l'entité "${titleText}" ?`, { title: "Suppression d'entité" })) {
            this.deleteEntity(cat, entity.id);
          }
        } else {
          this.openEntityDetails(cat, entity.id);
        }
      });

      listEl.appendChild(card);
    });
  },

  showOnPlayerScreen(type, id) {
    const db = AppState.db;
    let entity = null;
    if (type === 'pnj') entity = db.pnjs.find(x => x.id === id);
    else if (type === 'lieu') entity = db.lieux.find(x => x.id === id);
    else if (type === 'faction') entity = db.factions.find(x => x.id === id);
    else if (type === 'objet') entity = db.objets.find(x => x.id === id);
    else if (type === 'secret') entity = db.secrets.find(x => x.id === id);
    else if (type === 'personnage') entity = db.personnages.find(x => x.id === id);
    else if (type === 'chrono') {
      entity = db.evenements.find(x => x.id === id) || db.seances.find(x => x.id === id);
    }

    if (!entity) return;

    AppState.playerState.activeEntity = {
      name: entity.nom || entity.titre,
      role: entity.role || (type === 'personnage' ? `${entity.classe || ''} Lvl ${entity.niveau || 1}` : (type === 'lieu' ? `Lieu : ${entity.type}` : (type === 'faction' ? `Faction : ${entity.alignment || 'Neutre'}` : `Type : ${type.toUpperCase()}`))),
      description: entity.description || entity.resume || (type === 'personnage' ? `${entity.histoire || ''}\n${entity.personnalité || ''}\n${entity.notes || ''}`.trim() : 'Pas de description.'),
      avatar: window.MediaEngine.getEntityImageSrc(entity, type)
    };

    if (type === 'lieu') {
      window.ContextMapEngine.setActiveLieu(id);
      AppState.playerState.ambianceImage = window.MediaEngine.getEntityImageSrc(entity, 'lieu');
    }

    if (window.syncPlayerView) {
      window.syncPlayerView();
      showNotification(`"${entity.nom || entity.titre}" envoyé à l'écran joueur !`, "success");
    }
  },

  openEntityDetails(type, id) {
    const db = AppState.db;
    let entity = null;
    
    if (type === 'pnj') entity = db.pnjs.find(x => x.id === id);
    else if (type === 'lieu') entity = db.lieux.find(x => x.id === id);
    else if (type === 'faction') entity = db.factions.find(x => x.id === id);
    else if (type === 'objet') entity = db.objets.find(x => x.id === id);
    else if (type === 'secret') entity = db.secrets.find(x => x.id === id);
    else if (type === 'bete') entity = db.betes.find(x => x.id === id);
    else if (type === 'chrono') {
      entity = db.evenements.find(x => x.id === id) || db.seances.find(x => x.id === id);
    }

    if (!entity) return;

    AppState.activeEntityDetails = { type, entity };

    const modal = document.getElementById('detail-modal');
    const titleEl = document.getElementById('modal-entity-title');
    const detailsEl = document.getElementById('modal-entity-details');

    titleEl.textContent = `Édition : ${entity.nom || entity.titre || 'Nouvel élément'}`;

    let imageUploaderHTML = "";
    if (['pnj', 'lieu', 'objet', 'faction', 'bete'].includes(type)) {
      const imgSrc = window.MediaEngine.getEntityImageSrc(entity, type);
      const isInverted = imgSrc.includes('images/icons/');
      imageUploaderHTML = `
        <div style="display:flex; gap:15px; align-items:center; margin-bottom:15px;">
          <div id="modal-entity-img-preview" style="width:100px; height:100px; border-radius:6px; background-size:cover; background-position:center; background-image:url('${imgSrc}'); border:1px solid var(--glass-border); flex-shrink:0; filter: ${isInverted ? 'invert(1)' : 'none'};"></div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <label class="btn btn-secondary" style="cursor:pointer; padding:6px 12px; font-size:0.8rem; display:inline-block; text-align:center; margin:0;">
              📷 Importer Image
              <input type="file" accept="image/*" style="display:none;" onchange="window.MediaEngine.handleEntityImageUpload('${type}', '${entity.id}', this)">
            </label>
            <button type="button" class="btn btn-secondary" style="padding:6px 12px; font-size:0.8rem; display:inline-block; text-align:center;" onclick="window.IconPickerEngine.openIconPicker('${type}', '${entity.id}')">
              🛡️ Choisir Icône
            </button>
          </div>
        </div>
      `;
    }

    let formHTML = `
      <form id="form-edit-entity" style="display:flex; flex-direction:column; gap:12px;" onsubmit="window.WorldEngine.handleFormSubmit(event)">
        ${imageUploaderHTML}
        
        <div class="form-group">
          <label>Nom / Titre</label>
          <input type="text" id="edit-entity-name" value="${entity.nom || entity.titre || ''}" required>
        </div>
    `;

    if (type === 'pnj') {
      formHTML += `
        <div class="form-group">
          <label>Rôle / Fonction</label>
          <input type="text" id="edit-entity-role" value="${entity.role || ''}">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="edit-entity-desc" rows="3">${entity.description || ''}</textarea>
        </div>
        <div class="form-group">
          <label>Faction</label>
          <select id="edit-entity-faction">
            <option value="">-- Aucune --</option>
            ${(db.factions || []).map(f => `<option value="${f.id}" ${entity.faction === f.id ? 'selected' : ''}>${f.nom}</option>`).join('')}
          </select>
        </div>
      `;
    } else if (type === 'lieu') {
      formHTML += `
        <div class="form-group">
          <label>Type de Lieu (ex: village, donjon, taverne)</label>
          <input type="text" id="edit-entity-type" value="${entity.type || ''}">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="edit-entity-desc" rows="3">${entity.description || ''}</textarea>
        </div>
      `;
    } else if (type === 'faction') {
      formHTML += `
        <div class="form-group">
          <label>Alignement</label>
          <input type="text" id="edit-entity-alignment" value="${entity.alignment || ''}">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="edit-entity-desc" rows="3">${entity.description || ''}</textarea>
        </div>
      `;
    } else if (type === 'objet') {
      formHTML += `
        <div class="form-group">
          <label>Type d'Objet</label>
          <input type="text" id="edit-entity-type" value="${entity.type || ''}">
        </div>
        <div class="form-group">
          <label>Possesseur</label>
          <select id="edit-entity-possesseur">
            <option value="">-- Non possédé --</option>
            ${(db.pnjs || []).map(p => `<option value="${p.id}" ${entity.possesseur === p.id ? 'selected' : ''}>PNJ : ${p.nom}</option>`).join('')}
            ${(db.personnages || []).map(pj => `<option value="${pj.id}" ${entity.possesseur === pj.id ? 'selected' : ''}>PJ : ${pj.nom}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Description & Propriétés</label>
          <textarea id="edit-entity-desc" rows="3">${entity.description || ''}</textarea>
        </div>
      `;
    } else if (type === 'secret') {
      formHTML += `
        <div class="form-group">
          <label>Statut</label>
          <select id="edit-entity-status">
            <option value="non-decouvert" ${!entity.decouverte ? 'selected' : ''}>Caché / Non résolu</option>
            <option value="decouvert" ${entity.decouverte ? 'selected' : ''}>Découvert / Résolu</option>
          </select>
        </div>
        <div class="form-group">
          <label>Révélation / Description</label>
          <textarea id="edit-entity-desc" rows="3">${entity.description || ''}</textarea>
        </div>
      `;
    } else if (type === 'bete') {
      formHTML += `
        <div class="form-group">
          <label>Classification / Type de Bête</label>
          <input type="text" id="edit-entity-role" value="${entity.role || ''}">
        </div>
        <div class="form-group">
          <label>Description & Capacités</label>
          <textarea id="edit-entity-desc" rows="3">${entity.description || ''}</textarea>
        </div>
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px;">
          <div class="form-group">
            <label>PV Max</label>
            <input type="number" id="edit-entity-hp" value="${entity.pointsVieMax || 10}">
          </div>
          <div class="form-group">
            <label>CA</label>
            <input type="number" id="edit-entity-ca" value="${entity.ca || 10}">
          </div>
          <div class="form-group">
            <label>Initiative</label>
            <input type="text" id="edit-entity-init" value="${entity.initiative || '+0'}">
          </div>
        </div>
      `;
    } else if (type === 'chrono') {
      const isSeance = db.seances.some(s => s.id === id);
      formHTML += `
        <div class="form-group">
          <label>Date (AAAA-MM-JJ)</label>
          <input type="text" id="edit-entity-date" value="${entity.date || ''}">
        </div>
        <div class="form-group">
          <label>${isSeance ? 'Résumé Narratif' : 'Description'}</label>
          <textarea id="edit-entity-desc" rows="4">${entity.description || entity.resume || ''}</textarea>
        </div>
      `;
    }

    let extraButtonsHTML = "";
    if (type === 'lieu') {
      extraButtonsHTML = `<button type="button" class="btn btn-secondary" style="background:rgba(0,245,212,0.12); border-color:rgba(0,245,212,0.3); color:#00f5d4;" onclick="window.ContextMapEngine.setActiveLieu('${entity.id}'); window.switchCenterTab('map'); document.getElementById('detail-modal').classList.remove('active');">🎯 Activer Carte</button>`;
    }

    formHTML += `
        <div style="display:flex; gap:10px; margin-top:15px; justify-content:flex-end;">
          ${extraButtonsHTML}
          <button type="button" class="btn btn-secondary" onclick="window.WorldEngine.showOnPlayerScreen('${type}', '${entity.id}')">👁️ Afficher Joueur</button>
          <button type="submit" class="btn btn-primary">💾 Sauvegarder</button>
        </div>
      </form>
    `;

    detailsEl.innerHTML = formHTML;
    modal.classList.add('active');
  },

  handleFormSubmit(e) {
    e.preventDefault();
    if (!AppState.activeEntityDetails) return;

    const { type, entity } = AppState.activeEntityDetails;
    const db = AppState.db;

    const newName = document.getElementById('edit-entity-name').value.trim();
    if (!newName) return;

    if (type === 'chrono' && db.seances.some(s => s.id === entity.id)) {
      entity.titre = newName;
    } else {
      entity.nom = newName;
      entity.titre = newName;
    }

    // Extraction des champs selon le type
    if (type === 'pnj') {
      entity.role = document.getElementById('edit-entity-role').value.trim();
      entity.description = document.getElementById('edit-entity-desc').value.trim();
      entity.faction = document.getElementById('edit-entity-faction').value;
    } else if (type === 'bete') {
      entity.role = document.getElementById('edit-entity-role').value.trim();
      entity.description = document.getElementById('edit-entity-desc').value.trim();
      entity.pointsVieMax = parseInt(document.getElementById('edit-entity-hp').value) || 10;
      entity.pointsVie = entity.pointsVieMax;
      entity.ca = parseInt(document.getElementById('edit-entity-ca').value) || 10;
      entity.initiative = document.getElementById('edit-entity-init').value.trim();
    } else if (type === 'lieu') {
      entity.type = document.getElementById('edit-entity-type').value.trim();
      entity.description = document.getElementById('edit-entity-desc').value.trim();
    } else if (type === 'faction') {
      entity.alignment = document.getElementById('edit-entity-alignment').value.trim();
      entity.description = document.getElementById('edit-entity-desc').value.trim();
    } else if (type === 'objet') {
      entity.type = document.getElementById('edit-entity-type').value.trim();
      entity.possesseur = document.getElementById('edit-entity-possesseur').value;
      entity.description = document.getElementById('edit-entity-desc').value.trim();
    } else if (type === 'secret') {
      entity.decouverte = document.getElementById('edit-entity-status').value === 'decouvert';
      entity.description = document.getElementById('edit-entity-desc').value.trim();
    } else if (type === 'chrono') {
      entity.date = document.getElementById('edit-entity-date').value.trim();
      const descVal = document.getElementById('edit-entity-desc').value.trim();
      if (db.seances.some(s => s.id === entity.id)) {
        entity.resume = descVal;
      } else {
        entity.description = descVal;
      }
    }

    window.CampaignEngine.saveDatabase();
    
    // Auto-generate pixelart for manually created or updated entities if missing
    if (['pnj', 'objet', 'bete'].includes(type) && !entity.image) {
      let prefix = "fantasy character portrait";
      if (type === 'objet') prefix = "fantasy item icon";
      if (type === 'bete') prefix = "fantasy monster portrait";
      
      const itemToGenerate = [{
        type: type,
        entity: entity,
        prompt: `8-bit retro pixel art ${prefix} of ${entity.nom}, description: ${entity.description || ''}, video game sprite, clean pixel details, dark background`
      }];
      
      setTimeout(() => {
        if (window.CampaignEngine && typeof window.CampaignEngine.autoGeneratePixelArtForList === 'function') {
          window.CampaignEngine.autoGeneratePixelArtForList(itemToGenerate);
        }
      }, 500);
    }

    showNotification("Entité mise à jour !", "success");
    document.getElementById('detail-modal').classList.remove('active');
  },

  createNewEntityPrompt() {
    const cat = this.activeCategory;
    if (cat === 'chrono') {
      showNotification("Pour ajouter un événement, utilisez le formulaire central de Séance.", "info");
      return;
    }

    const db = AppState.db;
    if (!db) return;

    const id = `${cat}_custom_${Date.now()}`;
    let newEntity = { id: id, nom: `Nouveau ${cat.toUpperCase()}`, titre: `Nouveau ${cat.toUpperCase()}` };

    if (cat === 'pnj') {
      newEntity.role = "Nouveau PNJ";
      newEntity.description = "";
      newEntity.faction = "";
      newEntity.image = "";
      newEntity.relations = [];
      db.pnjs.push(newEntity);
    } else if (cat === 'lieu') {
      newEntity.type = "village";
      newEntity.description = "";
      newEntity.images = [];
      db.lieux.push(newEntity);
    } else if (cat === 'faction') {
      newEntity.alignment = "neutre";
      newEntity.description = "";
      newEntity.membres = [];
      db.factions.push(newEntity);
    } else if (cat === 'objet') {
      newEntity.type = "objet";
      newEntity.possesseur = "";
      newEntity.description = "";
      newEntity.image = "";
      db.objets.push(newEntity);
    } else if (cat === 'secret') {
      newEntity.decouverte = false;
      newEntity.description = "";
      db.secrets.push(newEntity);
    } else if (cat === 'bete') {
      newEntity.role = "Bête / Monstre";
      newEntity.description = "";
      newEntity.image = "";
      newEntity.pointsVieMax = 10;
      newEntity.pointsVie = 10;
      newEntity.ca = 10;
      newEntity.initiative = "+0";
      db.betes.push(newEntity);
    }

    window.CampaignEngine.saveDatabase();
    this.openEntityDetails(cat, id);
  },

  deleteEntity(type, id) {
    const db = AppState.db;
    if (!db) return;

    if (type === 'pnj') db.pnjs = db.pnjs.filter(x => x.id !== id);
    else if (type === 'bete') db.betes = db.betes.filter(x => x.id !== id);
    else if (type === 'lieu') db.lieux = db.lieux.filter(x => x.id !== id);
    else if (type === 'faction') db.factions = db.factions.filter(x => x.id !== id);
    else if (type === 'objet') db.objets = db.objets.filter(x => x.id !== id);
    else if (type === 'secret') db.secrets = db.secrets.filter(x => x.id !== id);
    else if (type === 'chrono') {
      db.evenements = db.evenements.filter(x => x.id !== id);
      db.seances = db.seances.filter(x => x.id !== id);
    }

    window.CampaignEngine.saveDatabase();
    showNotification("Entité supprimée !", "warning");
  }
};
