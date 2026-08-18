window.SessionEngine = {
  updateSessionsUI() {
    this.renderSessionControlCard();
    this.renderSessionsList();
    if (window.EventEngine && typeof window.EventEngine.renderSessionLogs === 'function') {
      window.EventEngine.renderSessionLogs();
    }
  },

  renderSessionControlCard() {
    const cardEl = document.getElementById('session-control-card');
    if (!cardEl) return;

    const db = AppState.db;
    if (!db || db.campagne.id === 'camp_new') {
      cardEl.innerHTML = `
        <div style="text-align:center; padding:30px; color:var(--text-dim);">
          <h3 class="card-title" style="margin-bottom: 10px;">Partie en cours</h3>
          <p style="font-size:0.8rem; line-height:1.4;">Veuillez charger un Codex pour démarrer.</p>
        </div>
      `;
      return;
    }

    if (AppState.activeSessionId) {
      const seance = db.seances.find(s => s.id === AppState.activeSessionId);
      if (seance) {
        const chap = db.chapitres.find(c => c.id === seance.chapitreId);
        AppState.playerState.sessionTitle = seance.titre;

        cardEl.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h3 class="card-title" style="margin:0; font-size:0.95rem; color:#ffd166;">🟢 Séance active</h3>
              <button class="btn btn-primary" id="btn-trigger-close-modal" style="padding:4px 8px; font-size:0.75rem; background:#d90429; border-color:#d90429;">Clôturer</button>
            </div>
            
            <div style="font-size:0.85rem; font-weight:700; color:#fff;">${seance.titre}</div>
            <div style="font-size:0.72rem; color:var(--text-dim); display:flex; gap:10px;">
              <span>📅 ${seance.date}</span>
              <span>🧭 ${seance.lieu || 'Non spécifié'}</span>
              ${chap ? `<span>📖 ${chap.titre}</span>` : ''}
            </div>

            <div class="form-group" style="margin-top:5px;">
              <label style="font-size:0.7rem; margin-bottom:2px;">Notes à chaud / Lieu principal</label>
              <div style="display:flex; gap:6px; margin-bottom:5px;">
                <input type="text" id="active-session-lieu-edit" value="${seance.lieu || ''}" placeholder="Lieu" style="padding:4px; font-size:0.75rem; flex:1; background:rgba(0,0,0,0.3); border:1px solid var(--glass-border); color:#fff; border-radius:4px;">
                <button class="btn btn-secondary" id="btn-save-session-notes" style="padding:4px 8px; font-size:0.7rem;">💾 Notes</button>
              </div>
              <textarea id="active-session-notes-edit" rows="3" placeholder="Notes..." style="width:100%; box-sizing:border-box; padding:6px; font-size:0.75rem; background:rgba(0,0,0,0.3); border:1px solid var(--glass-border); color:#fff; border-radius:4px; resize:none;">${seance.resume || ''}</textarea>
            </div>
          </div>
        `;

        // Attach listeners
        document.getElementById('btn-save-session-notes').addEventListener('click', () => {
          const notesText = document.getElementById('active-session-notes-edit').value;
          const lieuText = document.getElementById('active-session-lieu-edit').value.trim();
          seance.resume = notesText;
          seance.lieu = lieuText;
          AppState.playerState.notes = `Lieu principal : ${lieuText || 'Non spécifié'}. Résumé : ${notesText}`;
          window.CampaignEngine.saveDatabase();
          showNotification("Notes de séance sauvegardées !", "success");
        });

        document.getElementById('btn-trigger-close-modal').addEventListener('click', () => {
          this.openCloseSessionModal();
        });
        return;
      }
    }

    // No active session
    cardEl.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px; padding:5px; text-align:center;">
        <h3 class="card-title" style="margin:0; font-size:0.95rem; color:var(--text-muted);">Séance en sommeil</h3>
        <p style="font-size:0.75rem; color:var(--text-dim); line-height:1.4;">Aucune séance active n'est en cours. Démarrez-en une pour activer le journal.</p>
        <button class="btn btn-primary" id="btn-trigger-create-modal" style="padding:8px 12px; font-size:0.8rem; font-weight:700; margin-top:5px;">➕ Démarrer une Séance</button>
      </div>
    `;

    document.getElementById('btn-trigger-create-modal').addEventListener('click', () => {
      this.openCreateSessionModal();
    });
  },

  renderSessionsList() {
    const db = AppState.db;
    const listEl = document.getElementById('sessions-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    if (!db || !db.seances || db.seances.length === 0) {
      listEl.innerHTML = '<div style="color:var(--text-dim); font-size:0.85rem; padding:15px; text-align:center;">Aucune séance archivée.</div>';
      return;
    }

    db.seances.forEach(seance => {
      const card = document.createElement('div');
      card.className = 'glass-panel card';
      card.style.padding = '10px 12px';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '5px';
      
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:#fff; font-size:0.85rem;">${seance.titre}</strong>
          <span style="font-size:0.7rem; color:var(--color-secondary);">${seance.date}</span>
        </div>
        <p style="font-size:0.78rem; color:var(--text-muted); margin:0; line-height:1.3;">${seance.resume || 'Pas de résumé.'}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; font-size:0.7rem; color:var(--text-dim);">
          <span>⏱️ ${seance.duree || 'N/A'} | 📍 ${seance.lieu || 'N/A'}</span>
          <button class="btn btn-secondary" style="padding:2px 8px; font-size:0.65rem;" onclick="window.ArchiveEngine.exportSessionMarkdown('${seance.id}')">📤 Export MD</button>
        </div>
      `;
      listEl.appendChild(card);
    });
  },

  openCreateSessionModal() {
    const modal = document.getElementById('create-session-modal');
    if (!modal) return;
    
    const selectChapter = document.getElementById('new-session-chapter');
    if (selectChapter && AppState.db) {
      selectChapter.innerHTML = '';
      if (AppState.db.chapitres && AppState.db.chapitres.length > 0) {
        AppState.db.chapitres.forEach(c => {
          selectChapter.innerHTML += `<option value="${c.id}">${c.titre}</option>`;
        });
      } else {
        selectChapter.innerHTML = '<option value="">-- Aucun chapitre --</option>';
      }
    }

    const dateInput = document.getElementById('new-session-date');
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }

    document.getElementById('new-session-title').value = '';
    document.getElementById('new-session-lieu').value = '';
    modal.classList.add('active');
  },

  createNewSession(title, date, lieu, chapId) {
    const db = AppState.db;
    if (!db) return;

    const newId = `seance_${Date.now()}`;
    const newSess = {
      id: newId,
      date: date,
      titre: title,
      duree: "",
      chapitreId: chapId,
      lieu: lieu,
      personnages: [],
      evenements: [],
      combats: [],
      secretsReveles: [],
      resume: ""
    };

    db.seances.push(newSess);
    AppState.activeSessionId = newId;
    localStorage.setItem("mj_copilot_active_session_id", newId);
    
    AppState.sessionLogs = [];
    localStorage.setItem("mj_copilot_session_logs", "[]");
    
    AppState.playerState.sessionTitle = title;
    AppState.playerState.notes = `Lieu principal : ${lieu || 'Non spécifié'}. Résumé : En cours...`;
    
    window.CampaignEngine.saveDatabase();
    this.updateSessionsUI();
    showNotification(`Séance "${title}" commencée !`, "success");
  },

  openCloseSessionModal() {
    const modal = document.getElementById('close-session-modal');
    if (!modal) return;

    const container = document.getElementById('close-session-events-preview');
    if (container) {
      container.innerHTML = '';
      if (AppState.sessionLogs.length === 0) {
        container.innerHTML = '<div style="color:var(--text-dim); text-align:center;">Aucun événement consigné.</div>';
      } else {
        AppState.sessionLogs.forEach(log => {
          container.innerHTML += `
            <div style="border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:4px; font-size:0.75rem;">
              <span style="color:var(--color-secondary); font-weight:700;">[${log.type.toUpperCase()}]</span> 
              <strong>${log.title}</strong> : ${log.description}
            </div>
          `;
        });
      }
    }

    document.getElementById('close-session-summary').value = '';
    document.getElementById('close-session-duree').value = '3h';
    modal.classList.add('active');
  },

  closeActiveSession(summary, duree) {
    const db = AppState.db;
    if (!db || !AppState.activeSessionId) return;

    const seance = db.seances.find(s => s.id === AppState.activeSessionId);
    if (!seance) return;

    seance.resume = summary;
    seance.duree = duree;
    
    // Déplacer les logs de session vers les archives globales
    if (!db.evenements) db.evenements = [];
    AppState.sessionLogs.forEach(log => {
      if (!db.evenements.some(e => e.id === log.id)) {
        db.evenements.push({
          id: log.id,
          titre: log.title,
          description: log.description,
          date: seance.date,
          type: log.type
        });
        if (!seance.evenements) seance.evenements = [];
        seance.evenements.push(log.id);
      }
    });

    AppState.activeSessionId = null;
    localStorage.removeItem("mj_copilot_active_session_id");
    AppState.sessionLogs = [];
    localStorage.setItem("mj_copilot_session_logs", "[]");

    // Mettre à jour les fichiers XML des joueurs sur le disque
    if (db.personnages && db.personnages.length > 0) {
      db.personnages.forEach(async (pj) => {
        const xmlFile = pj.xmlFilename || `${pj.nom}.xml`;
        console.log(`Tentative de mise à jour du fichier XML joueur: ${xmlFile}`);
        try {
          const response = await fetch("http://127.0.0.1:8001/api/update-player-xml", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              filename: xmlFile,
              level: parseInt(pj.niveau) || 1,
              xp: (pj.xp || "").toString(),
              gp: parseInt(pj.gp) || 0
            })
          });
          if (response.ok) {
            const result = await response.json();
            console.log(`Mise à jour XML réussie pour ${pj.nom}:`, result);
          } else {
            console.warn(`Échec de la mise à jour XML pour ${pj.nom}`);
          }
        } catch (err) {
          console.warn(`Erreur réseau lors de la mise à jour XML pour ${pj.nom}:`, err);
        }
      });
    }

    AppState.playerState.sessionTitle = "Aucune séance active";
    AppState.playerState.notes = "Prêt pour la prochaine aventure.";

    window.CampaignEngine.saveDatabase();
    this.updateSessionsUI();
    showNotification(`Séance "${seance.titre}" clôturée et archivée !`, "success");
  },

  async generateAISessionSummary() {
    const btn = document.getElementById('btn-ai-generate-summary');
    const summaryTextarea = document.getElementById('close-session-summary');
    if (!summaryTextarea) return;

    if (AppState.sessionLogs.length === 0) {
      showNotification("Aucun événement consigné pour générer un résumé.", "error");
      return;
    }

    const oldBtnText = btn.textContent;
    btn.textContent = "⌛ Génération...";
    btn.disabled = true;

    const eventsList = AppState.sessionLogs.map(l => `- [${l.type.toUpperCase()}] ${l.title} : ${l.description}`).join('\n');
    const prompt = `Voici la liste des événements qui se sont déroulés lors de notre séance de jeu de rôle :\n${eventsList}\n\nRédige un résumé narratif fluide, immersif et structuré (en français, de 2 à 3 courts paragraphes) résumant cette séance de jeu pour les archives du MJ. Rédige à la troisième personne du pluriel (les personnages / les aventuriers). Ne mets pas de titres de chapitres, écris directement le récit.`;

    try {
      const systemPrompt = "Tu es un assistant de jeu de rôle. Tu rédiges des comptes-rendus de séances immersifs et clairs basés sur les notes brutes du MJ.";
      let responseText = "";

      if (window.AIAssistantEngine && typeof window.AIAssistantEngine.callAI === 'function') {
        responseText = await window.AIAssistantEngine.callAI(prompt, systemPrompt);
      } else {
        responseText = "Les aventuriers ont poursuivi leur quête dans la région de Brumeval. Lors de cette séance marquée par des affrontements majeurs, ils ont réussi à surmonter les obstacles dressés sur leur chemin et à débloquer de précieux indices pour la suite de leur voyage.";
      }

      summaryTextarea.value = responseText.trim();
      showNotification("Résumé généré avec succès !", "success");
    } catch (error) {
      console.error(error);
      showNotification("Erreur lors de la génération par l'IA : " + error.message, "error");
    } finally {
      btn.textContent = oldBtnText;
      btn.disabled = false;
    }
  }
};
