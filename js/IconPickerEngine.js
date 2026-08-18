window.IconPickerEngine = {
  manifest: null,
  activeType: null,
  activeId: null,

  async openIconPicker(type, id) {
    this.activeType = type;
    this.activeId = id;

    // Load manifest if not loaded yet
    if (!this.manifest) {
      try {
        const response = await fetch('images/icons/manifest.json');
        if (!response.ok) throw new Error("Manifest status " + response.status);
        this.manifest = await response.json();
      } catch (err) {
        console.error("Failed to load icon manifest:", err);
        showNotification("Impossible de charger la bibliothèque d'icônes.", "error");
        return;
      }
    }

    const modal = document.getElementById('icon-picker-modal');
    if (!modal) return;

    modal.classList.add('active');
    
    // Clear search and render initial set (e.g. first 120 icons)
    const searchInput = document.getElementById('icon-picker-search');
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    
    this.renderIcons(this.manifest.slice(0, 120));
  },

  searchIcons(query) {
    if (!this.manifest) return;
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) {
      this.renderIcons(this.manifest.slice(0, 120));
      return;
    }

    // Filter manifest by matching tags or name
    const words = cleanQuery.split(/\s+/);
    const filtered = this.manifest.filter(icon => {
      return words.every(word => {
        return icon.tags.some(tag => tag.includes(word));
      });
    });

    this.renderIcons(filtered.slice(0, 120));
  },

  renderIcons(icons) {
    const grid = document.getElementById('icon-picker-grid');
    if (!grid) return;

    grid.innerHTML = '';
    if (icons.length === 0) {
      grid.innerHTML = '<div style="grid-column: span 6; text-align:center; padding:20px; color:var(--text-dim); font-size:0.85rem;">Aucune icône trouvée.</div>';
      return;
    }

    icons.forEach(icon => {
      const item = document.createElement('div');
      item.style.aspectRatio = '1';
      item.style.border = '1px solid var(--glass-border)';
      item.style.borderRadius = '6px';
      item.style.background = 'rgba(255,255,255,0.03)';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.justifyContent = 'center';
      item.style.cursor = 'pointer';
      item.style.padding = '6px';
      item.style.transition = 'all 0.2s';
      
      // Hover effects
      item.onmouseover = () => { 
        item.style.background = 'rgba(255,255,255,0.1)'; 
        item.style.borderColor = 'var(--color-secondary)'; 
      };
      item.onmouseout = () => { 
        item.style.background = 'rgba(255,255,255,0.03)'; 
        item.style.borderColor = 'var(--glass-border)'; 
      };

      item.onclick = () => this.selectIcon(icon.path);

      item.innerHTML = `
        <img src="${icon.path}" style="width:100%; height:100%; filter: ${icon.path.includes('.svg') ? 'invert(1)' : 'none'}; object-fit:contain;" title="${icon.name}">
      `;
      grid.appendChild(item);
    });
  },

  selectIcon(iconPath) {
    const type = this.activeType;
    const id = this.activeId;
    const db = AppState.db;

    if (!db) return;

    // Create a new image in db.images
    const newImageId = `img_custom_${Date.now()}`;
    const newImage = {
      id: newImageId,
      fichier: iconPath,
      caption: `Icône sélectionnée pour ${id}`
    };

    if (!db.images) db.images = [];
    db.images.push(newImage);

    let entity = null;
    if (type === 'pnj') entity = db.pnjs.find(x => x.id === id);
    else if (type === 'lieu') entity = db.lieux.find(x => x.id === id);
    else if (type === 'objet') entity = db.objets.find(x => x.id === id);
    else if (type === 'personnage') entity = db.personnages.find(x => x.id === id);
    else if (type === 'faction') entity = db.factions.find(x => x.id === id);

    if (entity) {
      if (type === 'lieu') {
        if (!entity.images) entity.images = [];
        entity.images.unshift(newImageId);
      } else {
        entity.image = newImageId;
      }

      window.CampaignEngine.saveDatabase();
      showNotification("Icône appliquée avec succès !", "success");

      // Update image preview in edit modals
      const preview = document.getElementById('modal-entity-img-preview');
      if (preview) {
        preview.style.backgroundImage = `url(${iconPath})`;
        if (iconPath.includes('images/icons/')) {
          preview.style.filter = 'invert(1)';
        } else {
          preview.style.filter = 'none';
        }
      }

      // Sync player screen
      if (window.syncPlayerView) {
        window.syncPlayerView();
      }

      // Close modal
      const modal = document.getElementById('icon-picker-modal');
      if (modal) modal.classList.remove('active');
    }
  }
};
