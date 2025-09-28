class Editor {
  constructor() {
    this.editor = document.getElementById("main");
    this.toolbar = document.getElementById("toolbar");
    this.activePage=null;
    this.savedRange = null;
    this.init();
  }

  init() {
    if (!this.editor) return console.error("Editor not found!");
    this.createPage();
    this.bindSelectionEvents();
    this.bindToolbar();
  }

  createPage(afterPage = null) {
    const page = document.createElement("div");
    page.className = "page";
    page.contentEditable = "true";
    page.innerHTML = "<br/>";
    page.addEventListener("focus", () => this.activePage = page);
    page.addEventListener("mouseup", () => this.saveSelection());
    page.addEventListener("keyup", () => this.saveSelection());
    page.addEventListener("blur", () => this.saveSelection());

    if (afterPage && afterPage.nextSibling) {
      this.editor.insertBefore(page, afterPage.nextSibling);
    } else {
      this.editor.appendChild(page);
    }

    page.focus();
    this.activePage = page;
    return page;
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

  getAllPagesContent() {
    return Array.from(this.editor.querySelectorAll(".page"))
                .map(p => p.innerHTML)
                .join("\n\n---PAGE BREAK---\n\n");
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
        if(!this.activePage) return;
        this.restoreSelection();
        this.activePage.focus();

        const command = btn.dataset.command;

        if(command === 'clear-formatting'){
          document.execCommand('removeFormat',false,null);
          document.execCommand('unlink',false,null);
        }
        else if(command === 'reset-editor'){
          this.editor.innerHTML="";
          this.createPage();
        }
        else if(command === 'copy-plain'){
          navigator.clipboard.writeText(this.getAllPagesContent()).then(()=>alert("Plain text is copied!"));
        }
        else if(command === 'copy-html'){
          navigator.clipboard.writeText(this.getAllPagesContent()).then(()=>alert("Html content copied!"));
        }
        else if(command === "preview"){
          const previewpage=window.open("","Preview","width=800,height=600");
          previewpage.document.write(`
            <html>
            <head><title>Preview</title></head>
            <body>${this.getAllPagesContent()}</body>
            </html>
          `);
        }else if(command === 'new-page'){
          this.createPage(this.activePage);
        }
        else if(command === 'find-replace'){
          const findtext=prompt("Enter the text to find?");
          if(!findtext) return;
          const replaceText=prompt("Enter the text to replace:","");
          this.editor.querySelectorAll(".page").forEach(page => {
          page.innerHTML = page.innerHTML.replaceAll(findtext, replaceText);
          });
        }
        else if (btn.id === 'insert-link') {
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
        }
        else if(command === 'save'){
          localStorage.setItem('documentContent', this.getAllPagesContent());
          alert("Document saved locally!");
        }
        else if(command === 'save-as'){
            const filename = prompt("Enter file name:", "document") || "document";
            const blob = new Blob([this.getAllPagesContent()], {type: "application/msword"});
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = filename + ".doc";
            link.click();
            URL.revokeObjectURL(link.href);
        }
        else if(command === 'email'){
            const body = encodeURIComponent(this.getAllPagesContent());
            window.location.href = `mailto:?subject=My Document&body=${body}`;
        }
        else if(command === 'download'){
            const blob = new Blob([this.getAllPagesContent()], {type: "text/html"});
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "document.html";
            link.click();
            URL.revokeObjectURL(link.href);
        }
        else if(command === 'print'){
            const printWindow = window.open("", "Print", "width=800,height=600");
            printWindow.document.write(`
                <html>
                <head><title>Document PDF</title></head>
                <body>${this.getAllPagesContent()}</body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
         }
         else {
          document.execCommand(command, false, null);
        }

        this.saveSelection();
      });
    });

    this.toolbar.querySelectorAll('select[data-command]').forEach(select => {
      select.addEventListener('change', () => {
        if (!this.activePage) return;
        this.restoreSelection();
        document.execCommand(select.dataset.command, false, select.value);
        this.activePage.focus();
        this.saveSelection();
      });
    });

    this.toolbar.querySelectorAll('input[data-command]').forEach(input => {
      input.addEventListener('change', () => {
        if (!this.activePage) return;
        this.restoreSelection();
        document.execCommand(input.dataset.command, false, input.value);
        this.activePage.focus();
        this.saveSelection();
      });
    });
  }
}

window.addEventListener("DOMContentLoaded", () => new Editor());
