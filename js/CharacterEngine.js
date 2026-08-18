window.CharacterEngine = {
  renderPlayers() {
    const container = document.getElementById('players-list');
    if (!container) return;
    container.innerHTML = "";
    
    const db = AppState.db;
    if (!db || !db.personnages || db.personnages.length === 0) {
      container.innerHTML = '<div class="empty-state">Aucun personnage joueur. Cliquez sur + ou importez un XML.</div>';
      return;
    }
    
    db.personnages.forEach(pj => {
      // Assurer les valeurs par défaut pour les anciens PJ
      if (pj.ca === undefined) pj.ca = 10;
      if (pj.initiative === undefined) pj.initiative = "+0";
      if (!Array.isArray(pj.etats)) pj.etats = [];
      if (!Array.isArray(pj.favoris)) pj.favoris = [];
      if (pj.pointsVieMax === undefined) pj.pointsVieMax = pj.pointsVie || 10;
      if (pj.xp === undefined) pj.xp = "";
      if (pj.gp === undefined) pj.gp = 0;
      if (pj.xmlFilename === undefined) pj.xmlFilename = `${pj.nom}.xml`;
      if (!pj.attributs) {
        pj.attributs = [
          { nom: "Force", valeur: 10 },
          { nom: "Dextérité", valeur: 10 },
          { nom: "Constitution", valeur: 10 },
          { nom: "Intelligence", valeur: 10 },
          { nom: "Sagesse", valeur: 10 },
          { nom: "Charisme", valeur: 10 }
        ];
      }
      
      const card = document.createElement('div');
      card.className = 'glass-panel card player-card';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '8px';
      card.style.padding = '12px';
      card.style.marginBottom = '10px';
      
      card.setAttribute('draggable', 'true');
      card.addEventListener('dragstart', (e) => {
        const dragData = {
          type: 'personnage',
          id: pj.id
        };
        e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
      });
      
      const imgSrc = window.MediaEngine.getEntityImageSrc(pj, 'personnage');
      const statesHtml = pj.etats.map(state => `<span class="badge" style="background:#d90429; color:#fff; font-size:0.65rem; padding:2px 6px; border-radius:3px;">${state}</span>`).join("");
      const favsHtml = pj.favoris.map(fav => `<div style="font-size:0.75rem; color:#ffd166; font-weight:600; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.03); padding:2px 0;"><span>⭐ ${fav}</span><button class="btn" style="padding:0; font-size:0.7rem; color:#ff6b6b;" onclick="window.CharacterEngine.removeFavorite('${pj.id}', '${fav}')">✕</button></div>`).join("");
      
      card.innerHTML = `
        <div style="display:flex; gap:10px; align-items:center;">
          <div style="width:42px; height:42px; border-radius:50%; background-image:url('${imgSrc}'); background-size:cover; background-position:center; border:2px solid var(--color-primary); flex-shrink:0; filter: ${imgSrc.includes('images/icons/') ? 'invert(1)' : 'none'};"></div>
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="color:#fff; font-size:0.85rem; cursor:pointer;" onclick="window.CharacterEngine.openPlayerModal('${pj.id}')">${pj.nom}</strong>
              <span style="font-size:0.7rem; color:var(--text-dim);">${pj.classe} Lvl ${pj.niveau}</span>
            </div>
            <div style="display:flex; gap:8px; font-size:0.7rem; color:var(--text-muted); margin-top:2px;">
              <span>🛡️ CA: ${pj.ca}</span>
              <span>⚡ Ini: ${pj.initiative}</span>
            </div>
          </div>
        </div>
        
        <!-- Points de vie -->
        <div style="display:flex; align-items:center; gap:8px; font-size:0.75rem;">
          <span style="color:var(--text-dim); font-size:0.65rem; font-weight:700; text-transform:uppercase;">Vie :</span>
          <input type="number" value="${pj.pointsVie}" style="width:40px; background:rgba(0,0,0,0.3); border:1px solid var(--glass-border); color:#fff; border-radius:4px; text-align:center; padding:1px 2px; font-size:0.75rem;" onchange="window.CharacterEngine.updatePlayerHP('${pj.id}', this.value)">
          <span style="color:var(--text-dim);">/</span>
          <span style="color:#fff; font-weight:700;">${pj.pointsVieMax}</span>
          <div style="flex:1; height:5px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden;">
            <div style="width:${Math.min(100, Math.max(0, (pj.pointsVie / pj.pointsVieMax) * 100))}%; height:100%; background:linear-gradient(90deg, #d90429, #ef233c);"></div>
          </div>
        </div>

        <!-- États -->
        ${pj.etats.length > 0 ? `<div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:2px;">${statesHtml}</div>` : ''}
        
        <!-- Favoris -->
        ${pj.favoris.length > 0 ? `<div style="display:flex; flex-direction:column; gap:2px; padding:6px; background:rgba(255,255,255,0.02); border-radius:4px; margin-top:2px; border-left:2px solid #ffd166;">${favsHtml}</div>` : ''}
        
        <!-- Saisie rapide de favoris -->
        <div style="display:flex; gap:6px; margin-top:4px;">
          <input type="text" placeholder="Ajouter favori (ex: Arcanes +4)" id="fav-input-${pj.id}" style="flex:1; padding:2px 6px; font-size:0.7rem; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border); color:#fff; border-radius:3px;">
          <button class="btn btn-secondary" style="padding:2px 6px; font-size:0.7rem;" onclick="window.CharacterEngine.addFavoritePrompt('${pj.id}')">⭐ Pin</button>
        </div>

        <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:4px; border-top:1px solid rgba(255,255,255,0.03); padding-top:4px;">
          <button class="btn btn-secondary" style="padding:2px 8px; font-size:0.65rem; background:rgba(255,255,255,0.08);" onclick="window.WorldEngine.showOnPlayerScreen('personnage', '${pj.id}')">👁️ Screen</button>
          <button class="btn btn-secondary" style="padding:2px 8px; font-size:0.65rem;" onclick="window.CharacterEngine.openPlayerModal('${pj.id}')">⚙️ Fiche</button>
          <button class="btn btn-danger" style="padding:2px 8px; font-size:0.65rem; background:rgba(220,53,69,0.1); border-color:rgba(220,53,69,0.2); color:#ff6b6b;" onclick="window.CharacterEngine.deletePlayer('${pj.id}')">🗑️ Suppr</button>
        </div>
      `;
      container.appendChild(card);
    });
  },

  updatePlayerHP(id, val) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (pj) {
      pj.pointsVie = Math.min(pj.pointsVieMax, Math.max(0, parseInt(val) || 0));
      
      // Sync with active combatant if PJ is in combat
      if (window.CombatEngine) {
        const state = window.CombatEngine.getState();
        if (state && state.combatants) {
          const combatant = state.combatants.find(c => c.id === id);
          if (combatant) {
            combatant.hp = pj.pointsVie;
            window.CombatEngine.saveState();
            window.CombatEngine.renderCombatTab();
          }
        }
      }
      
      window.CampaignEngine.saveDatabase();
    }
  },

  addFavoritePrompt(id) {
    const input = document.getElementById(`fav-input-${id}`);
    if (!input) return;
    const text = input.value.trim();
    if (text) {
      this.addFavorite(id, text);
      input.value = "";
    }
  },

  addFavorite(id, text) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (pj) {
      if (!pj.favoris) pj.favoris = [];
      if (!pj.favoris.includes(text)) {
        pj.favoris.push(text);
        window.CampaignEngine.saveDatabase();
        showNotification("Favori épinglé !", "success");
      }
    }
  },

  removeFavorite(id, text) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (pj) {
      pj.favoris = pj.favoris.filter(x => x !== text);
      window.CampaignEngine.saveDatabase();
    }
  },

  createNewPlayer() {
    const db = AppState.db;
    if (!db) return;

    const id = `pj_${Date.now()}`;
    const newPJ = {
      id: id,
      nom: "Nouveau Héros",
      classe: "Guerrier",
      niveau: 1,
      pointsVie: 12,
      pointsVieMax: 12,
      ca: 10,
      initiative: "+0",
      joueurId: "",
      image: "",
      attributs: [
        { nom: "Force", valeur: 10 },
        { nom: "Dextérité", valeur: 10 },
        { nom: "Constitution", valeur: 10 },
        { nom: "Intelligence", valeur: 10 },
        { nom: "Sagesse", valeur: 10 },
        { nom: "Charisme", valeur: 10 }
      ],
      etats: [],
      favoris: [],
      compétences: "",
      sorts: [],
      inventaire: [],
      personnalité: "",
      histoire: "",
      relations: "",
      notes: "",
      progression: ""
    };

    db.personnages.push(newPJ);
    window.CampaignEngine.saveDatabase();
    this.openPlayerModal(id);
  },

  deletePlayer(id) {
    const db = AppState.db;
    if (!db) return;

    db.personnages = db.personnages.filter(x => x.id !== id);
    window.CampaignEngine.saveDatabase();
    showNotification("Personnage supprimé.", "warning");
  },

  importPlayerXML(fileInput) {
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      
      reader.onload = function(e) {
        try {
          const xmlText = e.target.result;
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, "text/xml");
          
          if (xmlDoc.querySelector("parsererror")) {
            throw new Error("Erreur de parsing XML.");
          }
          
          const name = xmlDoc.querySelector("name")?.textContent?.trim() || "Nouveau PJ XML";
          const race = xmlDoc.querySelector("race")?.textContent?.trim() || "Humain";
          const characterClass = xmlDoc.querySelector("class")?.textContent?.trim() || "Guerrier";
          const level = parseInt(xmlDoc.querySelector("level")?.textContent || "1");
          
          // Caractéristiques
          const str = parseInt(xmlDoc.querySelector("str")?.textContent || "10");
          const dex = parseInt(xmlDoc.querySelector("dex")?.textContent || "10");
          const con = parseInt(xmlDoc.querySelector("con")?.textContent || "10");
          const int = parseInt(xmlDoc.querySelector("int")?.textContent || "10");
          const wis = parseInt(xmlDoc.querySelector("wis")?.textContent || "10");
          const cha = parseInt(xmlDoc.querySelector("cha")?.textContent || "10");
          
          const attributes = [
            { nom: "Force", valeur: str },
            { nom: "Dextérité", valeur: dex },
            { nom: "Constitution", valeur: con },
            { nom: "Intelligence", valeur: int },
            { nom: "Sagesse", valeur: wis },
            { nom: "Charisme", valeur: cha }
          ];

          // Somme des HP
          let hp = 0;
          xmlDoc.querySelectorAll("hp_brut").forEach(el => {
            hp += parseInt(el.textContent || "0");
          });
          if (hp === 0) hp = 10;

          const dexMod = Math.floor((dex - 10) / 2);
          const ca = 10 + dexMod;

          const backstory = xmlDoc.querySelector("backstory")?.textContent?.trim() || "";
          const appearance = xmlDoc.querySelector("appearance")?.textContent?.trim() || "";
          const traits = xmlDoc.querySelector("traits")?.textContent?.trim() || "";
          const ideals = xmlDoc.querySelector("ideals")?.textContent?.trim() || "";
          const flaws = xmlDoc.querySelector("flaws")?.textContent?.trim() || "";
          const bonds = xmlDoc.querySelector("bonds")?.textContent?.trim() || "";

          // Sorts
          const spells = [];
          xmlDoc.querySelectorAll("knownSpell, innateSpell").forEach(el => {
            const spellName = el.textContent?.trim();
            if (spellName) spells.push(spellName);
          });

          // Inventaire
          const inventory = [];
          const itemX = xmlDoc.querySelector("itemX")?.textContent?.trim();
          if (itemX) {
            itemX.split(",").forEach(item => {
              const trimmed = item.trim();
              if (trimmed) inventory.push(trimmed);
            });
          }

          const xp = xmlDoc.querySelector("xp")?.textContent?.trim() || "";
          const gp = parseInt(xmlDoc.querySelector("gp")?.textContent || "0");

          // Parse skills from XML
          const DND_SKILLS_LIST = [
            "Athlétisme", "Acrobaties", "Escamotage", "Discrétion",
            "Arcanes", "Histoire", "Investigation", "Nature", "Religion",
            "Dressage", "Intuition", "Médecine", "Perception", "Survie",
            "Tromperie", "Intimidation", "Représentation", "Persuasion"
          ];
          const masteredSkills = [];
          xmlDoc.querySelectorAll("skillsProf").forEach(el => {
            const val = el.textContent?.trim();
            if (val) {
              val.split(',').forEach(idStr => {
                const idx = parseInt(idStr.trim());
                if (!isNaN(idx) && idx >= 0 && idx < DND_SKILLS_LIST.length) {
                  const skillName = DND_SKILLS_LIST[idx];
                  if (!masteredSkills.includes(skillName)) {
                    masteredSkills.push(skillName);
                  }
                }
              });
            }
          });

          // Parse tools as custom skills
          const toolsStr = Array.from(xmlDoc.querySelectorAll("toolsProf"))
            .map(el => el.textContent?.trim())
            .filter(t => t)
            .join(", ");
          
          const customSkills = [];
          if (toolsStr) {
            toolsStr.split(',').forEach(tool => {
              const cleanTool = tool.trim();
              if (cleanTool) {
                customSkills.push({
                  nom: cleanTool,
                  attr: "Dextérité",
                  description: "Maîtrise d'outil importée depuis la fiche XML."
                });
                if (!masteredSkills.includes(cleanTool)) {
                  masteredSkills.push(cleanTool);
                }
              }
            });
          }

          const newPJ = {
            id: `pj_xml_${Date.now()}`,
            nom: name,
            classe: `${race} ${characterClass}`,
            niveau: level,
            xp: xp,
            gp: gp,
            pointsVie: hp,
            pointsVieMax: hp,
            ca: ca,
            initiative: (dexMod >= 0 ? `+${dexMod}` : `${dexMod}`),
            joueurId: "",
            image: "",
            attributs: attributes,
            etats: [],
            favoris: [],
            compétences: toolsStr,
            competencesMaitrisees: masteredSkills,
            competencesPersonnalisees: customSkills,
            sorts: spells,
            inventaire: inventory,
            personnalité: traits + (ideals ? " Idéal: " + ideals : "") + (flaws ? " Défaut: " + flaws : ""),
            histoire: backstory + (appearance ? " Apparence: " + appearance : ""),
            relations: bonds ? `Liens : ${bonds}` : "",
            notes: `Langues : ${xmlDoc.querySelector("languages")?.textContent?.trim() || "commun"}`,
            progression: "",
            xmlFilename: file.name
          };

          const db = AppState.db;
          if (db) {
            db.personnages.push(newPJ);
            window.CampaignEngine.saveDatabase();
            showNotification(`PJ "${name}" importé avec succès !`, "success");
          }
        } catch (err) {
          console.error(err);
          showNotification("Erreur lors de l'importation XML : " + err.message, "error");
        }
      };
      reader.readAsText(file);
    }
  },

  openPlayerModal(id) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (!pj) return;

    // Assurer les valeurs par défaut
    if (pj.ca === undefined) pj.ca = 10;
    if (pj.initiative === undefined) pj.initiative = "+0";
    if (pj.pointsVieMax === undefined) pj.pointsVieMax = pj.pointsVie || 10;
    if (!Array.isArray(pj.etats)) pj.etats = [];
    if (!Array.isArray(pj.favoris)) pj.favoris = [];
    
    if (!pj.competencesMaitrisees) pj.competencesMaitrisees = [];
    if (!pj.competencesPersonnalisees) pj.competencesPersonnalisees = [];

    // Auto-migrer l'ancienne chaîne de compétences (outils) vers les compétences personnalisées
    if (pj.compétences && pj.competencesPersonnalisees.length === 0) {
      pj.compétences.split(',').forEach(tool => {
        const cleanTool = tool.trim();
        if (cleanTool) {
          pj.competencesPersonnalisees.push({
            nom: cleanTool,
            attr: "Dextérité",
            description: "Maîtrise d'outil importée."
          });
          if (!pj.competencesMaitrisees.includes(cleanTool)) {
            pj.competencesMaitrisees.push(cleanTool);
          }
        }
      });
      window.CampaignEngine.saveDatabase();
    }
    if (pj.xp === undefined) pj.xp = "";
    if (pj.gp === undefined) pj.gp = 0;
    if (pj.xmlFilename === undefined) pj.xmlFilename = `${pj.nom}.xml`;
    if (!pj.attributs) {
      pj.attributs = [
        { nom: "Force", valeur: 10 },
        { nom: "Dextérité", valeur: 10 },
        { nom: "Constitution", valeur: 10 },
        { nom: "Intelligence", valeur: 10 },
        { nom: "Sagesse", valeur: 10 },
        { nom: "Charisme", valeur: 10 }
      ];
    }

    AppState.activeEntityDetails = { type: 'personnage', entity: pj };

    const modal = document.getElementById('player-modal');
    if (!modal) return;

    const modalTitle = document.getElementById('player-modal-title');
    const modalBody = document.getElementById('player-modal-body');

    modalTitle.textContent = `Fiche Personnage : ${pj.nom}`;

    const imgSrc = window.MediaEngine.getEntityImageSrc(pj, 'personnage');
    const profBonus = Math.floor((pj.niveau - 1) / 4) + 2;
    const damageFormula = this.getPlayerDamageFormula(pj);

    if (!this.activeModalTab) {
      this.activeModalTab = "combat";
    }

    modalBody.innerHTML = `
      <!-- sub tabs header -->
      <div class="modal-tabs">
        <button class="modal-tab-btn ${this.activeModalTab === 'combat' ? 'active' : ''}" id="btn-tab-combat" onclick="window.CharacterEngine.switchModalTab('combat')">⚔️ Combat & Actions</button>
        <button class="modal-tab-btn ${this.activeModalTab === 'stats' ? 'active' : ''}" id="btn-tab-stats" onclick="window.CharacterEngine.switchModalTab('stats')">📊 Stats & Compétences</button>
        <button class="modal-tab-btn ${this.activeModalTab === 'inventaire' ? 'active' : ''}" id="btn-tab-inventaire" onclick="window.CharacterEngine.switchModalTab('inventaire')">🎒 Inventaire</button>
        <button class="modal-tab-btn ${this.activeModalTab === 'grimoire' ? 'active' : ''}" id="btn-tab-grimoire" onclick="window.CharacterEngine.switchModalTab('grimoire')">🔮 Grimoire</button>
        <button class="modal-tab-btn ${this.activeModalTab === 'lore' ? 'active' : ''}" id="btn-tab-lore" onclick="window.CharacterEngine.switchModalTab('lore')">📖 Lore & RP</button>
      </div>

      <!-- Tab 1: Combat & Actions -->
      <div id="modal-tab-combat" class="modal-tab-content" style="display: ${this.activeModalTab === 'combat' ? 'flex' : 'none'}; flex-direction:column; gap:15px; width:100%;">
        <div style="display:grid; grid-template-columns: 200px 1fr; gap:20px;">
          <!-- Left Column -->
          <div style="display:flex; flex-direction:column; gap:12px; border-right:1px solid var(--glass-border); padding-right:15px;">
            <div id="modal-entity-img-preview" style="width:100%; height:150px; border-radius:6px; background-image:url('${imgSrc}'); background-size:cover; background-position:center; border:1px solid var(--glass-border); filter: ${imgSrc.includes('images/icons/') ? 'invert(1)' : 'none'};"></div>
            
            <label class="btn btn-secondary" style="cursor:pointer; font-size:0.75rem; text-align:center; padding:4px; margin:0;">
              📷 Importer Portrait
              <input type="file" accept="image/*" style="display:none;" onchange="window.MediaEngine.handleEntityImageUpload('personnage', '${pj.id}', this)">
            </label>

            <button type="button" class="btn btn-secondary" style="font-size:0.75rem; text-align:center; padding:4px;" onclick="window.IconPickerEngine.openIconPicker('personnage', '${pj.id}')">
              🛡️ Choisir Icône
            </button>

            <!-- HP Control Panel -->
            <div style="border:1px solid var(--glass-border); padding:8px; border-radius:6px; background:rgba(0,0,0,0.15); display:flex; flex-direction:column; gap:6px; margin-top:5px;">
              <strong style="font-size:0.7rem; color:#ff6b6b; text-transform:uppercase; letter-spacing:0.5px;">Points de Vie</strong>
              <div style="display:flex; align-items:center; gap:8px;">
                <input type="number" id="hp-input-${pj.id}" value="${pj.pointsVie}" style="width:50px; text-align:center;" onchange="window.CharacterEngine.updatePlayerHP('${pj.id}', this.value)">
                <span style="color:var(--text-dim);">/</span>
                <strong style="color:#fff;">${pj.pointsVieMax}</strong>
              </div>
              <div style="display:flex; gap:4px; margin-top:2px;">
                <button class="btn-hp-adj" onclick="window.CharacterEngine.adjustPlayerHP('${pj.id}', -5)">-5</button>
                <button class="btn-hp-adj" onclick="window.CharacterEngine.adjustPlayerHP('${pj.id}', -1)">-1</button>
                <button class="btn-hp-adj" onclick="window.CharacterEngine.adjustPlayerHP('${pj.id}', 1)">+1</button>
                <button class="btn-hp-adj" onclick="window.CharacterEngine.adjustPlayerHP('${pj.id}', 5)">+5</button>
              </div>
            </div>
          </div>

          <!-- Right Column -->
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; margin-bottom:5px;">
              <!-- CA Shield -->
              <div class="dnd-stat-shield" style="border-color:#ffd166;">
                <span class="dnd-stat-label">CA</span>
                <input type="number" value="${pj.ca}" style="width:50px; text-align:center; border:none; background:transparent; font-size:1.4rem; font-weight:bold; color:#fff; outline:none; font-family:var(--font-title);" onchange="window.CharacterEngine.updatePlayerCA('${pj.id}', this.value)">
                <span style="font-size:0.55rem; color:var(--text-dim); margin-top:2px; text-transform:uppercase;">Classe Armure</span>
              </div>
              <!-- Initiative -->
              <div class="dnd-stat-shield" style="border-color:#4cc9f0;">
                <span class="dnd-stat-label">Initiative</span>
                <input type="text" value="${pj.initiative}" style="width:50px; text-align:center; border:none; background:transparent; font-size:1.4rem; font-weight:bold; color:#fff; outline:none; font-family:var(--font-title);" onchange="window.CharacterEngine.updatePlayerInitiative('${pj.id}', this.value)">
                <button class="btn" style="padding:1px 4px; font-size:0.6rem; color:#4cc9f0; text-decoration:underline;" onclick="window.CharacterEngine.rollManualDice('${pj.id}', 'Initiative', window.CharacterEngine.parseModifier('${pj.initiative}'))">🎲 Jet</button>
              </div>
              <!-- Vitesse -->
              <div class="dnd-stat-shield" style="border-color:#06d6a0;">
                <span class="dnd-stat-label">Vitesse</span>
                <span class="dnd-stat-mod" style="font-size:1.3rem;">9 m</span>
                <span style="font-size:0.55rem; color:var(--text-dim); margin-top:2px; text-transform:uppercase;">Déplacement</span>
              </div>
              <!-- Dégâts -->
              <div class="dnd-stat-shield" style="border-color:#ff595e;">
                <span class="dnd-stat-label">Dégâts</span>
                <span class="dnd-stat-mod" style="font-size:1.1rem; font-weight:bold; color:#fff; line-height: 1.8rem;" id="stat-damage-${pj.id}">${damageFormula}</span>
                <button class="btn" style="padding:1px 4px; font-size:0.6rem; color:#ff595e; text-decoration:underline;" onclick="window.CharacterEngine.rollPlayerWeaponDamage('${pj.id}')">🎲 Jet</button>
              </div>
            </div>

            <div class="form-row-2" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
              <div class="form-group">
                <label>Nom du Personnage</label>
                <input type="text" value="${pj.nom}" onchange="window.CharacterEngine.updatePlayerName('${pj.id}', this.value)">
              </div>
              <div class="form-group">
                <label>Classe & Race</label>
                <input type="text" value="${pj.classe}" onchange="window.CharacterEngine.updatePlayerClass('${pj.id}', this.value)">
              </div>
            </div>

            <div class="form-row-2" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
              <div class="form-group">
                <label>Niveau</label>
                <input type="number" value="${pj.niveau}" onchange="window.CharacterEngine.updatePlayerLevel('${pj.id}', this.value)">
              </div>
              <div class="form-group">
                <label>Lier à un Joueur (ID)</label>
                <select onchange="window.CharacterEngine.updatePlayerLink('${pj.id}', this.value)">
                  <option value="">-- Aucun --</option>
                  ${(db.joueurs || []).map(j => `<option value="${j.id}" ${pj.joueurId === j.id ? 'selected' : ''}>${j.nom}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="form-row-2" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
              <div class="form-group">
                <label>Expérience (XP)</label>
                <input type="text" value="${pj.xp || ''}" placeholder="ex: 1200" onchange="window.CharacterEngine.updatePlayerXP('${pj.id}', this.value)">
              </div>
              <div class="form-group">
                <label>Or (GP)</label>
                <input type="number" value="${pj.gp || 0}" onchange="window.CharacterEngine.updatePlayerGP('${pj.id}', this.value)">
              </div>
            </div>

            <!-- Equipped Gear Panel -->
            <div style="border:1px solid var(--glass-border); padding:8px; border-radius:6px; background:rgba(0,0,0,0.15); display:flex; flex-direction:column; gap:6px; margin-bottom:5px;">
              <strong style="font-size:0.75rem; color:#ffd166; display:flex; align-items:center; gap:6px;">⚔️ Équipement Équipé</strong>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:0.72rem;">
                <!-- Arme -->
                <div style="display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.03); padding:4px 8px; border-radius:4px; border-left:2px solid #ff6b6b;">
                  <span style="font-size:0.9rem;" title="Arme active">🪓</span>
                  <div style="flex:1;">
                    <div style="font-size:0.55rem; color:var(--text-dim); text-transform:uppercase;">Arme</div>
                    <select style="font-size:0.7rem; padding:2px; background:transparent; border:none; color:#fff; width:100%; outline:none;" onchange="window.CharacterEngine.equipItem('${pj.id}', 'arme', this.value)">
                      <option value="" style="background:#222; color:#fff;">-- Aucune --</option>
                      ${(pj.inventaire || []).filter(i => i).map(i => `<option value="${i}" ${pj.equipement?.arme === i ? 'selected' : ''} style="background:#222; color:#fff;">${i}</option>`).join('')}
                    </select>
                  </div>
                </div>
                <!-- Armure -->
                <div style="display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.03); padding:4px 8px; border-radius:4px; border-left:2px solid #4d96ff;">
                  <span style="font-size:0.9rem;" title="Armure portée">🛡️</span>
                  <div style="flex:1;">
                    <div style="font-size:0.55rem; color:var(--text-dim); text-transform:uppercase;">Armure</div>
                    <select style="font-size:0.7rem; padding:2px; background:transparent; border:none; color:#fff; width:100%; outline:none;" onchange="window.CharacterEngine.equipItem('${pj.id}', 'armure', this.value)">
                      <option value="" style="background:#222; color:#fff;">-- Aucune --</option>
                      ${(pj.inventaire || []).filter(i => i).map(i => `<option value="${i}" ${pj.equipement?.armure === i ? 'selected' : ''} style="background:#222; color:#fff;">${i}</option>`).join('')}
                    </select>
                  </div>
                </div>
                <!-- Secondaire -->
                <div style="display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.03); padding:4px 8px; border-radius:4px; border-left:2px solid #6bcb77;">
                  <span style="font-size:0.9rem;" title="Main secondaire / Bouclier">🎯</span>
                  <div style="flex:1;">
                    <div style="font-size:0.55rem; color:var(--text-dim); text-transform:uppercase;">Secondaire</div>
                    <select style="font-size:0.7rem; padding:2px; background:transparent; border:none; color:#fff; width:100%; outline:none;" onchange="window.CharacterEngine.equipItem('${pj.id}', 'secondaire', this.value)">
                      <option value="" style="background:#222; color:#fff;">-- Aucun --</option>
                      ${(pj.inventaire || []).filter(i => i).map(i => `<option value="${i}" ${pj.equipement?.secondaire === i ? 'selected' : ''} style="background:#222; color:#fff;">${i}</option>`).join('')}
                    </select>
                  </div>
                </div>
                <!-- Magique -->
                <div style="display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.03); padding:4px 8px; border-radius:4px; border-left:2px solid #ffd166;">
                  <span style="font-size:0.9rem;" title="Objet magique ou accessoire">💍</span>
                  <div style="flex:1;">
                    <div style="font-size:0.55rem; color:var(--text-dim); text-transform:uppercase;">Magique</div>
                    <select style="font-size:0.7rem; padding:2px; background:transparent; border:none; color:#fff; width:100%; outline:none;" onchange="window.CharacterEngine.equipItem('${pj.id}', 'magique', this.value)">
                      <option value="" style="background:#222; color:#fff;">-- Aucun --</option>
                      ${(pj.inventaire || []).filter(i => i).map(i => `<option value="${i}" ${pj.equipement?.magique === i ? 'selected' : ''} style="background:#222; color:#fff;">${i}</option>`).join('')}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- Combat Actions Panel -->
            <div style="border:1px solid var(--glass-border); padding:8px; border-radius:6px; background:rgba(0,0,0,0.15); display:flex; flex-direction:column; gap:6px; margin-bottom:5px;">
              <strong style="font-size:0.75rem; color:#ffd166; display:flex; align-items:center; gap:6px;">⚔️ Actions Offensives (Combat)</strong>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:0.72rem;">
                <!-- Weapon Attack -->
                <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:4px; display:flex; flex-direction:column; gap:6px; border-top:2px solid #ff6b6b;">
                  <strong style="color:#fff; font-size:0.72rem;">🪓 Attaque à l'Arme</strong>
                  <div style="font-size:0.7rem; color:var(--text-dim);">
                    Arme active : <span style="color:#ffd166; font-weight:bold;">${pj.equipement?.arme || "Attaque sans arme"}</span>
                  </div>
                  <div style="display:flex; gap:6px; margin-top:2px;">
                    <button class="btn btn-secondary" style="flex:1; padding:3px; font-size:0.65rem;" onclick="window.CharacterEngine.rollPlayerWeaponAttack('${pj.id}')">🎲 Jet Toucher</button>
                    <button class="btn btn-secondary" style="flex:1; padding:3px; font-size:0.65rem;" onclick="window.CharacterEngine.rollPlayerWeaponDamage('${pj.id}')">🎲 Dégâts</button>
                  </div>
                </div>

                <!-- Spell Cast -->
                <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:4px; display:flex; flex-direction:column; gap:6px; border-top:2px solid #9d4ede;">
                  <strong style="color:#fff; font-size:0.72rem;">🔮 Lancer un Sort</strong>
                  <div style="display:flex; gap:4px; align-items:center;">
                    <select id="combat-spell-select-${pj.id}" style="font-size:0.7rem; padding:2px; flex:1; background:#1a0e33; border:1px solid var(--glass-border); color:#dfb2ff; border-radius:3px; outline:none;">
                      <option value="" style="background:#1a0a30; color:#dfb2ff;">-- Choisir un sort --</option>
                      ${(pj.sorts || []).map(s => `<option value="${s}" style="background:#1a0a30; color:#fff;">${s}</option>`).join('')}
                    </select>
                    <button class="btn" style="padding:2px 6px; font-size:0.7rem; color:#9d4ede; background:rgba(157,78,221,0.15); border-radius:3px;" onclick="const sEl = document.getElementById('combat-spell-select-${pj.id}'); if(sEl && sEl.value) window.CharacterEngine.castSpellFromCombat('${pj.id}', sEl.value)" title="Incantations & Application d'États">Lancer</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>États Actifs (séparés par virgules)</label>
              <input type="text" value="${pj.etats.join(', ')}" placeholder="ex: Blessé, Poison" onchange="window.CharacterEngine.updatePlayerStates('${pj.id}', this.value)">
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: Stats & Compétences -->
      <div id="modal-tab-stats" class="modal-tab-content" style="display: ${this.activeModalTab === 'stats' ? 'flex' : 'none'}; flex-direction:column; gap:12px; width:100%;">
        <!-- 6 Ability Scores Shields -->
        <div style="display:grid; grid-template-columns: repeat(6, 1fr); gap:8px;">
          ${pj.attributs.map((attr, idx) => {
            const mod = this.getAttributeModifier(attr.valeur);
            const modStr = this.formatModifier(mod);
            const escapedAttr = attr.nom.replace(/'/g, "\\'");
            return `
              <div class="dnd-stat-shield">
                <span class="dnd-stat-label">${attr.nom.substring(0, 3)}</span>
                <span class="dnd-stat-mod" id="mod-attr-${idx}">${modStr}</span>
                <input type="number" class="dnd-stat-val" value="${attr.valeur}" onchange="window.CharacterEngine.updateAttributeValue('${pj.id}', ${idx}, this.value)">
                <button class="btn" style="padding:1px; font-size:0.6rem; color:var(--color-primary); text-decoration:underline;" onclick="window.CharacterEngine.rollManualDice('${pj.id}', '${escapedAttr}', ${mod})">🎲 Jet</button>
              </div>
            `;
          }).join("")}
        </div>

        <!-- Skills Container -->
        <div style="border:1px solid var(--glass-border); padding:10px; border-radius:6px; background:rgba(0,0,0,0.15); max-height: 250px; overflow-y:auto; margin-top:5px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:4px;">
            <strong style="font-size:0.8rem; color:#ffd166;">Compétences D&D 5E (AideDD)</strong>
            <div style="display:flex; align-items:center; gap:8px;">
              <button class="btn btn-secondary" style="padding:2px 8px; font-size:0.65rem;" onclick="window.CharacterEngine.promptAddCustomSkill('${pj.id}')">+ Compétence</button>
              <span style="font-size:0.7rem; color:var(--text-muted);">Bonus de Maîtrise : +${profBonus}</span>
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;" id="skills-list-container">
            ${this.renderSkillsListHTML(pj, profBonus)}
          </div>
        </div>
      </div>

      <!-- Tab 3: Inventaire -->
      <div id="modal-tab-inventaire" class="modal-tab-content" style="display: ${this.activeModalTab === 'inventaire' ? 'flex' : 'none'}; flex-direction:column; gap:10px; width:100%;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:0.8rem; color:#ffd166;">Inventaire par Slots (Glisser-Déposer d'Objets supporté)</strong>
          <span style="font-size:0.7rem; color:var(--text-muted); font-style:italic;">*Survolez ou cliquez pour la description</span>
        </div>

        <div class="inventory-grid">
          ${Array.from({ length: 24 }).map((_, idx) => {
            const item = (pj.inventaire || [])[idx] || "";
            if (item) {
              const desc = this.getItemDescription(item);
              return `
                <div class="inventory-slot filled" id="inv-slot-${idx}" ondragover="event.preventDefault(); this.classList.add('drag-over');" ondragleave="this.classList.remove('drag-over');" ondrop="this.classList.remove('drag-over'); window.CharacterEngine.handleInventorySlotDrop(event, ${idx}, '${pj.id}')" onclick="window.CharacterEngine.clickInventorySlot('${pj.id}', ${idx})">
                  🎒
                  <div class="slot-tooltip">
                    <strong style="color:var(--color-secondary); display:block; margin-bottom:4px; font-size:0.75rem;">${item}</strong>
                    ${desc}
                    <span style="display:block; font-size:0.6rem; color:var(--text-muted); margin-top:8px; font-style:italic;">*Clic pour modifier / vider</span>
                  </div>
                </div>
              `;
            } else {
              return `
                <div class="inventory-slot" id="inv-slot-${idx}" ondragover="event.preventDefault(); this.classList.add('drag-over');" ondragleave="this.classList.remove('drag-over');" ondrop="this.classList.remove('drag-over'); window.CharacterEngine.handleInventorySlotDrop(event, ${idx}, '${pj.id}')" onclick="window.CharacterEngine.clickInventorySlot('${pj.id}', ${idx})">
                  +
                </div>
              `;
            }
          }).join("")}
        </div>
      </div>

      <!-- Tab 4: Grimoire -->
      <div id="modal-tab-grimoire" class="modal-tab-content" style="display: ${this.activeModalTab === 'grimoire' ? 'flex' : 'none'}; flex-direction:column; gap:10px; width:100%;">
        <!-- Spell Slots Tracker -->
        <div style="border:1px solid var(--glass-border); padding:8px; border-radius:6px; background:rgba(0,0,0,0.15); display:flex; flex-direction:column; gap:4px;">
          <strong style="font-size:0.75rem; color:#4cc9f0;">Emplacements de sorts (Slots)</strong>
          <div style="display:flex; gap:15px; font-size:0.7rem; flex-wrap:wrap; color:var(--text-main);">
            <div>Niv 1: <input type="checkbox"> <input type="checkbox"> <input type="checkbox"> <input type="checkbox"></div>
            <div>Niv 2: <input type="checkbox"> <input type="checkbox"> <input type="checkbox"></div>
            <div>Niv 3: <input type="checkbox"> <input type="checkbox"></div>
            <div>Niv 4: <input type="checkbox"></div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-top:5px; height:240px;">
          <!-- Add Spell panel -->
          <div style="border:1px solid var(--glass-border); padding:10px; border-radius:6px; display:flex; flex-direction:column; gap:8px;">
            <strong style="font-size:0.75rem; color:#ffd166; display:block;">Ajouter un Sort</strong>
            
            <div style="display:flex; flex-direction:column; gap:8px;">
              <select id="spell-aidedd-picker" style="font-size:0.75rem; padding:4px; width:100%;">
                <option value="">-- Choisir un sort AideDD (${window.RulesEngine.spells.length}) --</option>
                ${window.RulesEngine.spells.slice().sort((a,b) => a.niveau - b.niveau || a.nom.localeCompare(b.nom)).map(s => {
                  const condStr = s.condition ? ` [${s.condition}]` : '';
                  return `<option value="${s.nom}">[Niv ${s.niveau}] ${s.nom}${condStr}</option>`;
                }).join('')}
              </select>
              <button class="btn btn-secondary" style="font-size:0.75rem; padding:4px; width:100%;" onclick="const picker = document.getElementById('spell-aidedd-picker'); if(picker && picker.value) window.CharacterEngine.addSpellToPlayer('${pj.id}', picker.value)">Ajouter le sort AideDD</button>
              
              <div style="border-top:1px solid rgba(255,255,255,0.08); margin-top:8px; padding-top:8px;">
                <button class="btn btn-secondary" style="width:100%; font-size:0.75rem; padding:4px; background:rgba(157,78,221,0.15);" onclick="window.CharacterEngine.promptAddCustomSpell('${pj.id}')">+ Sort Personnalisé</button>
              </div>
            </div>
          </div>

          <!-- Spells List panel -->
          <div style="border:1px solid var(--glass-border); padding:10px; border-radius:6px; overflow-y:auto; display:flex; flex-direction:column; gap:6px;">
            <strong style="font-size:0.75rem; color:#ffd166; display:block;">Sorts Appris</strong>
            <div id="spells-list-container" style="display:flex; flex-direction:column; gap:6px;">
              ${this.renderSpellsListHTML(pj)}
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 5: Lore & RP -->
      <div id="modal-tab-lore" class="modal-tab-content" style="display: ${this.activeModalTab === 'lore' ? 'flex' : 'none'}; flex-direction:column; gap:10px; width:100%;">
        <div class="form-group">
          <label>Personnalité / Idéaux / Défauts</label>
          <textarea rows="3" onchange="window.CharacterEngine.updatePlayerPersonality('${pj.id}', this.value)">${pj.personnalité || ''}</textarea>
        </div>

        <div class="form-group">
          <label>Histoire / Origines</label>
          <textarea rows="5" onchange="window.CharacterEngine.updatePlayerBackstory('${pj.id}', this.value)">${pj.histoire || ''}</textarea>
        </div>
      </div>

      <!-- Bottom controls -->
      <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px; border-top:1px solid var(--glass-border); padding-top:12px; flex-shrink:0;">
        <button class="btn btn-secondary" onclick="window.WorldEngine.showOnPlayerScreen('personnage', '${pj.id}')">👁️ Écran Joueur</button>
        <button class="btn btn-primary" onclick="document.getElementById('player-modal').classList.remove('active')">Fermer</button>
      </div>
    `;

    modal.classList.add('active');
  },

  // Helper Methods for Refactored Character Sheet
  activeModalTab: "combat",

  switchModalTab(tabId) {
    document.querySelectorAll('.modal-tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.modal-tab-btn').forEach(btn => btn.classList.remove('active'));

    const targetContent = document.getElementById(`modal-tab-${tabId}`);
    const targetBtn = document.getElementById(`btn-tab-${tabId}`);
    if (targetContent) targetContent.style.display = 'flex';
    if (targetBtn) targetBtn.classList.add('active');

    this.activeModalTab = tabId;
  },

  getAttributeModifier(value) {
    return Math.floor((parseInt(value) - 10) / 2);
  },

  formatModifier(mod) {
    return mod >= 0 ? `+${mod}` : `${mod}`;
  },

  getAttributeModifierByName(pj, attrName) {
    if (!pj.attributs) return 0;
    const attr = pj.attributs.find(a => a.nom.toLowerCase().trim() === attrName.toLowerCase().trim());
    const score = attr ? attr.valeur : 10;
    return Math.floor((score - 10) / 2);
  },

  parseModifier(str) {
    if (!str) return 0;
    const match = str.toString().match(/([+-]?\d+)/);
    return match ? parseInt(match[1]) : 0;
  },

  updateAttributeValue(pjId, idx, val) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === pjId);
    if (pj) {
      pj.attributs[idx].valeur = parseInt(val) || 0;
      
      // Si on modifie la Constitution (idx 2), recalculer les PV max
      if (idx === 2) {
        this.recalculateMaxHP(pj);
        pj.pointsVie = Math.min(pj.pointsVieMax, pj.pointsVie);
        
        // Sync avec le combat tracker
        if (window.CombatEngine) {
          const state = window.CombatEngine.getState();
          if (state && state.combatants) {
            const combatant = state.combatants.find(c => c.id === pjId);
            if (combatant) {
              combatant.hpMax = pj.pointsVieMax;
              combatant.hp = pj.pointsVie;
              window.CombatEngine.saveState();
              window.CombatEngine.renderCombatTab();
            }
          }
        }
      }
      
      window.CampaignEngine.saveDatabase();

      const mod = this.getAttributeModifier(pj.attributs[idx].valeur);
      const modStr = this.formatModifier(mod);
      const modEl = document.getElementById(`mod-attr-${idx}`);
      if (modEl) modEl.textContent = modStr;

      this.updateSkillsUIInModal(pj);
      
      // Si la constitution a changé, on recharge la modale pour rafraîchir l'affichage des PV max
      if (idx === 2) {
        this.openPlayerModal(pjId);
      }
    }
  },

  adjustPlayerHP(pjId, amount) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === pjId);
    if (pj) {
      pj.pointsVie = Math.min(pj.pointsVieMax, Math.max(0, pj.pointsVie + amount));

      const hpInput = document.getElementById(`hp-input-${pjId}`);
      if (hpInput) hpInput.value = pj.pointsVie;

      // Sync with combat tracker
      if (window.CombatEngine) {
        const state = window.CombatEngine.getState();
        if (state && state.combatants) {
          const combatant = state.combatants.find(c => c.id === pjId || c.name === pj.nom);
          if (combatant) {
            combatant.hp = pj.pointsVie;
            window.CombatEngine.saveState();
            window.CombatEngine.renderCombatTab();
          }
        }
      }

      window.CampaignEngine.saveDatabase();
      this.renderPlayers();
    }
  },

  toggleSkillMastery(pjId, skillName, isChecked) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === pjId);
    if (pj) {
      if (!pj.competencesMaitrisees) pj.competencesMaitrisees = [];
      if (isChecked) {
        if (!pj.competencesMaitrisees.includes(skillName)) {
          pj.competencesMaitrisees.push(skillName);
        }
      } else {
        pj.competencesMaitrisees = pj.competencesMaitrisees.filter(s => s !== skillName);
      }
      window.CampaignEngine.saveDatabase();
      this.updateSkillsUIInModal(pj);
    }
  },

  updateSkillsUIInModal(pj) {
    const profBonus = Math.floor((pj.niveau - 1) / 4) + 2;
    const container = document.getElementById('skills-list-container');
    if (container) {
      container.innerHTML = this.renderSkillsListHTML(pj, profBonus);
    }
  },

  renderSkillsListHTML(pj, profBonus) {
    const DND_SKILLS = [
      { nom: "Athlétisme", attr: "Force" },
      { nom: "Acrobaties", attr: "Dextérité" },
      { nom: "Escamotage", attr: "Dextérité" },
      { nom: "Discrétion", attr: "Dextérité" },
      { nom: "Arcanes", attr: "Intelligence" },
      { nom: "Histoire", attr: "Intelligence" },
      { nom: "Investigation", attr: "Intelligence" },
      { nom: "Nature", attr: "Intelligence" },
      { nom: "Religion", attr: "Intelligence" },
      { nom: "Dressage", attr: "Sagesse" },
      { nom: "Intuition", attr: "Sagesse" },
      { nom: "Médecine", attr: "Sagesse" },
      { nom: "Perception", attr: "Sagesse" },
      { nom: "Survie", attr: "Sagesse" },
      { nom: "Tromperie", attr: "Charisme" },
      { nom: "Intimidation", attr: "Charisme" },
      { nom: "Représentation", attr: "Charisme" },
      { nom: "Persuasion", attr: "Charisme" }
    ];

    if (!pj.competencesMaitrisees) pj.competencesMaitrisees = [];

    let html = DND_SKILLS.map(skill => {
      const isMastered = pj.competencesMaitrisees.includes(skill.nom);
      const attrMod = this.getAttributeModifierByName(pj, skill.attr);
      const finalMod = attrMod + (isMastered ? profBonus : 0);
      const finalModStr = this.formatModifier(finalMod);
      const escapedSkillName = skill.nom.replace(/'/g, "\\'");

      return `
        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); padding:4px 8px; border-radius:4px; font-size:0.72rem;">
          <div style="display:flex; align-items:center; gap:6px;">
            <input type="checkbox" ${isMastered ? 'checked' : ''} onchange="window.CharacterEngine.toggleSkillMastery('${pj.id}', '${escapedSkillName}', this.checked)">
            <span style="font-weight:600; color:#fff;">${skill.nom}</span>
            <span style="font-size:0.55rem; color:var(--text-dim);">(${skill.attr.substring(0,3)})</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <strong style="color: ${isMastered ? '#ffd166' : 'var(--text-muted)'};">${finalModStr}</strong>
            <button class="btn" style="padding:1px 4px; font-size:0.65rem; color:var(--color-primary);" onclick="window.CharacterEngine.rollManualDice('${pj.id}', '${escapedSkillName}', ${finalMod})">🎲</button>
          </div>
        </div>
      `;
    }).join("");

    if (pj.competencesPersonnalisees && pj.competencesPersonnalisees.length > 0) {
      html += pj.competencesPersonnalisees.map(skill => {
        const isMastered = pj.competencesMaitrisees.includes(skill.nom);
        const attrMod = this.getAttributeModifierByName(pj, skill.attr);
        const finalMod = attrMod + (isMastered ? profBonus : 0);
        const finalModStr = this.formatModifier(finalMod);
        const escapedCustomName = skill.nom.replace(/'/g, "\\'");

        return `
          <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(157,78,221,0.05); padding:4px 8px; border-radius:4px; font-size:0.72rem; border-left:2px solid var(--color-primary);" title="${skill.description}">
            <div style="display:flex; align-items:center; gap:6px; cursor:help;">
              <input type="checkbox" ${isMastered ? 'checked' : ''} onchange="window.CharacterEngine.toggleSkillMastery('${pj.id}', '${escapedCustomName}', this.checked)">
              <span style="font-weight:600; color:#fff;">⭐ ${skill.nom}</span>
              <span style="font-size:0.55rem; color:var(--text-dim);">(${skill.attr.substring(0,3)})</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <strong style="color: #ffd166;">${finalModStr}</strong>
              <button class="btn" style="padding:1px 4px; font-size:0.65rem; color:var(--color-primary);" onclick="window.CharacterEngine.rollManualDice('${pj.id}', '${escapedCustomName}', ${finalMod})">🎲</button>
              <button class="btn" style="padding:1px 3px; font-size:0.6rem; color:#ff6b6b;" onclick="window.CharacterEngine.removeCustomSkill('${pj.id}', '${escapedCustomName}')">✕</button>
            </div>
          </div>
        `;
      }).join("");
    }

    return html;
  },

  async promptAddCustomSkill(pjId) {
    const nom = await window.ModalEngine.prompt("Nom de la compétence personnalisée (ex: Outils de voleur, Lore local) :", "", { title: "Nouvelle compétence" });
    if (!nom) return;
    const attr = await window.ModalEngine.prompt("Caractéristique associée (Force, Dextérité, Constitution, Intelligence, Sagesse, Charisme) :", "Dextérité", { title: "Nouvelle compétence" });
    if (!attr) return;
    const description = await window.ModalEngine.prompt("Description de la compétence (obligatoire) :", "", { title: "Nouvelle compétence" });

    if (!description) {
      await window.ModalEngine.alert("La description est obligatoire pour les compétences personnalisées !", { title: "Erreur", variant: "error" });
      return;
    }

    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === pjId);
    if (pj) {
      if (!pj.competencesPersonnalisees) pj.competencesPersonnalisees = [];
      pj.competencesPersonnalisees.push({ nom, attr, description });
      window.CampaignEngine.saveDatabase();
      this.updateSkillsUIInModal(pj);
      showNotification(`Compétence "${nom}" ajoutée !`, "success");
    }
  },

  removeCustomSkill(pjId, skillName) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === pjId);
    if (pj && pj.competencesPersonnalisees) {
      pj.competencesPersonnalisees = pj.competencesPersonnalisees.filter(s => s.nom !== skillName);
      if (pj.competencesMaitrisees) {
        pj.competencesMaitrisees = pj.competencesMaitrisees.filter(s => s !== skillName);
      }
      window.CampaignEngine.saveDatabase();
      this.updateSkillsUIInModal(pj);
      showNotification(`Compétence "${skillName}" supprimée.`, "warning");
    }
  },

  recalculateMaxHP(pj) {
    const conAttr = pj.attributs.find(a => a.nom === "Constitution");
    const conVal = conAttr ? conAttr.valeur : 10;
    const conMod = Math.floor((conVal - 10) / 2);

    const cls = (pj.classe || "").toLowerCase();
    let hitDie = 8;
    let averageIncrease = 5;
    if (cls.includes("barbare")) {
      hitDie = 12;
      averageIncrease = 7;
    } else if (cls.includes("guerrier") || cls.includes("paladin") || cls.includes("rôdeur") || cls.includes("ranger")) {
      hitDie = 10;
      averageIncrease = 6;
    } else if (cls.includes("magicien") || cls.includes("sorcier") || cls.includes("wizard") || cls.includes("sorcerer")) {
      hitDie = 6;
      averageIncrease = 4;
    } else {
      hitDie = 8;
      averageIncrease = 5;
    }

    const newMaxHP = (hitDie + conMod) + (pj.niveau - 1) * (averageIncrease + conMod);
    pj.pointsVieMax = Math.max(1, newMaxHP);
  },

  equipItem(pjId, slot, itemName) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === pjId);
    if (pj) {
      if (!pj.equipement) pj.equipement = {};
      
      const oldShield = (pj.equipement.secondaire || "").toLowerCase().includes("bouclier");
      pj.equipement[slot] = itemName;
      const newShield = (pj.equipement.secondaire || "").toLowerCase().includes("bouclier");
      
      // Auto CA calculation if shield equipped
      if (!oldShield && newShield) {
        pj.ca = (parseInt(pj.ca) || 10) + 2;
        showNotification("Bouclier équipé : CA augmentée de +2 !", "info");
      } else if (oldShield && !newShield) {
        pj.ca = Math.max(10, (parseInt(pj.ca) || 10) - 2);
        showNotification("Bouclier retiré : CA diminuée de -2.", "warning");
      }
      
      window.CampaignEngine.saveDatabase();
      showNotification(`Équipement mis à jour : ${slot} -> ${itemName || 'Aucun'}`, "success");
      this.openPlayerModal(pjId); // reload modal UI
    }
  },

  async rollManualDice(target, rollName, modifier) {
    let pjName = target;
    const db = AppState.db;
    if (db && db.personnages) {
      const pj = db.personnages.find(x => x.id === target || x.nom === target);
      if (pj) pjName = pj.nom;
    }

    const rawVal = await window.ModalEngine.prompt(`🎲 Lancement physique pour ${rollName} (${pjName}) :\nSaisissez le résultat brut de votre d20 physique (1-20) :`, "", { title: "Lancer de dés" });
    if (rawVal === null) return;

    const d20 = parseInt(rawVal.strip ? rawVal.strip() : rawVal.trim());
    if (isNaN(d20) || d20 < 1 || d20 > 20) {
      await window.ModalEngine.alert("Valeur invalide. Saisissez un nombre entier entre 1 et 20.", { title: "Erreur", variant: "error" });
      return;
    }

    const total = d20 + modifier;
    const modStr = this.formatModifier(modifier);
    
    // Notification de table
    showNotification(`🎲 Jet de ${rollName} (${pjName}) : d20 (${d20}) ${modStr} = ${total}`, "info");

    // Enregistrer dans le journal de session
    this.logDiceRollToJournal(pjName, rollName, d20, modifier, total);
  },

  logDiceRollToJournal(pjName, rollName, d20, modifier, total) {
    const modStr = this.formatModifier(modifier);
    const log = {
      id: `evt_roll_${Date.now()}`,
      title: `Jet : ${rollName} — ${pjName}`,
      type: 'combat',
      description: `${pjName} a lancé un jet de ${rollName}. Saisie manuelle : d20 (${d20}) ${modStr} = ${total}.`,
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
  },

  // Inventory Slot Interactions
  getItemDescription(itemName) {
    const db = AppState.db;
    
    // 1. Chercher dans les objets de la campagne
    if (db && db.objets) {
      const obj = db.objets.find(o => window.isStringMatch(o.nom, itemName));
      if (obj && obj.description) {
        return obj.description;
      }
    }
    
    // 2. Chercher dans l'encyclopédie des objets de base D&D
    if (window.RulesEngine && window.RulesEngine.items) {
      const ruleItem = window.RulesEngine.items.find(i => window.isStringMatch(i.nom, itemName));
      if (ruleItem) {
        let fullDesc = `<strong>Type :</strong> ${ruleItem.type}`;
        if (ruleItem.degats) fullDesc += ` | <strong>Dégâts :</strong> ${ruleItem.degats}`;
        if (ruleItem.ca) fullDesc += ` | <strong>CA :</strong> ${ruleItem.ca}`;
        if (ruleItem.proprietes) fullDesc += `<br><strong>Propriétés :</strong> ${ruleItem.proprietes}`;
        fullDesc += `<br><br>${ruleItem.description}`;
        return fullDesc;
      }
    }
    
    // 3. Chercher dans le cache des descriptions personnalisées
    try {
      const cache = JSON.parse(localStorage.getItem('custom_item_descriptions') || '{}');
      if (cache[itemName]) return cache[itemName];
    } catch(e) {}

    return "Objet de l'aventurier (Aucune description enregistrée).";
  },

  saveCustomItemDescription(itemName, desc) {
    try {
      const cache = JSON.parse(localStorage.getItem('custom_item_descriptions') || '{}');
      cache[itemName] = desc;
      localStorage.setItem('custom_item_descriptions', JSON.stringify(cache));
    } catch(e) {}
  },

  async clickInventorySlot(pjId, slotIdx) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === pjId);
    if (!pj) return;

    if (!pj.inventaire) pj.inventaire = [];
    const currentItem = pj.inventaire[slotIdx] || "";

    if (currentItem) {
      const action = await window.ModalEngine.prompt(`Objet : "${currentItem}"\n\nQue voulez-vous faire ?\n1. Supprimer du slot\n2. Modifier le nom\n3. Modifier la description du Codex\n\nSaisissez le numéro :`, "", { title: "Gestion de l'objet" });
      if (action === "1") {
        pj.inventaire[slotIdx] = "";
        window.CampaignEngine.saveDatabase();
        this.openPlayerModal(pjId);
        showNotification("Objet supprimé.", "info");
      } else if (action === "2") {
        const newName = await window.ModalEngine.prompt("Nouveau nom de l'objet :", currentItem, { title: "Renommer l'objet" });
        if (newName && newName.trim()) {
          pj.inventaire[slotIdx] = newName.trim();
          window.CampaignEngine.saveDatabase();
          this.openPlayerModal(pjId);
          showNotification("Objet renommé.", "success");
        }
      } else if (action === "3") {
        const currentDesc = this.getItemDescription(currentItem);
        const newDesc = await window.ModalEngine.prompt("Nouvelle description de l'objet :", currentDesc, { title: "Modifier la description" });
        if (newDesc !== null) {
          this.saveCustomItemDescription(currentItem, newDesc.trim());
          this.openPlayerModal(pjId);
          showNotification("Description mise à jour.", "success");
        }
      }
    } else {
      const name = await window.ModalEngine.prompt("Saisissez le nom de l'objet à ajouter dans ce slot :", "", { title: "Ajouter un objet" });
      if (name && name.trim()) {
        const trimmedName = name.trim();
        pj.inventaire[slotIdx] = trimmedName;

        for (let i = 0; i < slotIdx; i++) {
          if (pj.inventaire[i] === undefined) pj.inventaire[i] = "";
        }

        const desc = await window.ModalEngine.prompt("Optionnel : Saisissez une description pour cet objet (laisser vide pour utiliser la description par défaut) :", "", { title: "Description de l'objet" });
        if (desc && desc.trim()) {
          this.saveCustomItemDescription(trimmedName, desc.trim());
        }

        window.CampaignEngine.saveDatabase();
        this.openPlayerModal(pjId);
        showNotification(`Objet "${trimmedName}" ajouté !`, "success");
      }
    }
  },

  handleInventorySlotDrop(e, slotIdx, pjId) {
    e.preventDefault();
    e.stopPropagation();

    let dataText = e.dataTransfer.getData("text/plain");
    if (!dataText) return;

    try {
      const dragData = JSON.parse(dataText);
      if (dragData.type === 'objet') {
        const db = AppState.db;
        const obj = db.objets.find(o => o.id === dragData.id);
        if (obj) {
          const pj = db.personnages.find(p => p.id === pjId);
          if (pj) {
            if (!pj.inventaire) pj.inventaire = [];
            pj.inventaire[slotIdx] = obj.nom;
            
            for (let i = 0; i < slotIdx; i++) {
              if (pj.inventaire[i] === undefined) pj.inventaire[i] = "";
            }
            
            window.CampaignEngine.saveDatabase();
            this.openPlayerModal(pjId);
            showNotification(`Objet "${obj.nom}" glissé dans le slot !`, "success");
          }
        }
      }
    } catch(err) {
      console.warn("Invalid drop data on inventory slot", err);
    }
  },

  // Grimoire Sorts / Spells Interactions
  addSpellToPlayer(pjId, spellName) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === pjId);
    if (pj) {
      if (!pj.sorts) pj.sorts = [];
      if (!pj.sorts.includes(spellName)) {
        pj.sorts.push(spellName);
        window.CampaignEngine.saveDatabase();
        this.renderSpellsUIInModal(pj);
        showNotification(`Sort "${spellName}" ajouté !`, "success");
      }
    }
  },

  removeSpell(pjId, spellName) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === pjId);
    if (pj && pj.sorts) {
      pj.sorts = pj.sorts.filter(s => s !== spellName);
      window.CampaignEngine.saveDatabase();
      this.renderSpellsUIInModal(pj);
      showNotification(`Sort "${spellName}" retiré.`, "warning");
    }
  },

  renderSpellsUIInModal(pj) {
    const container = document.getElementById('spells-list-container');
    if (container) {
      container.innerHTML = this.renderSpellsListHTML(pj);
    }
  },

  async promptAddCustomSpell(pjId) {
    const nom = await window.ModalEngine.prompt("Nom du sort :", "", { title: "Nouveau sort" });
    if (!nom) return;
    const ecole = await window.ModalEngine.prompt("École de magie (ex: Nécromancie, Illusion) :", "", { title: "Nouveau sort" });
    const niveauVal = await window.ModalEngine.prompt("Niveau du sort (0 pour un tour de magie, 1-9 pour les autres) :", "0", { title: "Nouveau sort" });
    const niveau = parseInt(niveauVal) || 0;
    const condition = await window.ModalEngine.prompt("État associé infligé à la cible (optionnel, ex: Aveuglé, Charmé) :", "", { title: "Nouveau sort" });
    const description = await window.ModalEngine.prompt("Description du sort (obligatoire) :", "", { title: "Nouveau sort" });

    if (!description) {
      await window.ModalEngine.alert("La description du sort est obligatoire ! Le sort n'a pas été ajouté.", { title: "Erreur", variant: "error" });
      return;
    }

    this.saveCustomSpellDescription(nom, { ecole, niveau, condition, description });
    this.addSpellToPlayer(pjId, nom);
  },

  getSpellDescription(spellName) {
    if (window.RulesEngine && window.RulesEngine.spells) {
      const spell = window.RulesEngine.spells.find(s => window.isStringMatch(s.nom, spellName));
      if (spell) return spell;
    }

    try {
      const cache = JSON.parse(localStorage.getItem('custom_spell_descriptions') || '{}');
      if (cache[spellName]) return cache[spellName];
    } catch(e) {}

    return { ecole: "Inconnue", niveau: 0, condition: "", description: "Sort personnalisé." };
  },

  saveCustomSpellDescription(spellName, data) {
    try {
      const cache = JSON.parse(localStorage.getItem('custom_spell_descriptions') || '{}');
      cache[spellName] = data;
      localStorage.setItem('custom_spell_descriptions', JSON.stringify(cache));
    } catch(e) {}
  },

  renderSpellsListHTML(pj) {
    if (!pj.sorts || pj.sorts.length === 0) {
      return `<div style="font-size:0.7rem; color:var(--text-dim); text-align:center; padding:10px;">Aucun sort appris.</div>`;
    }

    return pj.sorts.map(spellName => {
      const details = this.getSpellDescription(spellName);
      const conditionBadge = details.condition 
        ? `<button class="btn" style="padding:1px 6px; font-size:0.6rem; background:rgba(157,78,221,0.2); border:1px solid #9d4edd; color:#dfb2ff; border-radius:3px;" onclick="window.CharacterEngine.applySpellConditionToCombatant('${details.condition}')">💥 ${details.condition}</button>`
        : '';

      return `
        <div style="background:rgba(255,255,255,0.02); padding:6px; border-radius:4px; border-left:2px solid var(--color-primary); display:flex; justify-content:space-between; align-items:center; min-height:36px;">
          <div style="flex:1; cursor:help;" title="${details.description}\n\nÉcole: ${details.ecole} | Niv: ${details.niveau}">
            <strong style="font-size:0.75rem; color:#fff; display:block;">${spellName}</strong>
            <span style="font-size:0.6rem; color:var(--text-dim);">${details.ecole} • Niv ${details.niveau}</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            ${conditionBadge}
            <button class="btn" style="padding:2px; font-size:0.65rem; color:#ff6b6b;" onclick="window.CharacterEngine.removeSpell('${pj.id}', '${spellName}')">✕</button>
          </div>
        </div>
      `;
    }).join("");
  },

  // ── Target Picker ─────────────────────────────────────────────
  _targetPickerCallback: null,

  openTargetPicker(options = {}) {
    // options: { title, subtitle, actionLabel, callback, excludeId }
    const modal = document.getElementById('target-picker-modal');
    if (!modal) return;

    const titleEl  = document.getElementById('target-picker-title');
    const subEl    = document.getElementById('target-picker-subtitle');
    const badgeEl  = document.getElementById('target-picker-action-badge');
    const noCombatEl = document.getElementById('target-picker-no-combat');
    const gridEl   = document.getElementById('target-picker-grid');

    titleEl.textContent  = options.title  || '🎯 Choisir une Cible';
    subEl.textContent    = options.subtitle || 'Sélectionnez le combattant ciblé';
    this._targetPickerCallback = options.callback || null;

    if (options.actionLabel) {
      badgeEl.textContent = options.actionLabel;
      badgeEl.style.display = 'block';
    } else {
      badgeEl.style.display = 'none';
    }

    // Get combatants from active combat
    let combatants = [];
    if (window.CombatEngine) {
      const state = window.CombatEngine.getState();
      if (state && state.active && state.combatants && state.combatants.length > 0) {
        combatants = state.combatants.filter(c => !options.excludeId || c.id !== options.excludeId);
      }
    }

    if (combatants.length === 0) {
      noCombatEl.style.display = 'block';
      gridEl.style.display = 'none';
    } else {
      noCombatEl.style.display = 'none';
      gridEl.style.display = 'grid';
      gridEl.innerHTML = combatants.map(c => {
        const isPlayer = c.type === 'pj' || c.isPlayer;
        const hp    = parseInt(c.hp)  || 0;
        const hpMax = parseInt(c.hpMax) || 1;
        const pct   = Math.max(0, Math.min(100, Math.round((hp / hpMax) * 100)));
        const hpColor = pct > 60 ? '#06d6a0' : pct > 30 ? '#ffd166' : '#ff595e';
        const avatar  = c.image ? `background-image:url('${c.image}'); background-color:transparent;` : '';
        const avatarEmoji = isPlayer ? '🧙' : '👾';
        const conditions = (c.conditions || []).slice(0, 5);
        const conditionColors = {
          'Empoisonné':'#6bcb77', 'Paralysé':'#4cc9f0', 'Charmé':'#f72585',
          'Étourdi':'#ffd166', 'À terre':'#aaa', 'Aveuglé':'#888',
          'Effrayé':'#ff9a3c', 'Inconscient':'#9d4edd', 'Mort':'#333'
        };
        return `
          <div class="target-card ${isPlayer ? 'is-player' : ''}" onclick="window.CharacterEngine._pickTarget('${c.id}')" title="Cibler ${c.name}">
            <div class="target-card-header">
              <div class="target-card-avatar" style="${avatar}">${avatar ? '' : avatarEmoji}</div>
              <span class="target-card-name">${c.name}</span>
              <span class="target-type-badge ${isPlayer ? 'pj' : 'monstre'}">${isPlayer ? 'PJ' : 'Monstre'}</span>
            </div>
            <div class="target-hp-bar-track">
              <div class="target-hp-bar-fill" style="width:${pct}%; background:${hpColor};"></div>
            </div>
            <div class="target-card-footer">
              <span class="target-hp-text">❤️ ${hp} / ${hpMax}</span>
              <div class="target-conditions">
                ${conditions.map(cond => `<div class="target-condition-dot" style="background:${conditionColors[cond]||'#ffd166'}" title="${cond}"></div>`).join('')}
                ${conditions.length > 0 ? `<span style="font-size:0.6rem; color:var(--text-dim); margin-left:2px;">${conditions.join(', ')}</span>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    modal.classList.add('active');
  },

  _pickTarget(combatantId) {
    const modal = document.getElementById('target-picker-modal');
    if (modal) modal.classList.remove('active');

    if (!window.CombatEngine) return;
    const state = window.CombatEngine.getState();
    const target = (state.combatants || []).find(c => c.id === combatantId);
    if (!target) return;

    if (typeof this._targetPickerCallback === 'function') {
      this._targetPickerCallback(target);
      this._targetPickerCallback = null;
    }
  },

  closeTargetPicker() {
    const modal = document.getElementById('target-picker-modal');
    if (modal) modal.classList.remove('active');
    this._targetPickerCallback = null;
  },

  applySpellConditionToCombatant(conditionName) {
    this.openTargetPicker({
      title: `🎯 Appliquer : ${conditionName}`,
      subtitle: 'Choisissez le combattant affecté par ce sort',
      actionLabel: `🔮 Sort → État appliqué : ${conditionName}`,
      callback: (target) => {
        window.CombatEngine.toggleCondition(target.id, conditionName, true);
        showNotification(`État "${conditionName}" appliqué à ${target.name} !`, 'success');
      }
    });
  },

  updatePlayerName(id, val) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (pj) {
      pj.nom = val.trim();
      
      // Sync with active combatant if PJ is in combat
      if (window.CombatEngine) {
        const state = window.CombatEngine.getState();
        if (state && state.combatants) {
          const combatant = state.combatants.find(c => c.id === id);
          if (combatant) {
            combatant.name = pj.nom;
            window.CombatEngine.saveState();
            window.CombatEngine.renderCombatTab();
          }
        }
      }

      window.CampaignEngine.saveDatabase();
    }
  },

  updatePlayerClass(id, val) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (pj) {
      pj.classe = val.trim();
      window.CampaignEngine.saveDatabase();
    }
  },

  updatePlayerLevel(id, val) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (pj) {
      pj.niveau = parseInt(val) || 1;
      this.recalculateMaxHP(pj);
      pj.pointsVie = Math.min(pj.pointsVieMax, pj.pointsVie);
      
      window.CampaignEngine.saveDatabase();
      
      // Mettre à jour dans le tracker de combat
      if (window.CombatEngine) {
        const state = window.CombatEngine.getState();
        if (state && state.combatants) {
          const combatant = state.combatants.find(c => c.id === id);
          if (combatant) {
            combatant.hpMax = pj.pointsVieMax;
            combatant.hp = pj.pointsVie;
            window.CombatEngine.saveState();
            window.CombatEngine.renderCombatTab();
          }
        }
      }
      
      this.openPlayerModal(id); // recharger l'UI de la modale
    }
  },

  updatePlayerXP(id, val) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (pj) {
      pj.xp = val.trim();
      window.CampaignEngine.saveDatabase();
    }
  },

  updatePlayerGP(id, val) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (pj) {
      pj.gp = parseInt(val) || 0;
      window.CampaignEngine.saveDatabase();
    }
  },

  updatePlayerLink(id, val) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (pj) {
      pj.joueurId = val;
      window.CampaignEngine.saveDatabase();
    }
  },

  updatePlayerMaxHP(id, val) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (pj) {
      pj.pointsVieMax = parseInt(val) || 10;
      
      // Sync with active combatant if PJ is in combat
      if (window.CombatEngine) {
        const state = window.CombatEngine.getState();
        if (state && state.combatants) {
          const combatant = state.combatants.find(c => c.id === id);
          if (combatant) {
            combatant.maxHp = pj.pointsVieMax;
            combatant.hp = Math.min(combatant.maxHp, combatant.hp);
            window.CombatEngine.saveState();
            window.CombatEngine.renderCombatTab();
          }
        }
      }

      window.CampaignEngine.saveDatabase();
    }
  },

  updatePlayerCA(id, val) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (pj) {
      pj.ca = parseInt(val) || 10;

      // Sync with active combatant if PJ is in combat
      if (window.CombatEngine) {
        const state = window.CombatEngine.getState();
        if (state && state.combatants) {
          const combatant = state.combatants.find(c => c.id === id);
          if (combatant) {
            combatant.ca = pj.ca;
            window.CombatEngine.saveState();
            window.CombatEngine.renderCombatTab();
          }
        }
      }

      window.CampaignEngine.saveDatabase();
    }
  },

  updatePlayerInitiative(id, val) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (pj) {
      pj.initiative = val.trim();
      window.CampaignEngine.saveDatabase();
    }
  },

  updatePlayerStates(id, val) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (pj) {
      pj.etats = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
      
      // Synchroniser avec le combattant actif s'il est en combat
      if (window.CombatEngine) {
        const state = window.CombatEngine.getState();
        if (state && state.combatants) {
          const combatant = state.combatants.find(c => c.id === id || c.name === pj.nom);
          if (combatant) {
            combatant.conditions = pj.etats;
            window.CombatEngine.saveState();
            window.CombatEngine.renderCombatTab();
          }
        }
      }

      window.CampaignEngine.saveDatabase();
    }
  },

  updatePlayerSkills(id, val) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (pj) {
      pj.compétences = val.trim();
      window.CampaignEngine.saveDatabase();
    }
  },

  updatePlayerSpells(id, val) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (pj) {
      pj.sorts = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
      window.CampaignEngine.saveDatabase();
    }
  },

  updatePlayerInventory(id, val) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (pj) {
      pj.inventaire = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
      window.CampaignEngine.saveDatabase();
    }
  },

  updatePlayerPersonality(id, val) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (pj) {
      pj.personnalité = val.trim();
      window.CampaignEngine.saveDatabase();
    }
  },

  updatePlayerBackstory(id, val) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (pj) {
      pj.histoire = val.trim();
      window.CampaignEngine.saveDatabase();
    }
  },

  addNewAttribute(id) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (pj) {
      if (!pj.attributs) pj.attributs = [];
      pj.attributs.push({ nom: "Nouvel Attribut", valeur: 10 });
      window.CampaignEngine.saveDatabase();
      this.openPlayerModal(id); // Reload modal UI
    }
  },

  updateAttributeName(id, idx, name) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (pj && pj.attributs && pj.attributs[idx]) {
      pj.attributs[idx].nom = name.trim();
      window.CampaignEngine.saveDatabase();
    }
  },



  getPlayerDamageFormula(pj) {
    const equippedWeaponName = pj.equipement?.arme || "";
    let baseDmg = "1"; // unarmed strike
    let isFinesse = false;
    let isRanged = false;

    if (equippedWeaponName && window.RulesEngine && window.RulesEngine.items) {
      const weaponItem = window.RulesEngine.items.find(i => window.isStringMatch(i.nom, equippedWeaponName));
      if (weaponItem && weaponItem.degats) {
        baseDmg = weaponItem.degats;
        const props = (weaponItem.proprietes || "").toLowerCase();
        isFinesse = props.includes("finesse");
        isRanged = props.includes("munitions") || props.includes("portée");
      }
    }

    // Determine modifier (STR or DEX)
    const attributs = pj.attributs || [];
    const strAttr = attributs.find(a => a.nom === "Force");
    const strVal = strAttr ? strAttr.valeur : 10;
    const strMod = Math.floor((strVal - 10) / 2);

    const dexAttr = attributs.find(a => a.nom === "Dextérité");
    const dexVal = dexAttr ? dexAttr.valeur : 10;
    const dexMod = Math.floor((dexVal - 10) / 2);

    let mod = strMod;
    if (isFinesse) {
      mod = Math.max(strMod, dexMod);
    } else if (isRanged) {
      mod = dexMod;
    }

    const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
    return `${baseDmg} ${modStr}`;
  },

  // ─── Helpers: arme & profil d'attaque ──────────────────────────

  _getWeaponProfile(pj) {
    // Retourne { weaponLabel, damageDice, isUnarmed, isFinesse, isRanged, abilityMod, abilityName }
    const equippedName  = pj.equipement?.arme || '';
    const isUnarmed     = !equippedName;
    let weaponLabel     = isUnarmed ? 'Attaque sans arme 🥊' : equippedName;
    let damageDice      = '';        // ex: '1d6', '2d6' — vide = sans arme
    let isFinesse       = false;
    let isRanged        = false;
    let weaponItem      = null;

    if (!isUnarmed && window.RulesEngine?.items) {
      weaponItem = window.RulesEngine.items.find(i => window.isStringMatch(i.nom, equippedName));
      if (weaponItem) {
        weaponLabel = weaponItem.nom;
        damageDice  = weaponItem.degats || '';
        const props = (weaponItem.proprietes || '').toLowerCase();
        isFinesse   = props.includes('finesse');
        isRanged    = props.includes('munitions') || props.includes('portée');
      }
    }

    // Attributs
    const attributs = pj.attributs || [];
    const strAttr = attributs.find(a => a.nom === 'Force');
    const strMod  = Math.floor(((strAttr?.valeur || 10) - 10) / 2);
    const dexAttr = attributs.find(a => a.nom === 'Dextérité');
    const dexMod  = Math.floor(((dexAttr?.valeur || 10) - 10) / 2);

    // Modificateur d'attaque
    let abilityMod  = strMod;
    let abilityName = 'FOR';
    if (isRanged) {
      abilityMod  = dexMod; abilityName = 'DEX';
    } else if (isFinesse && dexMod > strMod) {
      abilityMod  = dexMod; abilityName = 'DEX';
    }

    // Moine : dé d'arts martiaux basé sur le niveau
    if (isUnarmed) {
      const classeLC = (pj.classe || '').toLowerCase();
      if (classeLC.includes('moine') || classeLC.includes('monk')) {
        const lvl = pj.niveau || 1;
        damageDice = lvl >= 17 ? '1d10' : lvl >= 11 ? '1d8' : lvl >= 5 ? '1d6' : '1d4';
        // Moine utilise le meilleur entre STR et DEX
        if (dexMod > strMod) { abilityMod = dexMod; abilityName = 'DEX'; }
        weaponLabel = `Arts Martiaux (${damageDice}) 🥋`;
      }
    }

    return { weaponLabel, damageDice, isUnarmed, isFinesse, isRanged, abilityMod, abilityName };
  },

  _applyDamageToCombatant(targetId, damage) {
    if (!window.CombatEngine) return 0;
    const state     = window.CombatEngine.getState();
    const combatant = state.combatants.find(c => c.id === targetId);
    if (!combatant) return 0;
    const before    = parseInt(combatant.hp) || 0;
    combatant.hp    = Math.max(0, before - damage);
    // Sync PJ si c'est un joueur
    if (combatant.isPlayer && window.AppState?.db?.personnages) {
      const pj = window.AppState.db.personnages.find(p => p.id === targetId || p.nom === combatant.name);
      if (pj) { pj.pointsVie = combatant.hp; window.CampaignEngine?.saveDatabase(); }
    }
    window.CombatEngine.saveState();
    window.CombatEngine.renderCombatTab();
    return combatant.hp;
  },

  rollPlayerWeaponDamage(pjId) {
    this.rollPlayerWeaponAttack(pjId);
  },

  async rollPlayerWeaponAttack(pjId) {
    const db  = AppState.db;
    const pj  = db.personnages.find(x => x.id === pjId);
    if (!pj) return;

    const wp          = this._getWeaponProfile(pj);
    const profBonus   = Math.floor((pj.niveau - 1) / 4) + 2;
    const totalMod    = wp.abilityMod + profBonus;
    const modStr      = totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;
    const dmgFormula  = wp.isUnarmed && !wp.damageDice
      ? `1 + mod ${wp.abilityName} (pas de dé — attaque sans arme)`
      : `${wp.damageDice} + mod ${wp.abilityName} (${wp.abilityMod >= 0 ? '+' : ''}${wp.abilityMod})`;

    // ── Étape 1 : Saisie du d20 physique ────────────────────────────
    const rawVal = await window.ModalEngine.prompt(
      `⚔️ ATTAQUE — ${wp.weaponLabel}\n` +
      `Personnage : ${pj.nom} (Niv.${pj.niveau})\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Jet de toucher : d20 ${modStr}\n` +
      `  = d20 + ${wp.abilityName}(${wp.abilityMod >= 0 ? '+' : ''}${wp.abilityMod}) + Maîtrise(+${profBonus})\n` +
      `Formule dégâts : ${dmgFormula}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Saisissez votre d20 physique (1-20) :`,
      "",
      { title: "Jet d'attaque" }
    );
    if (rawVal === null) return;
    const d20 = parseInt(rawVal.trim());
    if (isNaN(d20) || d20 < 1 || d20 > 20) {
      await window.ModalEngine.alert('Valeur invalide. Saisissez un nombre entre 1 et 20.', { title: "Erreur", variant: "error" });
      return;
    }

    // ── Nat 1 : Échec critique ───────────────────────────────────────
    if (d20 === 1) {
      showNotification(`💀 ÉCHEC CRITIQUE ! ${pj.nom} rate complètement son attaque avec ${wp.weaponLabel} !`, 'warning');
      this.logDiceRollToJournal(pj.nom, `Échec Critique — ${wp.weaponLabel}`, 1, totalMod, '💀 RATÉ AUTOMATIQUE');
      return;
    }

    // ── Nat 20 : Coup critique ───────────────────────────────────────
    const isCrit  = (d20 === 20);
    const total   = d20 + totalMod;

    // ── Étape 2 : Sélection de la cible ─────────────────────────────
    this.openTargetPicker({
      title : isCrit ? '💥 COUP CRITIQUE ! Choisir la cible' : `🎯 Jet d'attaque : ${total}`,
      subtitle: isCrit
        ? `Nat 20 — Dégâts doublés ! Choisissez la cible`
        : `d20(${d20}) ${modStr} = ${total} — sélectionnez la cible pour vérifier la CA`,
      actionLabel: isCrit
        ? `💥 COUP CRITIQUE — ${pj.nom} avec ${wp.weaponLabel}`
        : `⚔️ ${pj.nom} attaque avec ${wp.weaponLabel} → ${total}`,
      callback: async (target) => {
        const targetCA = parseInt(target.ca) || 10;
        const hits     = isCrit || (total >= targetCA);

        // ── Raté ────────────────────────────────────────────────────
        if (!hits) {
          showNotification(
            `❌ RATÉ ! ${pj.nom} manque ${target.name} — Résultat ${total} vs CA ${targetCA}`,
            'warning'
          );
          this.logDiceRollToJournal(
            pj.nom, `Attaque vs ${target.name} (${wp.weaponLabel})`,
            d20, totalMod, `RATÉ (${total} vs CA ${targetCA})`
          );
          return;
        }

        // ── Touché ──────────────────────────────────────────────────
        const hitMsg = isCrit
          ? `💥 COUP CRITIQUE sur ${target.name} ! Dégâts doublés !`
          : `✅ TOUCHÉ ! ${pj.nom} frappe ${target.name} (${total} ≥ CA ${targetCA})`;
        showNotification(hitMsg, 'success');
        this.logDiceRollToJournal(
          pj.nom, `Attaque vs ${target.name} (${wp.weaponLabel})`,
          d20, totalMod, isCrit ? `CRITIQUE (${total} vs CA ${targetCA})` : `TOUCHÉ (${total} vs CA ${targetCA})`
        );

        // ── Étape 3 : Jet de dégâts ─────────────────────────────────
        await this._rollDamageAndApply(pj, target, wp, isCrit);
      }
    });
  },

  async _rollDamageAndApply(pj, target, wp, isCrit) {
    const modStr = wp.abilityMod >= 0 ? `+${wp.abilityMod}` : `${wp.abilityMod}`;
    let totalDamage;

    if (wp.isUnarmed && !wp.damageDice) {
      // ── Attaque sans arme : 1 + mod FOR (aucun dé à lancer) ────────
      totalDamage = Math.max(1, 1 + wp.abilityMod);
      showNotification(
        `🥊 Attaque sans arme → ${totalDamage} dégâts contondants (1 ${modStr}) sur ${target.name}`,
        'info'
      );

    } else {
      // ── Arme ou Arts Martiaux : prompt dés physiques ────────────────
      const critNote = isCrit
        ? `\n💥 COUP CRITIQUE → lancez ${wp.damageDice} DEUX FOIS et additionnez les résultats`
        : '';
      const rawDmg = await window.ModalEngine.prompt(
        `🎲 DÉGÂTS — ${wp.weaponLabel}\n` +
        `Formule : ${wp.damageDice} ${modStr}${critNote}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Saisissez le total brut de vos dés (sans le modificateur) :`,
        "",
        { title: "Calcul des Dégâts" }
      );
      if (rawDmg === null) return;
      const diceTotal = parseInt(rawDmg.trim());
      if (isNaN(diceTotal) || diceTotal < 1) {
        await window.ModalEngine.alert('Valeur invalide.', { title: "Erreur", variant: "error" });
        return;
      }
      totalDamage = Math.max(1, diceTotal + wp.abilityMod);
    }

    // ── Application HP ──────────────────────────────────────────────
    const hpAfter = this._applyDamageToCombatant(target.id, totalDamage);
    const critTag = isCrit ? ' 💥 CRITIQUE' : '';
    showNotification(
      `💥 ${target.name} subit ${totalDamage} dégâts${critTag} ! PV restants : ${hpAfter}/${target.hpMax || '?'}`,
      'warning'
    );
    this.logDiceRollToJournal(
      pj.nom,
      `Dégâts${critTag} sur ${target.name} (${wp.weaponLabel})`,
      totalDamage, 0, `${totalDamage} dégâts → ${hpAfter} PV restants`
    );
  },

  castSpellFromCombat(pjId, spellName) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === pjId);
    if (!pj) return;
    
    const spell = this.getSpellDescription(spellName);
    
    showNotification(`🔮 ${pj.nom} incante : ${spellName}`, "info");
    this.logDiceRollToJournal(pj.nom, `Incantation sort (${spellName})`, 0, 0, `Sort lancé: ${spellName}`);
    
    // Build spell details HTML
    const spellDetailHTML = `
      <div style="color:var(--text-main); font-size:0.85rem; line-height:1.5; padding:10px 0;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px; font-size:0.75rem; background:rgba(0,0,0,0.25); padding:8px; border-radius:4px; border:1px solid var(--glass-border);">
          <div><strong>École :</strong> ${spell.ecole}</div>
          <div><strong>Niveau :</strong> ${spell.niveau}</div>
          <div><strong>Incantation :</strong> ${spell.incantation || '1 action'}</div>
          <div><strong>Portée :</strong> ${spell.portee || 'Contact'}</div>
          <div><strong>Durée :</strong> ${spell.duree || 'Instantanée'}</div>
          <div><strong>État :</strong> ${spell.condition || 'Aucun'}</div>
        </div>
        <p>${spell.description}</p>
      </div>
    `;

    if (spell.condition) {
      // Toujours ouvrir le target picker pour les sorts à état
      this.openTargetPicker({
        title: `🔮 Lancer : ${spellName}`,
        subtitle: `Choisissez la cible pour appliquer l'état [${spell.condition}]`,
        actionLabel: `🔮 ${pj.nom} incante ${spellName} → ${spell.condition}`,
        callback: (target) => {
          window.CombatEngine.toggleCondition(target.id, spell.condition, true);
          showNotification(`🔮 ${spellName} : état [${spell.condition}] appliqué sur ${target.name} !`, 'success');
          this.logDiceRollToJournal(pj.nom, `Sort ${spellName} → ${spell.condition} sur ${target.name}`, 0, 0, spell.condition);
        }
      });
    } else {
      // Sort sans état : afficher les détails dans la modale standard + proposer cible
      const detailModal = document.getElementById('detail-modal');
      if (detailModal) {
        document.getElementById('modal-entity-title').textContent = spellName;
        document.getElementById('modal-entity-details').innerHTML = spellDetailHTML;
        detailModal.classList.add('active');
      }
    }
  },

  rollAttribute(id, attrIdx) {
    const db = AppState.db;
    const pj = db.personnages.find(x => x.id === id);
    if (!pj || !pj.attributs || !pj.attributs[attrIdx]) return;
    
    const attr = pj.attributs[attrIdx];
    const modifier = Math.floor((attr.valeur - 10) / 2);
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + modifier;
    
    const modifierStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
    const desc = `${pj.nom} a effectué un jet de ${attr.nom} : 1d20 (${d20}) ${modifierStr} = ${total}.`;
    
    if (AppState.activeSessionId) {
      const log = {
        id: `evt_session_${Date.now()}`,
        title: `Jet de ${attr.nom} (${pj.nom}) : ${total}`,
        type: "combat",
        description: desc,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };
      if (!AppState.sessionLogs) AppState.sessionLogs = [];
      AppState.sessionLogs.push(log);
      localStorage.setItem("mj_copilot_session_logs", JSON.stringify(AppState.sessionLogs));
      
      if (window.EventEngine && typeof window.EventEngine.renderSessionLogs === 'function') {
        window.EventEngine.renderSessionLogs();
      }
      if (window.SessionEngine && typeof window.SessionEngine.renderSessionControlCard === 'function') {
        window.SessionEngine.renderSessionControlCard();
      }
    }
    
    showNotification(`🎲 ${pj.nom} - ${attr.nom} : ${total} (d20:${d20})`, "info");
  }
};
