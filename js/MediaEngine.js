window.MediaEngine = {
  getEntityImageSrc(entity, type) {
    if (!entity) return 'https://picsum.photos/id/1018/300/200';
    const db = AppState.db;
    if (!db) return 'https://picsum.photos/id/1018/300/200';

    let imageId = null;
    if (type === 'pnj') {
      imageId = entity.image;
    } else if (type === 'lieu') {
      imageId = entity.images && entity.images.length > 0 ? entity.images[0] : null;
    } else if (type === 'objet') {
      imageId = entity.image;
    } else if (type === 'personnage') {
      imageId = entity.image;
    } else if (type === 'faction') {
      imageId = entity.image;
    } else if (type === 'bete') {
      imageId = entity.image;
    }

    if (imageId) {
      if (imageId.startsWith('images/') || imageId.startsWith('http') || imageId.startsWith('data:image')) {
        return imageId;
      }
      const media = db.images.find(img => img.id === imageId);
      if (media) return media.fichier;
    }

    // Fallbacks basés sur les noms
    const name = (entity.nom || entity.titre || '').toLowerCase();
    if (type === 'personnage') {
      if (name.includes('caladin')) return 'images/caladin.png';
      if (name.includes('zozmark')) return 'images/zozmark.png';
    }

    // Pixelart 8-bit pour les PNJ, objets, bêtes
    if (type === 'pnj' || type === 'objet' || type === 'bete') {
      if (name.includes('talen') || name.includes('kar')) return 'images/talen_kar_8bit.png';
      if (name.includes('sia')) return 'images/sia_8bit.png';
      if (name.includes('velyn')) return 'images/velyn_8bit.png';
      if (name.includes('sariel')) return 'images/sariel_8bit.png';
      if (name.includes('kol')) return 'images/kol_8bit.png';
      if (name.includes('gemme')) return 'images/gemme_pure_8bit.png';
      if (name.includes('spren') && name.includes('corrompu')) return 'images/spren_corrompu_8bit.png';
      if (name.includes('automate')) return 'images/automate_8bit.png';
    }

    // Défauts stylés dynamiques (graine Picsum unique par entité)
    if (type === 'pnj') return `https://picsum.photos/seed/${entity.id}/150/150`;
    if (type === 'lieu') return `https://picsum.photos/seed/${entity.id}/800/450`;
    if (type === 'objet') return `https://picsum.photos/seed/${entity.id}/150/150`;
    if (type === 'personnage') return `https://picsum.photos/seed/${entity.id}/150/150`;
    if (type === 'faction') return `https://picsum.photos/seed/${entity.id}/150/150`;
    if (type === 'bete') return `https://picsum.photos/seed/${entity.id}/150/150`;
    
    return `https://picsum.photos/seed/${entity.id || 'default'}/300/200`;
  },

  handleEntityImageUpload(type, id, input) {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      
      reader.onload = function(e) {
        const base64Data = e.target.result;
        const db = AppState.db;
        
        const newImageId = `img_custom_${Date.now()}`;
        const newImage = {
          id: newImageId,
          fichier: base64Data,
          caption: `Illustration importée pour ${id}`
        };
        
        if (!db.images) db.images = [];
        db.images.push(newImage);
        
        let entity = null;
        if (type === 'pnj') entity = db.pnjs.find(x => x.id === id);
        if (type === 'lieu') entity = db.lieux.find(x => x.id === id);
        if (type === 'objet') entity = db.objets.find(x => x.id === id);
        if (type === 'personnage') entity = db.personnages.find(x => x.id === id);
        if (type === 'faction') entity = db.factions.find(x => x.id === id);
        
        if (entity) {
          if (type === 'lieu') {
            if (!entity.images) entity.images = [];
            entity.images.unshift(newImageId);
          } else {
            entity.image = newImageId;
          }
          
          window.CampaignEngine.saveDatabase();
          showNotification("Illustration importée et sauvegardée !", "success");
          
          // Mettre à jour l'aperçu si l'élément existe dans la modale
          const preview = document.getElementById('modal-entity-img-preview');
          if (preview) {
            preview.style.backgroundImage = `url(${base64Data})`;
          }
          
          // Répercuter sur l'écran joueur
          if (window.syncPlayerView) {
            window.syncPlayerView();
          }
        }
      };
      reader.readAsDataURL(file);
    }
  }
};

// Enregistrer globalement pour assurer la compatibilité des attributs onchange inline de la V1
window.handleEntityImageUpload = window.MediaEngine.handleEntityImageUpload;
