class Editor {
  constructor() {
    this.editor = document.getElementById("white-page");
    this.toolbar = document.getElementById("toolbar");
    this.savedRange = null;
    this.init();
  }

  init() {
    if (!this.editor) return console.error("Editor not found!");
    this.editor.setAttribute("contenteditable", "true");
    this.bindSelectionEvents();
    this.bindToolbar();
  }

  saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) this.savedRange = sel.getRangeAt(0).cloneRange();
  }

  restoreSelection() {
    if (!this.savedRange) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(this.savedRange.cloneRange());
  }

  bindSelectionEvents() {
    this.editor.addEventListener("mouseup", () => this.saveSelection());
    this.editor.addEventListener("keyup", () => this.saveSelection());
    this.editor.addEventListener("blur", () => this.saveSelection());
    document.addEventListener("selectionchange", () => {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const node = sel.getRangeAt(0).commonAncestorContainer;
      if (this.editor.contains(node)) this.saveSelection();
    });
  }

  bindToolbar() {
    this.toolbar.querySelectorAll('button[data-command]').forEach(btn => {
      btn.addEventListener('mousedown', e => e.preventDefault());
      btn.addEventListener('click', () => {
        this.restoreSelection();
        this.editor.focus();

        const command = btn.dataset.command;

        if (btn.id === 'insert-link') {
          const url = prompt('Enter the URL:', 'https://');
          if (url) document.execCommand('createLink', false, url);
        } else if (btn.id === 'insert-image') {
          const url = prompt('Enter image URL:', 'https://');
          if (url) document.execCommand('insertImage', false, url);
        } else if (btn.id === 'insert-table') {
          const rows = parseInt(prompt('Rows:', '2'));
          const cols = parseInt(prompt('Columns:', '2'));
          if (rows > 0 && cols > 0) {
            let tableHTML = '<table border="1" style="border-collapse: collapse;">';
            for (let r = 0; r < rows; r++) {
              tableHTML += '<tr>';
              for (let c = 0; c < cols; c++) tableHTML += '<td>&nbsp;</td>';
              tableHTML += '</tr>';
            }
            tableHTML += '</table><br/>';
            document.execCommand('insertHTML', false, tableHTML);
          }
        } else {
          document.execCommand(command, false, null);
        }

        this.saveSelection();
      });
    });

    this.toolbar.querySelectorAll('select[data-command]').forEach(select => {
      select.addEventListener('change', () => {
        this.restoreSelection();
        document.execCommand(select.dataset.command, false, select.value);
        this.editor.focus();
        this.saveSelection();
      });
    });

    this.toolbar.querySelectorAll('input[data-command]').forEach(input => {
      input.addEventListener('change', () => {
        this.restoreSelection();
        document.execCommand(input.dataset.command, false, input.value);
        this.editor.focus();
        this.saveSelection();
      });
    });
  }
}

window.addEventListener("DOMContentLoaded", () => new Editor());
