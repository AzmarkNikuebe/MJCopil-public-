window.EventEngine = {
  recognition: null,
  isListening: false,

  toggleSpeechRecognition() {
    const micBtn = document.getElementById('btn-voice-input');
    const input = document.getElementById('quick-note-input');
    if (!micBtn || !input) return;

    if (this.isListening) {
      if (this.recognition) this.recognition.stop();
      this.isListening = false;
      micBtn.classList.remove('listening');
      micBtn.textContent = "🎙️";
      showNotification("Dictée vocale arrêtée.", "info");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showNotification("La reconnaissance vocale n'est pas supportée par votre navigateur (Utilisez Chrome ou Edge).", "error");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'fr-FR';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onstart = () => {
      this.isListening = true;
      micBtn.classList.add('listening');
      micBtn.textContent = "🛑 Écoute...";
      showNotification("Microphone actif. Parlez...", "info");
    };

    this.recognition.onerror = (e) => {
      console.error(e);
      showNotification("Erreur vocale : " + e.error, "error");
      this.isListening = false;
      micBtn.classList.remove('listening');
      micBtn.textContent = "🎙️";
    };

    this.recognition.onend = () => {
      this.isListening = false;
      micBtn.classList.remove('listening');
      micBtn.textContent = "🎙️";
    };

    this.recognition.onresult = (e) => {
      const resultText = e.results[0][0].transcript;
      input.value = (input.value + " " + resultText).trim();
      showNotification("Texte capturé !", "success");
    };

    this.recognition.start();
  },

  renderSessionLogs() {
    const container = document.getElementById('session-logs-list');
    if (!container) return;
    
    container.innerHTML = "";
    
    if (!AppState.activeSessionId) {
      container.innerHTML = `
        <div style="text-align:center; padding:20px; color:var(--text-dim); font-size:0.8rem; line-height:1.4;">
          Séance inactive. Ouvrez une séance pour consigner des événements.
        </div>
      `;
      return;
    }

    if (AppState.sessionLogs.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:20px; color:var(--text-dim); font-size:0.8rem;">
          Aucun événement dans cette séance.
        </div>
      `;
      return;
    }
    
    AppState.sessionLogs.forEach(log => {
      const item = document.createElement('div');
      item.className = 'log-item';
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.alignItems = 'flex-start';
      item.style.padding = '8px';
      item.style.background = 'rgba(255,255,255,0.02)';
      item.style.border = '1px solid var(--glass-border)';
      item.style.borderRadius = '6px';
      item.style.marginBottom = '6px';
      
      let emoji = "🧭";
      if (log.type === "combat") emoji = "⚔️";
      if (log.type === "dialogue") emoji = "💬";
      if (log.type === "decouverte") emoji = "🔑";
      
      item.innerHTML = `
        <div style="max-width:80%; display:flex; flex-direction:column; gap:2px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-weight:600; color:#fff; font-size:0.82rem;">${emoji} ${log.title}</span>
            <span style="font-size:0.65rem; color:var(--text-dim);">[${log.timestamp}]</span>
          </div>
          <span style="font-size:0.78rem; color:var(--text-muted); line-height:1.3;">${log.description}</span>
        </div>
        <div style="display:flex; gap:6px; align-items:center;">
          <button class="btn" style="padding:2px 4px; font-size:0.7rem; color:#ff6b6b; background:none; border:none;" onclick="window.EventEngine.deleteSessionLog('${log.id}')">✕</button>
        </div>
      `;
      
      container.appendChild(item);
    });
  },

  handleSessionEventAdd(e) {
    e.preventDefault();
    if (!AppState.activeSessionId) {
      showNotification("Démarrez d'abord une séance active.", "error");
      return;
    }

    const titleInput = document.getElementById('event-title');
    const typeInput = document.getElementById('event-type');
    const descInput = document.getElementById('event-desc');
    
    if (!titleInput || !typeInput || !descInput) return;
    
    const title = titleInput.value.trim();
    const type = typeInput.value;
    const desc = descInput.value.trim();
    
    if (!title || !desc) return;
    
    const log = {
      id: `evt_session_${Date.now()}`,
      title: title,
      type: type,
      description: desc,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    
    AppState.sessionLogs.push(log);
    localStorage.setItem("mj_copilot_session_logs", JSON.stringify(AppState.sessionLogs));
    
    this.renderSessionLogs();
    
    // Mettre à jour l'aperçu du dashboard
    if (window.SessionEngine && typeof window.SessionEngine.renderSessionControlCard === 'function') {
      window.SessionEngine.renderSessionControlCard();
    }
    
    titleInput.value = "";
    descInput.value = "";
    
    showNotification("Événement consigné.", "success");
  },

  deleteSessionLog(id) {
    AppState.sessionLogs = AppState.sessionLogs.filter(x => x.id !== id);
    localStorage.setItem("mj_copilot_session_logs", JSON.stringify(AppState.sessionLogs));
    this.renderSessionLogs();
    if (window.SessionEngine && typeof window.SessionEngine.renderSessionControlCard === 'function') {
      window.SessionEngine.renderSessionControlCard();
    }
  },

  async reformulateQuickNote() {
    const btn = document.getElementById('btn-reformulate-note');
    const input = document.getElementById('quick-note-input');
    const previewBox = document.getElementById('reformulated-preview-box');
    const previewTextarea = document.getElementById('reformulated-text');
    
    if (!input || !btn || !previewBox || !previewTextarea) return;

    const rawText = input.value.trim();
    if (!rawText) {
      showNotification("Veuillez saisir une note rapide.", "error");
      return;
    }

    const oldBtnText = btn.textContent;
    btn.textContent = "⌛";
    btn.disabled = true;

    const prompt = `Convertis cette note brute en UNE SEULE phrase de compte-rendu claire et concise (maximum 20 mots) pour le journal de quête :\n"${rawText}"\nRéponds directement par la phrase sans introduction.`;

    try {
      const systemPrompt = "Tu es l'assistant du Maître du Jeu. Tu reformules les notes brutes en UNE SEULE phrase narrative concise (maximum 20 mots) prête pour le journal.";
      let responseText = "";

      if (window.AIAssistantEngine && typeof window.AIAssistantEngine.callAI === 'function') {
        responseText = await window.AIAssistantEngine.callAI(prompt, systemPrompt, { maxTokens: 35, isStandalone: true, temperature: 0.2 });
      } else {
        responseText = `Les aventuriers ont accompli l'action suivante : ${rawText}.`;
      }

      previewTextarea.value = responseText.trim().replace(/^["']|["']$/g, '');
      previewBox.style.display = 'flex';
    } catch (error) {
      console.error(error);
      showNotification("Erreur de reformulation : " + error.message, "error");
    } finally {
      btn.textContent = oldBtnText;
      btn.disabled = false;
    }
  },

  integrateReformulatedNote(text) {
    let type = "exploration";
    const textLower = text.toLowerCase();
    if (textLower.includes("combat") || textLower.includes("tue") || textLower.includes("mort") || textLower.includes("vaincu") || textLower.includes("affronte")) {
      type = "combat";
    } else if (textLower.includes("parle") || textLower.includes("discute") || textLower.includes("rencontre") || textLower.includes("révèle") || textLower.includes("dit")) {
      type = "dialogue";
    } else if (textLower.includes("découvre") || textLower.includes("trouve") || textLower.includes("secret") || textLower.includes("apprend")) {
      type = "decouverte";
    }

    let title = "Événement marquant";
    if (text.length > 30) {
      title = text.split(" ").slice(0, 5).join(" ") + "...";
    } else {
      title = text;
    }

    const log = {
      id: `evt_session_${Date.now()}`,
      title: title,
      type: type,
      description: text,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    AppState.sessionLogs.push(log);
    localStorage.setItem("mj_copilot_session_logs", JSON.stringify(AppState.sessionLogs));
    this.renderSessionLogs();

    if (window.SessionEngine && typeof window.SessionEngine.renderSessionControlCard === 'function') {
      window.SessionEngine.renderSessionControlCard();
    }

    document.getElementById('reformulated-preview-box').style.display = 'none';
    document.getElementById('quick-note-input').value = '';

    showNotification("Événement reformulé consigné.", "success");
  },

  async analyzeConsequences() {
    const btn = document.getElementById('btn-analyze-consequences');
    const container = document.getElementById('consequences-proposed-container');
    if (!btn || !container) return;

    if (AppState.sessionLogs.length === 0) {
      showNotification("Veuillez d'abord consigner des événements dans le journal.", "error");
      return;
    }

    const oldBtnText = btn.textContent;
    btn.textContent = "⌛ Analyse...";
    btn.disabled = true;
    
    container.innerHTML = '<div style="text-align:center; padding:15px; color:var(--text-dim); font-size:0.75rem;">L\'IA analyse le journal par rapport aux PNJs et factions...</div>';

    // Récupérer le prompt
    const prompt = this.buildConsequencesAnalysisPrompt();
    const systemPrompt = "Tu es un module d'analyse sémantique JDR. Tu réponds UNIQUEMENT par un tableau JSON [ ... ] contenant les conséquences. Pas de texte avant ou après.";

    try {
      let responseText = "";
      if (window.AIAssistantEngine && typeof window.AIAssistantEngine.callAI === 'function') {
        responseText = await window.AIAssistantEngine.callAI(prompt, systemPrompt, { maxTokens: 400, isStandalone: true, temperature: 0.2 });
      } else {
        responseText = `[
          {
            "id": "cons_1",
            "type": "relation",
            "cible": "Maire",
            "valeur": -1,
            "description": "La découverte du complot dégrade la confiance du village envers le maire."
          }
        ]`;
      }

      // Nettoyer et parser de façon ultra-robuste
      const cleanAndParseJSON = (str) => {
        let clean = str.replace(/```json/gi, "").replace(/```/g, "").trim();
        const start = clean.indexOf('[');
        const end = clean.lastIndexOf(']');
        
        if (start !== -1 && end !== -1 && end > start) {
          let jsonContent = clean.substring(start, end + 1);
          try {
            return JSON.parse(jsonContent);
          } catch (e) {
            // Nettoyage des virgules traînantes
            try {
              let repaired = jsonContent.replace(/,\s*([}\]])/g, '$1');
              return JSON.parse(repaired);
            } catch (e2) {}
          }
        }

        // Fallback si le modèle a répondu sous forme de texte ou de liste à puces
        const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 5 && !l.startsWith('[{') && !l.startsWith('{'));
        if (lines.length > 0) {
          return lines.slice(0, 4).map((line, idx) => {
            const cleanLine = line.replace(/^[-*•0-9.)\s]+/, '').replace(/^\[.*?\]/, '').trim();
            let type = "impact";
            if (line.toLowerCase().includes("relation") || line.toLowerCase().includes("confiance") || line.toLowerCase().includes("haine")) type = "relation";
            else if (line.toLowerCase().includes("secret") || line.toLowerCase().includes("mystère")) type = "secret";
            else if (line.toLowerCase().includes("faction") || line.toLowerCase().includes("garde")) type = "faction";

            return {
              id: `cons_auto_${Date.now()}_${idx}`,
              type: type,
              cible: "Monde / PNJ",
              valeur: 1,
              description: cleanLine
            };
          });
        }

        return [];
      };

      const proposals = cleanAndParseJSON(responseText);
      AppState.proposedConsequences = proposals;
      
      this.renderProposedConsequences();
    } catch (error) {
      console.error(error);
      container.innerHTML = `<div style="color:#ff6b6b; padding:10px; font-size:0.75rem;">Erreur d'analyse : ${error.message}.</div>`;
    } finally {
      btn.textContent = oldBtnText;
      btn.disabled = false;
    }
  },

  buildConsequencesAnalysisPrompt() {
    const db = AppState.db;
    const combinedLogs = AppState.sessionLogs.map(l => `- [${l.type}] ${l.title} : ${l.description}`).join('\n');
    
    let pnjsList = db.pnjs.map(p => `- ID: "${p.id}", Nom: "${p.nom}"`).join('\n');
    let factionsList = db.factions.map(f => `- ID: "${f.id}", Nom: "${f.nom}"`).join('\n');
    let secretsList = db.secrets.map(s => `- ID: "${s.id}", Titre: "${s.titre}", Découvert: ${s.decouverte}`).join('\n');

    return `Tu es un module d'analyse sémantique pour un logiciel de jeu de rôle (Copilote MJ).
Ton rôle est d'analyser le Journal de Séance d'une partie de jeu de rôle et de proposer des conséquences structurées (mutations de base de données) à appliquer sur le Codex de la campagne.

Voici les événements de la séance actuelle :
${combinedLogs}

Voici les entités disponibles dans la base de données locale (Codex) :
PERSONNAGES :
${pnjsList}

FACTIONS :
${factionsList}

SECRETS :
${secretsList}

Instructions d'analyse :
1. Examine chaque événement de la séance.
2. Identifie les impacts relationnels (ex: des PJ qui aident un PNJ augmente la relation de confiance de ce PNJ envers les PJ; un PNJ qui trahit un autre PNJ dégrade leur relation).
3. Identifie si un secret a été découvert (ex: les PJ découvrent la vérité sur le pacte du maire, donc le secret lié au maire doit passer à découvert).
4. Propose entre 2 et 4 conséquences majeures et logiques sous forme de JSON uniquement.
5. IMPORTANT : Ne mets absolument aucun retour à la ligne à l'intérieur des chaînes de caractères de ton JSON.
6. IMPORTANT : Échappe correctement tous les guillemets internes doubles (ex: \"La Machine d'Honor\" et non "La Machine d'Honor").
Format d'exemple :
[
  {
    "id": "id_consequence_unique",
    "type": "relation",
    "cible": "Maire",
    "valeur": -1,
    "description": "La relation avec le maire se dégrade suite à vos accusations publiques."
  },
  {
    "id": "id_consequence_unique_2",
    "type": "secret",
    "cible": "secret2",
    "valeur": true,
    "description": "Le secret du complot du maire est maintenant révélé au grand jour."
  }
]`;
  },

  renderProposedConsequences() {
    const container = document.getElementById('consequences-proposed-container');
    const applyBtn = document.getElementById('btn-apply-consequences');
    if (!container) return;

    container.innerHTML = "";

    if (!AppState.proposedConsequences || AppState.proposedConsequences.length === 0) {
      container.innerHTML = '<div style="color:var(--text-dim); text-align:center; padding:20px;">Aucune conséquence détectée par l\'IA.</div>';
      if (applyBtn) applyBtn.style.display = 'none';
      return;
    }

    AppState.proposedConsequences.forEach(cons => {
      const div = document.createElement('div');
      div.className = 'glass-panel card';
      div.style.padding = '8px 10px';
      div.style.display = 'flex';
      div.style.gap = '8px';
      div.style.alignItems = 'flex-start';
      div.style.fontSize = '0.8rem';
      div.style.border = '1px solid rgba(157, 78, 221, 0.2)';
      
      div.innerHTML = `
        <input type="checkbox" checked data-id="${cons.id}" style="margin-top:3px;">
        <div style="flex:1;">
          <div style="font-weight:700; color:var(--color-primary);">[${cons.type.toUpperCase()}] ${cons.cible}</div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${cons.description}</div>
        </div>
      `;
      container.appendChild(div);
    });

    if (applyBtn) applyBtn.style.display = 'block';
  },

  applyConsequences() {
    const container = document.getElementById('consequences-proposed-container');
    if (!container || !AppState.proposedConsequences) return;

    const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
    const db = AppState.db;
    if (!db) return;
    
    let appliedCount = 0;
    let appliedDetails = [];

    checkboxes.forEach(cb => {
      const id = cb.dataset.id;
      const cons = AppState.proposedConsequences.find(c => c.id === id);
      if (!cons) return;

      appliedCount++;
      const targetStr = (cons.cible || "").toLowerCase().trim();

      if (cons.type === 'relation' || cons.type === 'pnj') {
        // Recherche souple du PNJ
        const pnj = (db.pnjs || []).find(p => 
          p.id === cons.cible || 
          p.nom.toLowerCase().includes(targetStr) || 
          targetStr.includes(p.nom.toLowerCase())
        );
        if (pnj) {
          if (!Array.isArray(pnj.relations)) pnj.relations = [];
          let rel = pnj.relations.find(r => r.cible === 'Joueurs' || r.cible === 'PJ');
          const delta = typeof cons.valeur === 'number' ? cons.valeur : 1;
          if (rel) {
            rel.valeur = Math.min(3, Math.max(-3, (rel.valeur || 0) + delta));
            rel.description = cons.description || rel.description;
          } else {
            pnj.relations.push({ cible: 'Joueurs', type: 'IA impact', valeur: delta, description: cons.description || '' });
          }
          appliedDetails.push(`PNJ "${pnj.nom}" (relation ${delta > 0 ? '+' : ''}${delta})`);
        } else {
          // Recherche souple de faction
          const faction = (db.factions || []).find(f => 
            f.id === cons.cible || 
            f.nom.toLowerCase().includes(targetStr) || 
            targetStr.includes(f.nom.toLowerCase())
          );
          if (faction) {
            if (!faction.description) faction.description = "";
            faction.description += `\n• [Événement] ${cons.description}`;
            appliedDetails.push(`Faction "${faction.nom}" enrichie`);
          }
        }
      } else if (cons.type === 'secret') {
        const sec = (db.secrets || []).find(s => 
          s.id === cons.cible || 
          (s.titre && s.titre.toLowerCase().includes(targetStr)) || 
          (s.nom && s.nom.toLowerCase().includes(targetStr)) ||
          targetStr.includes((s.titre || s.nom || '').toLowerCase())
        );
        if (sec) {
          sec.decouverte = true;
          appliedDetails.push(`Secret "${sec.titre || sec.nom}" marqué comme DÉCOUVERT`);
        }
      } else if (cons.type === 'faction') {
        const faction = (db.factions || []).find(f => 
          f.id === cons.cible || 
          f.nom.toLowerCase().includes(targetStr) || 
          targetStr.includes(f.nom.toLowerCase())
        );
        if (faction) {
          if (!faction.description) faction.description = "";
          faction.description += `\n• [Évolution] ${cons.description}`;
          appliedDetails.push(`Faction "${faction.nom}" mise à jour`);
        }
      }

      // Enregistrer systématiquement un événement daté dans la chronologie de la campagne
      if (!Array.isArray(db.evenements)) db.evenements = [];
      db.evenements.push({
        id: `evt_cons_${Date.now()}_${appliedCount}`,
        titre: `Conséquence : ${cons.cible || 'Événement'}`,
        type: cons.type || 'lore',
        description: cons.description,
        date: new Date().toLocaleDateString('fr-FR')
      });
    });

    // Sauvegarde immédiate dans la base de données de la campagne
    window.CampaignEngine.saveDatabase();
    
    // Rafraîchir les onglets Lore & Encyclopédie si ouverts
    if (window.WorldEngine && typeof window.WorldEngine.renderWorldEntities === 'function') {
      window.WorldEngine.renderWorldEntities();
    }
    
    AppState.proposedConsequences = [];
    this.renderProposedConsequences();
    
    const summaryMsg = appliedDetails.length > 0 
      ? `✅ ${appliedCount} conséquence(s) intégrée(s) au Codex :\n• ${appliedDetails.join('\n• ')}`
      : `✅ ${appliedCount} conséquence(s) enregistrée(s) dans la chronologie du Codex !`;
    
    showNotification(summaryMsg, "success");
  }
};
