class Editor {
  constructor() {
    this.editor = document.getElementById("main");
    this.toolbar = document.getElementById("toolbar");
    this.activePage=null;
    this.savedRange = null;

    this.resizer=null; //this determines the element that is being resized
    this.startX=0;
    this.startY=0;
    this.startwidth=0;

    this.init();
  }

  init() {
    if (!this.editor) return console.error("Editor not found!");
    this.createPage();
    this.bindSelectionEvents();
    this.bindToolbar();
    this.bindFooter(); 
    this.bindResizing();
    this.editor.addEventListener("input",(e)=>{
      const page=e.target.closest(".page");
      if(page){
        this.checkPageOverflow(page);
      }
    })
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

  checkPageOverflow(page) {
    while (page.scrollHeight > page.clientHeight) {
      const newPage = this.createPage(page);
  
      let lastChild = page.lastChild;
      if (!lastChild) break;
  
      if (lastChild.nodeType === Node.TEXT_NODE) {
        let text = lastChild.textContent;
        let splitIndex = Math.floor(text.length / 2);
  
        let firstHalf = text.slice(0, splitIndex);
        let secondHalf = text.slice(splitIndex);
  
        lastChild.textContent = firstHalf;
        newPage.insertBefore(document.createTextNode(secondHalf), newPage.firstChild);
      } else {
        newPage.insertBefore(lastChild, newPage.firstChild);
      }
    }
  }


  updateWordCount() {
  const text = this.getAllPagesContent()
    .replace(/<[^>]*>/g, " ")
    .trim();
  const words = text.length ? text.split(/\s+/).length : 0;
  document.getElementById("word-count").innerText = `Words: ${words}`;
  }

  updatePageCount() {
  const pages = this.editor.querySelectorAll(".page").length;
  document.getElementById("page-count").innerText = `Pages: ${pages}`;
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

  setupresizer(element){
    this.editor.querySelectorAll('.resizing-wrapper').forEach(w=>{
      if(w!==element.parentNode){
        let parent=w.parentNode;

        while(w.firstChild) parent.insertBefore(w.firstChild,w);
        parent.removeChild(w);
      }
    });

    if(element.parentNode.classList.contains('resizing-wrapper')){
      return;
    }

    const wrapper=document.createElement('div');
    wrapper.className='resizing-wrapper';
    element.parentNode.insertBefore(wrapper,element);
    wrapper.appendChild(element);

    const positions = ['nw','ne','sw','se','n','s','w','e'];
    positions.forEach(pos=>{
      const handle=document.createElement('div');
      handle.className=`resizing-handle ${pos}`;
      wrapper.appendChild(handle);
    });
  }

  handleMouseDown = (e) => {
        let target = e.target;
        
        if (this.editor.contains(target) && !target.closest('.resizing-wrapper')) {
            this.editor.querySelectorAll('.resizing-wrapper').forEach(w => {
                let parent = w.parentNode;
                while(w.firstChild) parent.insertBefore(w.firstChild, w);
                parent.removeChild(w);
            });
        }

        if (target.tagName === 'IMG' || target.tagName === 'TABLE') {
            this.setupresizer(target);
            return;
        }

        if (!target.classList.contains('resizing-handle')) return;
        
        e.preventDefault();
        
        this.resizer = target.parentNode.querySelector('img, table');
        if (!this.resizer) return;
        
        const rect = this.resizer.getBoundingClientRect();

        this.startX = e.clientX;
        this.startY=e.clientY;
        this.startWidth = this.resizer.offsetWidth;
        this.startHeight=this.resizer.offsetHeight;

        this.currentHandle = target.classList[1];

        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
    }

    handleMouseMove = (e) => {
        if (!this.resizer) return;
        
        const dx = e.clientX - this.startX;
        const dy=e.clientY-this.startY;

        let newWidth = this.startWidth;
        let newHeight=this.startHeight;

        switch(this.currentHandle){
          case 'se':
            newWidth += dx; newHeight += dy; break;
          case 'sw':
            newWidth -= dx; newHeight += dy; break;
          case 'ne':
            newWidth += dx; newHeight -= dy; break;
          case 'nw':
            newWidth -= dx; newHeight -= dy; break;
          case 'n':
            newHeight -= dy; break;
          case 's':
            newHeight += dy; break;
          case 'w':
            newWidth -= dx; break;
          case 'e':
            newWidth += dx; break;
        }
        
        if (newWidth < 50) newWidth = 50; 
        if(newHeight < 30) newHeight = 30;
        
        this.resizer.style.width = `${newWidth}px`;
        this.resizer.style.height=`${newHeight}px`;
    }

    handleMouseUp = () => {
        this.resizer = null;
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
    }

  bindResizing() {
      this.editor.addEventListener('mousedown', this.handleMouseDown)  
      this.editor.addEventListener('click', (e) => {
          if ((e.target.tagName === 'IMG' || e.target.tagName === 'TABLE') && 
          !e.target.parentNode.classList.contains('resizing-wrapper')){
              this.setupresizer(e.target);
          }
      });
      document.addEventListener('mousedown', (e) => {
          if (!this.editor.contains(e.target) && !e.target.closest('.resizing-wrapper')) {
              this.editor.querySelectorAll('.resizing-wrapper').forEach(w => {
                  let parent = w.parentNode;
                  while(w.firstChild) parent.insertBefore(w.firstChild, w);
                  parent.removeChild(w);
              });
          }
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
          const choice=confirm("Click OK to Upload from Computer,Cancel to insert from URL");
          if(choice){
            document.getElementById('image-upload').click();
            document.getElementById('image-upload').onchange=(e)=>{
              const file=e.target.files[0];
              if(!file) return;

              const reader=new FileReader();
              reader.onload=(evt)=>{
                this.restoreSelection();
                document.execCommand('insertImage',false,evt.target.result);
                setTimeout(()=>{
                  const images=this.activePage.querySelectorAll('img');
                  const insertedElement=images[images.length-1];

                  if(insertedElement){
                    this.setupresizer(insertedElement);
                  }
                },100)
              };
              reader.readAsDataURL(file);
            };
          }else{
              const url = prompt('Enter image URL:', 'https://');
              if (url){
                this.restoreSelection();
                document.execCommand('insertImage', false, url);
                setTimeout(()=>{
                  const images=this.activePage.querySelectorAll('img');
                  const insertedElement=images[images.length-1];

                  if(insertedElement){
                    this.setupresizer(insertedElement);
                  }
                },100)
              }
          }
        } else if (btn.id === 'insert-table') {
          const rows = parseInt(prompt('Rows:', '2'));
          const cols = parseInt(prompt('Columns:', '2'));
          
          if (rows > 0 && cols > 0) {
              const placeholderId = `temp_table_placeholder_${Date.now()}`;
              let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">';
              for (let r = 0; r < rows; r++) {
                  tableHTML += '<tr>';
                  tableHTML += `<td style="width:${100/cols}%; min-width:80px; min-height:30px; padding:6px;">&nbsp;</td>`.repeat(cols);
                  tableHTML += '</tr>';
              }
              tableHTML += '</table><br/>';
              document.execCommand('insertHTML', false, `<span id="${placeholderId}"></span>${tableHTML}`);
              const placeholder = this.activePage.querySelector(`#${placeholderId}`);
              const insertedTable = placeholder ? placeholder.nextElementSibling : null;
              if(placeholder) placeholder.remove();

              if (insertedTable && insertedTable.tagName === 'TABLE') {
                  this.setupresizer(insertedTable); 
              }
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

  bindFooter() {
    this.editor.addEventListener("keyup", () => this.updateWordCount());
    this.editor.addEventListener("mouseup", () => this.updateWordCount());
  
    const observer = new MutationObserver(() => this.updatePageCount());
    observer.observe(this.editor, { childList: true });
  
    const zoomSlider = document.getElementById("zoom-slider");
    zoomSlider.addEventListener("input", () => {
      const zoom = zoomSlider.value;
      this.editor.style.transform = `scale(${zoom/100})`;
      this.editor.style.transformOrigin = "top left";
    });
  
    this.updateWordCount();
    this.updatePageCount();
  }
}

window.addEventListener("DOMContentLoaded", () => new Editor());
