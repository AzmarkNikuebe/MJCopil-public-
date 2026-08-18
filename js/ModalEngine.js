window.ModalEngine = {
  _activeResolve: null,

  ensureRoot() {
    let root = document.getElementById('mj-modal-engine-root');
    if (root) return root;

    root = document.createElement('div');
    root.id = 'mj-modal-engine-root';
    root.className = 'mj-modal-root';
    root.innerHTML = `
      <div class="mj-modal-panel" role="dialog" aria-modal="true" aria-labelledby="mj-modal-title">
        <div class="mj-modal-header">
          <h2 id="mj-modal-title"></h2>
          <button type="button" class="mj-modal-close" data-modal-action="cancel" aria-label="Fermer">×</button>
        </div>
        <div class="mj-modal-body">
          <p id="mj-modal-message"></p>
          <input id="mj-modal-input" type="text" autocomplete="off">
        </div>
        <div class="mj-modal-actions">
          <button type="button" class="btn btn-secondary" data-modal-action="cancel">Annuler</button>
          <button type="button" class="btn btn-primary" data-modal-action="ok">Valider</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    root.addEventListener('click', (event) => {
      if (event.target === root) this._finish(null);
      const actionEl = event.target.closest('[data-modal-action]');
      if (!actionEl) return;
      const action = actionEl.dataset.modalAction;
      if (action === 'cancel') this._finish(null);
      if (action === 'ok') this._finish(this._readValue());
    });

    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this._finish(null);
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        const input = document.getElementById('mj-modal-input');
        if (document.activeElement === input) {
          event.preventDefault();
          this._finish(this._readValue());
        }
      }
    });

    return root;
  },

  alert(message, options = {}) {
    return this.open({
      title: options.title || 'Information',
      message,
      variant: options.variant || 'info',
      mode: 'alert',
      okLabel: options.okLabel || 'Compris'
    });
  },

  confirm(message, options = {}) {
    return this.open({
      title: options.title || 'Confirmation',
      message,
      variant: options.variant || 'warning',
      mode: 'confirm',
      okLabel: options.okLabel || 'Confirmer',
      cancelLabel: options.cancelLabel || 'Annuler'
    });
  },

  prompt(message, defaultValue = '', options = {}) {
    return this.open({
      title: options.title || 'Saisie',
      message,
      variant: options.variant || 'info',
      mode: 'prompt',
      defaultValue,
      placeholder: options.placeholder || '',
      okLabel: options.okLabel || 'Valider',
      cancelLabel: options.cancelLabel || 'Annuler',
      inputType: options.inputType || 'text'
    });
  },

  open(config) {
    const root = this.ensureRoot();
    const panel = root.querySelector('.mj-modal-panel');
    const title = root.querySelector('#mj-modal-title');
    const message = root.querySelector('#mj-modal-message');
    const input = root.querySelector('#mj-modal-input');
    const cancelBtn = root.querySelector('[data-modal-action="cancel"].btn');
    const okBtn = root.querySelector('[data-modal-action="ok"]');

    if (this._activeResolve) this._finish(null);

    panel.dataset.variant = config.variant || 'info';
    root.dataset.mode = config.mode || 'alert';
    title.textContent = config.title || '';
    message.textContent = String(config.message || '');
    input.value = config.defaultValue || '';
    input.placeholder = config.placeholder || '';
    input.type = config.inputType || 'text';
    input.style.display = config.mode === 'prompt' ? 'block' : 'none';
    cancelBtn.style.display = config.mode === 'alert' ? 'none' : 'inline-flex';
    cancelBtn.textContent = config.cancelLabel || 'Annuler';
    okBtn.textContent = config.okLabel || 'Valider';

    root.classList.add('active');
    setTimeout(() => {
      if (config.mode === 'prompt') {
        input.focus();
        input.select();
      } else {
        okBtn.focus();
      }
    }, 0);

    return new Promise((resolve) => {
      this._activeResolve = (value) => {
        if (config.mode === 'alert') resolve(true);
        else if (config.mode === 'confirm') resolve(value !== null);
        else resolve(value);
      };
    });
  },

  _readValue() {
    const root = this.ensureRoot();
    const mode = root.dataset.mode;
    if (mode === 'prompt') return root.querySelector('#mj-modal-input').value;
    return true;
  },

  _finish(value) {
    const root = this.ensureRoot();
    root.classList.remove('active');
    const resolve = this._activeResolve;
    this._activeResolve = null;
    if (resolve) resolve(value);
  }
};
