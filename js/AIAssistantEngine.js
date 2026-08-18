window.AIAssistantEngine = {
  savedResponses: [],

  buildSystemInstruction() {
    const db = AppState.db;
    if (!db || !db.campagne || db.campagne.id === 'camp_new') {
      return "Tu es l'assistant du Maître du Jeu (Copilote MJ). L'utilisateur n'a pas encore chargé de Codex.";
    }

    const opt = AppState.aiConfig.contextOptimization || 'standard';
    const camp = db.campagne;

    if (opt === 'ultra-light') {
      // Mode Ultra-léger pour Ollama local (pas de markdown, descriptions minimales)
      let text = `Assistant JDR Copilote MJ. Campagne: ${camp.titre}. Style: ${camp.style_visuel || 'fantasy'}. Description: ${camp.description}. `;

      // Lieu actif actuel uniquement
      let activeLieu = null;
      if (AppState.activeSessionId) {
        const seance = (db.seances || []).find(s => s.id === AppState.activeSessionId);
        if (seance && seance.lieu) {
          activeLieu = (db.lieux || []).find(l => l.nom.toLowerCase().includes(seance.lieu.toLowerCase()) || l.id === seance.lieu);
        }
      }
      if (activeLieu) {
        text += `Lieu actuel: ${activeLieu.nom} (${activeLieu.description}). `;
      }

      // Liste minimaliste des joueurs
      if (db.personnages && db.personnages.length > 0) {
        text += "PJ: ";
        (db.personnages || []).forEach(pj => {
          text += `${pj.nom} (${pj.classe}, niv ${pj.niveau}, PV ${pj.pointsVie}/${pj.pointsVieMax}, CA: ${pj.ca || 10}, etats: ${(pj.etats || []).join(',') || 'aucun'}). `;
        });
      }

      // PNJ pertinents uniquement
      let relevantNPCs = [];
      if (activeLieu) {
        relevantNPCs = (db.pnjs || []).filter(p => p.localisation === activeLieu.id);
      }
      if (relevantNPCs.length === 0 && (db.pnjs || []).length > 0) {
        relevantNPCs = (db.pnjs || []).slice(0, 3);
      }
      if (relevantNPCs.length > 0) {
        text += "PNJ presents: ";
        relevantNPCs.forEach(p => {
          text += `${p.nom} (${p.role}): ${p.description}. `;
        });
      }

      // Journal de séance réduit aux 5 derniers événements
      if (AppState.sessionLogs && AppState.sessionLogs.length > 0) {
        text += "Evenements récents: ";
        AppState.sessionLogs.slice(-5).forEach(l => {
          text += `[${l.timestamp}] ${l.title}: ${l.description}. `;
        });
      }

      text += "Réponds en français de façon ultra-directe (2 phrases max), sans préambule ni résumé. Réagis à l'action immédiate des joueurs par 1 dialogue de PNJ présent ou 1 événement physique instantané dans le lieu actuel. N'utilise AUCUN formatage Markdown (pas de gras, pas de puces, pas d'étoiles, pas de titres).";
      return text;
    }

    if (opt === 'optimized') {
      // Mode Optimisé (Filtrage dynamique et structure claire)
      let text = `Tu es l'assistant de jeu de rôle (Copilote MJ). Ton but est d'aider le MJ à gérer sa partie.
Voici le Codex de la campagne :
- Campagne : ${camp.titre}
- Description : ${camp.description}
- Style : ${camp.style_visuel || 'fantasy_realiste'}
`;

      // Séance et chapitre actifs
      let activeLieu = null;
      if (AppState.activeSessionId) {
        const seance = (db.seances || []).find(s => s.id === AppState.activeSessionId);
        if (seance) {
          const chap = (db.chapitres || []).find(c => c.id === seance.chapitreId);
          text += `\n### CADRE ACTIF :\n`;
          text += `- Séance : "${seance.titre}" (Lieu: ${seance.lieu || 'Non spécifié'})\n`;
          if (chap) {
            text += `- Chapitre : "${chap.titre}" - ${chap.description}\n`;
          }
          if (seance.lieu) {
            activeLieu = (db.lieux || []).find(l => l.nom.toLowerCase().includes(seance.lieu.toLowerCase()) || l.id === seance.lieu);
          }
        }
      }

      // Personnages Joueurs
      text += `\n### PERSONNAGES DES JOUEURS (PJ) :\n`;
      if (db.personnages && db.personnages.length > 0) {
        (db.personnages || []).forEach(pj => {
          text += `- ${pj.nom} (${pj.classe}, Niv: ${pj.niveau}, PV: ${pj.pointsVie}/${pj.pointsVieMax}, CA: ${pj.ca || 10}, États: ${(pj.etats || []).join(', ') || 'aucun'})\n`;
        });
      }

      // Lieux : Détails sur le lieu actif, simple liste pour le reste
      text += `\n### LIEUX :\n`;
      if (activeLieu) {
        text += `- [ACTUEL] ${activeLieu.nom} (${activeLieu.type}) : ${activeLieu.description}\n`;
      }
      const otherLieux = (db.lieux || []).filter(l => !activeLieu || l.id !== activeLieu.id);
      if (otherLieux.length > 0) {
        text += `- Autres lieux connus: ${otherLieux.map(l => l.nom).join(', ')}\n`;
      }

      // PNJ : Détails pour les PNJ présents localement, simple liste pour les autres
      text += `\n### PERSONNAGES NON-JOUEURS (PNJ) :\n`;
      let localNPCs = [];
      let otherNPCs = [];
      (db.pnjs || []).forEach(p => {
        if (activeLieu && p.localisation === activeLieu.id) {
          localNPCs.push(p);
        } else {
          otherNPCs.push(p);
        }
      });
      if (localNPCs.length === 0 && (db.pnjs || []).length > 0) {
        localNPCs = (db.pnjs || []).slice(0, 3);
        otherNPCs = (db.pnjs || []).slice(3);
      }
      localNPCs.forEach(p => {
        text += `- ${p.nom} (${p.role}) [Présent] : ${p.description}\n`;
      });
      if (otherNPCs.length > 0) {
        text += `- Autres PNJ: ${otherNPCs.map(p => `${p.nom} (${p.role})`).join(', ')}\n`;
      }

      // Factions : seulement la description si mentionnée dans les logs récents ou le lieu actif, sinon juste le nom
      if (db.factions && db.factions.length > 0) {
        text += `\n### FACTIONS :\n`;
        const logsText = (AppState.sessionLogs || []).slice(-10).map(l => (l.title + ' ' + l.description).toLowerCase()).join(' ');
        const activeLieuText = activeLieu ? (activeLieu.nom + ' ' + activeLieu.description).toLowerCase() : '';
        const contextSearchText = logsText + ' ' + activeLieuText;
        
        (db.factions || []).forEach(f => {
          const isRelevant = contextSearchText.includes(f.nom.toLowerCase());
          if (isRelevant) {
            text += `- ${f.nom} : ${f.description}\n`;
          } else {
            text += `- ${f.nom}\n`;
          }
        });
      }

      // Secrets actifs uniquement (limité aux 5 plus pertinents/récents pour économiser les tokens)
      const activeSecrets = (db.secrets || []).filter(s => !s.decouverte).slice(0, 5);
      if (activeSecrets.length > 0) {
        text += `\n### SECRETS EN COURS (Max 5) :\n`;
        activeSecrets.forEach(s => {
          text += `- Secret: "${s.titre}" (Non résolu)\n`;
        });
      }

      // Journal de séance réduit aux 10 derniers événements
      text += `\n### JOURNAL DE SÉANCE EN COURS :\n`;
      if (AppState.sessionLogs && AppState.sessionLogs.length > 0) {
        AppState.sessionLogs.slice(-10).forEach(l => {
          text += `- [${l.timestamp}] ${l.title} : ${l.description}\n`;
        });
      } else {
        text += "- Aucun événement consigné.\n";
      }

      text += `\n### INSTRUCTIONS DE RÉPONSE (RÔLE DE COPILOTE MJ) :
1. ANCRAGE DANS L'ACTION : Réagis à l'action instantanée des joueurs dans le lieu actuel. Propose des répliques de dialogue (en gras) ou des micro-événements physiques immédiats.
2. MAÎTRE DU DONJON (D&D 5E) : Comporte-toi comme un DM strict. Ne décide jamais de la réussite d'une action risquée sans un jet de dés. Exige des jets de caractéristiques ou de compétences spécifiques (ex: "Demande un jet de Force DD 15"). Gère la Classe d'Armure (CA) et l'Initiative lors des combats.
3. LIEN AUX FAITS & SECRETS : Fais écho aux derniers événements du journal et aux secrets actifs de la campagne dans tes propositions.
4. CONCISION : Réponds en français de façon immersive, concise et pratique (1-2 paragraphes). Utilise le formatage Markdown.`;

      return text;
    }

    // Mode Standard (par défaut, injecte tout le Codex brute)
    let text = `Tu es l'assistant de jeu de rôle (Copilote MJ). Ton but est d'aider le MJ à gérer et improviser sa partie en direct.
Voici le Codex (contexte complet) de la campagne de jeu :
- Campagne : ${camp.titre}
- Description : ${camp.description}
- Style visuel de la campagne : ${camp.style_visuel || 'fantasy_realiste'}
`;

    if (AppState.activeSessionId) {
      const seance = (db.seances || []).find(s => s.id === AppState.activeSessionId);
      if (seance) {
        const chap = (db.chapitres || []).find(c => c.id === seance.chapitreId);
        text += `\n### SÉANCE ACTIVE EN COURS (ÉPISODE ACTUEL) :\n`;
        text += `- Séance : "${seance.titre}" (Lieu de départ: ${seance.lieu || 'Non spécifié'}, Date: ${seance.date})\n`;
        if (chap) {
          text += `- Chapitre Actif : "${chap.titre}" - ${chap.description || 'Pas de description.'}\n`;
        }
        text += `- Résumé initial / Notes : ${seance.resume || 'Aucune note pour le moment.'}\n`;
      }
    }

    text += `\n### PERSONNAGES DES JOUEURS (PJ) :\n`;
    if (db.personnages && db.personnages.length > 0) {
      (db.personnages || []).forEach(pj => {
        const joueur = (db.joueurs || []).find(j => j.id === pj.joueurId);
        const joueurNom = joueur ? joueur.nom : 'Inconnu';
        let attrsText = (pj.attributs || []).map(a => `${a.nom}: ${a.valeur}`).join(", ");
        text += `- PJ : ${pj.nom} (Classe/Race: ${pj.classe}, Niveau: ${pj.niveau}, PV: ${pj.pointsVie}/${pj.pointsVieMax}, CA: ${pj.ca || 10}, États: ${(pj.etats || []).join(', ') || 'aucun'}, Joué par: ${joueurNom}) | Stats: ${attrsText}\n`;
      });
    } else {
      text += "Aucun PJ défini.\n";
    }

    text += `\n### OBJETS & ARTEFACTS :\n`;
    if (db.objets && db.objets.length > 0) {
      (db.objets || []).forEach(obj => {
        let ownerText = "Non possédé";
        if (obj.possesseur) {
          const pnjOwner = (db.pnjs || []).find(p => p.id === obj.possesseur);
          const pjOwner = (db.personnages || []).find(p => p.id === obj.possesseur);
          ownerText = pnjOwner ? `Possédé par PNJ: ${pnjOwner.nom}` : (pjOwner ? `Possédé par PJ: ${pjOwner.nom}` : `Possesseur ID: ${obj.possesseur}`);
        }
        text += `- ${obj.nom} (Type: ${obj.type}) : ${obj.description || 'Pas de description'} | ${ownerText}\n`;
      });
    } else {
      text += "Aucun objet défini.\n";
    }

    text += `\n### LIEUX & CARTES :\n`;
    if (db.lieux && db.lieux.length > 0) {
      (db.lieux || []).forEach(l => {
        text += `- ${l.nom} (Type: ${l.type}) : ${l.description}\n`;
      });
    } else {
      text += "Aucun lieu défini.\n";
    }

    text += `\n### PERSONNAGES NON-JOUEURS (PNJ) :\n`;
    if (db.pnjs && db.pnjs.length > 0) {
      (db.pnjs || []).forEach(p => {
        let relationsText = "";
        if (db.relations) {
          const rels = (db.relations || []).filter(r => r.source === p.id || r.cible === p.id);
          if (rels.length > 0) {
            relationsText = " Relations: " + rels.map(r => {
              const cibleNom = (db.pnjs || []).find(x => x.id === (r.source === p.id ? r.cible : r.source))?.nom || 
                               (db.factions || []).find(x => x.id === (r.source === p.id ? r.cible : r.source))?.nom || 
                               r.cible;
              return `avec ${cibleNom} (${r.type}, valeur: ${r.valeur})`;
            }).join(", ");
          }
        }
        text += `- ${p.nom} (Rôle: ${p.role}) : ${p.description || "Pas de description"}.${relationsText}\n`;
      });
    } else {
      text += "Aucun PNJ défini.\n";
    }

    text += `\n### FACTIONS & CLANS :\n`;
    if (db.factions && db.factions.length > 0) {
      (db.factions || []).forEach(f => {
        text += `- ${f.nom} : ${f.description || "Pas de description"}\n`;
      });
    } else {
      text += "Aucune faction définie.\n";
    }

    text += `\n### SECRETS DE LA CAMPAGNE :\n`;
    if (db.secrets && db.secrets.length > 0) {
      (db.secrets || []).forEach(s => {
        text += `- Secret: "${s.titre}" | Statut: ${s.decouverte ? 'DÉCOUVERT / RÉSOLU' : 'CACHÉ / NON RÉSOLU'} | Description: ${s.description}\n`;
      });
    } else {
      text += "Aucun secret défini.\n";
    }

    text += `\n### ÉVÉNEMENTS ARCHIVÉS DES SÉANCES PRÉCÉDENTES :\n`;
    if (db.evenements && db.evenements.length > 0) {
      (db.evenements || []).forEach(e => {
        text += `- Événement (${e.date}) : ${e.titre} - ${e.description}\n`;
      });
    } else {
      text += "Aucun événement archivé.\n";
    }

    text += `\n### ÉVÉNEMENTS DU JOURNAL DE LA SÉANCE ACTUELLE (EN COURS) :\n`;
    if (AppState.sessionLogs && AppState.sessionLogs.length > 0) {
      AppState.sessionLogs.forEach(l => {
        text += `- [${l.timestamp}] ${l.title} (${l.type}) : ${l.description}\n`;
      });
    } else {
      text += "Aucun événement consigné pour le moment.\n";
    }

    text += `\n### INSTRUCTIONS DE RÉPONSE (RÔLE DE COPILOTE MJ) :
1. ANCRAGE DANS L'ACTION : Ne fais pas de longs résumés passifs. Réagis directement à l'action immédiate des joueurs dans le lieu actuel (ici et maintenant).
2. MAÎTRE DU DONJON STRICT (D&D 5E) : C'est une partie de Donjons & Dragons 5e Édition. Tu DOIS agir comme un vrai Dungeon Master. Gère rigoureusement la Classe d'Armure (CA) et les Points de Vie. Ne décide JAMAIS de l'issue d'une action incertaine sans demander un jet de dé (ex: "Faites un jet de sauvegarde de Dextérité DD 14"). Structure les combats en demandant un jet d'Initiative.
3. INTERACTION IMMEDIATE : Propose des répliques de PNJ prêts à jouer (en gras), des bruits, des gestes, ou des micro-événements physiques qui relancent le jeu tout de suite.
4. LIEN AVEC LES SECRETS : Connecte l'improvisation aux événements récents du journal et aux secrets non résolus. Si les PJ s'enivrent ou parlent, un PNJ ou un événement doit faire écho à un secret ou à une intrigue en cours.
5. FORMATAGE PRATIQUE : Rédige en français. Utilise le formatage Markdown. Sois immersif mais utile au MJ en proposant 2 ou 3 choix d'actions ou jets de dés clairs.`;

    if (window.SkillsEngine && typeof window.SkillsEngine.getSkillSystemPrompt === 'function') {
      text += window.SkillsEngine.getSkillSystemPrompt(userQuery);
    }

    return text;
  },

  async ensureOllamaRunning() {
    try {
      // First check if already responding on 11434
      const ping = await fetch("http://127.0.0.1:11434/api/tags", { method: "GET" }).catch(() => null);
      if (ping && ping.ok) return true;

      // Otherwise ask our local backend (8001) to start it automatically
      console.log("[AIAssistant] Réveil automatique du serveur Ollama via le backend...");
      const startRes = await fetch("http://127.0.0.1:8001/api/ollama/start", { method: "POST" }).catch(() => null);
      if (startRes && startRes.ok) {
        const data = await startRes.json();
        return data.running;
      }
    } catch (e) {
      console.warn("[AIAssistant] Impossible de démarrer Ollama automatiquement:", e);
    }
    return false;
  },

  async callAI(userPrompt, systemInstruction, options = {}) {
    const engine = AppState.aiConfig.engine || 'simulation';
    
    if (engine === 'simulation') {
      return `[Simulation IA] Réponse fictive à votre invite : "${userPrompt}". Configurez une clé API Gemini ou OpenAI pour une vraie réponse.`;
    } else if (engine === 'gemini') {
      return await this.callGeminiAPI(userPrompt, systemInstruction, options);
    } else if (engine === 'openai') {
      return await this.callOpenAIAPI(userPrompt, systemInstruction, options);
    } else if (engine === 'ollama') {
      return await this.callOllamaAPI(userPrompt, systemInstruction, options);
    }
    
    throw new Error(`Moteur d'IA inconnu : ${engine}`);
  },

  async callGeminiAPI(userPrompt, systemInstruction, options = {}) {
    const key = AppState.aiConfig.geminiKey;
    const model = AppState.aiConfig.geminiModel || 'gemini-3.5-flash';
    if (!key) throw new Error("Clé API Gemini manquante.");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const contents = [];

    if (!options.isStandalone) {
      const recentHistory = AppState.aiChatHistory.slice(-10);
      recentHistory.forEach(msg => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      });
    }

    contents.push({ role: 'user', parts: [{ text: userPrompt }] });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: { 
          temperature: options.temperature || 0.7, 
          maxOutputTokens: options.maxTokens || 2048 
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Erreur Gemini Status ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Réponse Gemini vide.");
    return text;
  },

  async callOpenAIAPI(userPrompt, systemInstruction, options = {}) {
    const key = AppState.aiConfig.openaiKey;
    const model = AppState.aiConfig.openaiModel || 'gpt-4o-mini';
    if (!key) throw new Error("Clé API OpenAI manquante.");

    const url = 'https://api.openai.com/v1/chat/completions';
    const recentHistory = options.isStandalone ? [] : AppState.aiChatHistory.slice(-10);
    const messages = [
      { role: 'system', content: systemInstruction },
      ...recentHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: userPrompt }
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({ 
        model: model, 
        messages: messages, 
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2048
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Erreur OpenAI Status ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("Réponse OpenAI vide.");
    return text;
  },

  async callOllamaAPI(userPrompt, systemInstruction, options = {}) {
    let host = AppState.aiConfig.ollamaUrl || 'http://localhost:11434';
    const model = AppState.aiConfig.ollamaModel || 'qwen2.5:1.5b';
    if (host.endsWith('/')) host = host.slice(0, -1);

    // Auto-wake Ollama if not running
    await this.ensureOllamaRunning();

    const url = `${host}/api/chat`;
    // If not standalone, include recent chat history
    const recentHistory = options.isStandalone ? [] : AppState.aiChatHistory.slice(-6);
    const messages = [
      { role: 'system', content: systemInstruction },
      ...recentHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: userPrompt }
    ];

    const ollamaOptions = {
      temperature: options.temperature !== undefined ? options.temperature : 0.6,
      num_predict: options.maxTokens || 450, // Generous limit to prevent mid-sentence cutoff
      top_k: 25
    };

    let response = null;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model: model, 
          messages: messages, 
          stream: false, 
          options: ollamaOptions,
          keep_alive: "20m"
        })
      });
    } catch (netErr) {
      console.warn("[Ollama] Tentative de relance du démon suite à échec réseau...", netErr);
      await this.ensureOllamaRunning();
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model: model, 
          messages: messages, 
          stream: false, 
          options: ollamaOptions,
          keep_alive: "20m"
        })
      });
    }

    if (!response || !response.ok) {
      throw new Error(`Erreur Ollama Status ${response ? response.status : 'Connexion impossible'}. Assurez-vous que le modèle "${model}" est téléchargé (ollama pull ${model}).`);
    }

    const data = await response.json();
    const text = data.message?.content;
    if (!text) throw new Error("Réponse Ollama vide.");
    return text;
  },

  parseMarkdownToHtml(text) {
    if (!text) return "";
    let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    html = html.replace(/`(.*?)`/g, "<code>$1</code>");

    const lines = html.split("\n");
    let inList = false;
    let resultLines = [];

    lines.forEach(line => {
      let trimmed = line.trim();
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed)) {
        if (!inList) {
          resultLines.push("<ul style='margin-left:18px; margin-bottom:6px;'>");
          inList = true;
        }
        const bulletText = trimmed.replace(/^[-*]\s+|\d+\.\s+/, '');
        resultLines.push(`<li>${bulletText}</li>`);
      } else {
        if (inList) {
          resultLines.push("</ul>");
          inList = false;
        }
        if (trimmed.length > 0) {
          resultLines.push(`<p style='margin-bottom:6px;'>${line}</p>`);
        } else {
          resultLines.push("<br>");
        }
      }
    });

    if (inList) resultLines.push("</ul>");
    return resultLines.join("\n");
  },

  appendStreamingChatMessage(fullHtml) {
    let container = document.getElementById('ai-chat-area');
    if (!container) return;

    let bubble = document.createElement('div');
    bubble.className = 'chat-bubble ai';
    container.appendChild(bubble);

    let i = 0;
    let currentText = "";
    
    const interval = setInterval(() => {
      if (i < fullHtml.length) {
        if (fullHtml[i] === '<') {
          const end = fullHtml.indexOf('>', i);
          if (end !== -1) {
            currentText += fullHtml.substring(i, end + 1);
            i = end + 1;
          } else {
            currentText += fullHtml[i];
            i++;
          }
        } else if (fullHtml[i] === '&') {
          const end = fullHtml.indexOf(';', i);
          if (end !== -1 && end - i < 8) {
            currentText += fullHtml.substring(i, end + 1);
            i = end + 1;
          } else {
            currentText += fullHtml[i];
            i++;
          }
        } else {
          currentText += fullHtml[i];
          i++;
        }
        bubble.innerHTML = currentText;
        container.scrollTop = container.scrollHeight;
      } else {
        clearInterval(interval);
      }
    }, 4);
  },

  async handleUserChatMessage() {
    const input = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('ai-chat-send');
    if (!input || !sendBtn) return;

    const query = input.value.trim();
    if (!query) return;

    // Rendre l'input indisponible
    input.value = "";
    input.disabled = true;
    sendBtn.disabled = true;

    // Rendre le message de l'utilisateur
    const chatArea = document.getElementById('ai-chat-area');
    if (chatArea) {
      const userBubble = document.createElement('div');
      userBubble.className = 'chat-bubble user';
      userBubble.textContent = query;
      chatArea.appendChild(userBubble);
      chatArea.scrollTop = chatArea.scrollHeight;
    }

    // Ajouter à l'historique
    AppState.aiChatHistory.push({ role: 'user', content: query });

    // Bulle temporaire de chargement
    const tempBubble = document.createElement('div');
    tempBubble.className = 'chat-bubble system';
    tempBubble.innerHTML = `🤖 <em>L'assistant réfléchit...</em>`;
    if (chatArea) chatArea.appendChild(tempBubble);

    try {
      const systemPrompt = this.buildSystemInstruction(query);
      const responseText = await this.callAI(query, systemPrompt);
      
      if (tempBubble) tempBubble.remove();
      
      AppState.aiChatHistory.push({ role: 'assistant', content: responseText });
      
      // Streamer
      this.appendStreamingChatMessage(this.parseMarkdownToHtml(responseText));
    } catch (err) {
      console.error(err);
      if (tempBubble) tempBubble.remove();
      AppState.aiChatHistory.pop(); // Retirer le message utilisateur qui a échoué
      
      const errBubble = document.createElement('div');
      errBubble.className = 'chat-bubble system';
      errBubble.innerHTML = `<span style="color:#ff6b6b;">❌ Inférence échouée. Vérifiez vos clés API ou votre serveur Ollama. Détails : ${err.message}</span>`;
      if (chatArea) chatArea.appendChild(errBubble);
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  },

  async triggerQuickPrompt(type) {
    const db = AppState.db;
    if (!db) return;

    let prompt = "";
    if (type === 'bloque') {
      prompt = "Les joueurs hésitent ou l'action stagne. Propose 2 rebondissements immédiats (1 imprévu et 1 intervention de PNJ) basés sur les secrets et factions du lieu.";
    } else if (type === 'reaction') {
      prompt = "Comment réagit le PNJ le plus proche aux dernières actions des aventuriers ? Décris son attitude corporelle et donne 1 réplique directe en gras (\"...\").";
    } else if (type === 'situation') {
      prompt = "Résume la situation actuelle en 3 points concis pour le MJ : 1) Où sont les aventuriers et qui est avec eux ? 2) Quel est le danger ou l'enjeu immédiat ? 3) Quel est leur prochain objectif ?";
    } else if (type === 'scenario') {
      prompt = "Propose une idée de rencontre ou de défi immédiat adapté au lieu actuel (embuscade, énigme ou interaction sociale) avec le DD D&D 5E associé.";
    }

    if (prompt) {
      const chatInput = document.getElementById('ai-chat-input');
      if (chatInput) {
        chatInput.value = prompt;
        this.handleUserChatMessage();
      }
    }
  }
};
