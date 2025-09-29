class EditorBase {
    constructor(editorId, toolbarId) {
        this.editor = document.getElementById(editorId);
        this.toolbar = document.getElementById(toolbarId);
        this.activePage = null;
        this.savedRange = null;
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

    createPage(afterPage = null) {
        const page = document.createElement("div");
        page.className = "page";
        page.contentEditable = "true";
        page.innerHTML = "<br/>";
        page.style.width = "800px";
        page.style.margin = "10px 0";
        page.addEventListener("focus", () => (this.activePage = page));
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

    getAllPagesContent() {
        return Array.from(this.editor.querySelectorAll(".page"))
            .map((p) => p.innerHTML)
            .join("\n\n---PAGE BREAK---\n\n");
    }

    updateWordCount() {
        const text = this.getAllPagesContent().replace(/<[^>]*>/g, " ").trim();
        const words = text.length ? text.split(/\s+/).length : 0;
        document.getElementById("word-count").innerText = `Words: ${words}`;
    }

    updatePageCount() {
        const pages = this.editor.querySelectorAll(".page").length;
        document.getElementById("page-count").innerText = `Pages: ${pages}`;
    }

    checkPageOverflow(page) {
        while (page.scrollHeight > page.clientHeight) {
            const newPage = this.createPage(page);
            let lastChild = page.lastChild;
            if (!lastChild) break;

            if (lastChild.nodeType === Node.TEXT_NODE) {
                let text = lastChild.textContent;
                let splitIndex = Math.floor(text.length / 2);
                lastChild.textContent = text.slice(0, splitIndex);
                newPage.insertBefore(document.createTextNode(text.slice(splitIndex)), newPage.firstChild);
            } else {
                newPage.insertBefore(lastChild, newPage.firstChild);
            }
        }
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
}

class Editor extends EditorBase {
    constructor() {
        super("main", "toolbar");
        this.resizer = null;
        this.startX = 0;
        this.startY = 0;
        this.startWidth = 0;
        this.startHeight = 0;
        this.currentHandle = null;

        this.init();
    }

    init() {
        if (!this.editor) return console.error("Editor not found!");
        this.createPage();
        this.bindSelectionEvents();
        this.bindToolbar();
        this.bindFooter();
        this.bindResizing();

        this.editor.style.display = "flex";
        this.editor.style.flexDirection = "column";
        this.editor.style.alignItems = "flex-start";

        this.editor.addEventListener("input", (e) => {
            const page = e.target.closest(".page");
            if (page) this.checkPageOverflow(page);
        });
    }

    openModal(title, inputs, callback) {
        const modal = document.getElementById("editor-modal");
        const titleEl = document.getElementById("modal-title");
        const bodyEl = document.getElementById("modal-body");
        const okBtn = document.getElementById("modal-ok");
        const cancelBtn = document.getElementById("modal-cancel");
    
        titleEl.textContent = title;
        bodyEl.innerHTML = ""; 

        inputs.forEach(inp => {
            const wrapper = document.createElement("div");
            wrapper.style.margin = "8px 0";
            const label = document.createElement("label");
            label.textContent = inp.label;
            const field = document.createElement("input");
            field.type = inp.type || "text";
            field.value = inp.value || "";
            field.id = inp.name;
            wrapper.appendChild(label);
            wrapper.appendChild(document.createElement("br"));
            wrapper.appendChild(field);
            bodyEl.appendChild(wrapper);
        });
    
        modal.classList.remove("hidden");
    
        const close = () => {
            modal.classList.add("hidden");
            okBtn.onclick = cancelBtn.onclick = null;
        };
    
        okBtn.onclick = () => {
            const values = {};
            inputs.forEach(inp => {
                values[inp.name] = document.getElementById(inp.name).value;
            });
            callback(values,close);
            close();
        };
        cancelBtn.onclick = close;
    }

    bindToolbar() {
        this.toolbar.querySelectorAll("button[data-command]").forEach((btn) => {
            btn.addEventListener("mousedown", (e) => e.preventDefault());
            btn.addEventListener("click", () => this.handleToolbarCommand(btn));
        });

        this.toolbar.querySelectorAll("select[data-command]").forEach((select) => {
            select.addEventListener("change", () => {
                if (!this.activePage) return;
                this.restoreSelection();
                document.execCommand(select.dataset.command, false, select.value);
                this.activePage.focus();
                this.saveSelection();
            });
        });

        this.toolbar.querySelectorAll("input[data-command]").forEach((input) => {
            input.addEventListener("change", () => {
                if (!this.activePage) return;
                this.restoreSelection();
                document.execCommand(input.dataset.command, false, input.value);
                this.activePage.focus();
                this.saveSelection();
            });
        });
    }

    handleToolbarCommand(btn) {
        if (!this.activePage) return;
        this.restoreSelection();
        this.activePage.focus();

        const command = btn.dataset.command;

        switch (command) {
            case "clear-formatting":
                document.execCommand("removeFormat", false, null);
                document.execCommand("unlink", false, null);
                break;

            case "reset-editor":
                this.editor.innerHTML = "";
                this.createPage();
                break;

            case "copy-plain":
                navigator.clipboard.writeText(this.getAllPagesContent().replace(/<[^>]*>/g, " ").trim()).then(() => this.openModal("Plain Text Copied!", [], () => {}, "Plain text copied!"));
                break;

            case "copy-html":
                navigator.clipboard.writeText(this.getAllPagesContent()).then(() => this.openModal("HTML Copied!", [], () => {}, "HTML copied!"));
                break;

            case "preview":
                const preview = window.open("", "Preview", "width=800,height=600");
                preview.document.write(`<html><head><title>Preview</title></head><body>${this.getAllPagesContent()}</body></html>`);
                break;

            case "new-page":
                this.createPage(this.activePage);
                break;

            case "find-replace":
                this.openModal("Find and Replace",[
                    {name: "find", label: "Find:",value:""},
                    { name: "replace", label: "Replace with:", value: "" }
                ],(values)=>{
                    const findtext=values.find;
                    const replaceText=values.replace;
                    if (!findtext) return;
                    this.editor.querySelectorAll(".page").forEach((page) => {
                        page.innerHTML = page.innerHTML.replaceAll(findtext, replaceText);
                    });
                })
                break;

            case "save":
                localStorage.setItem("documentContent", this.getAllPagesContent());
                this.openModal("Notification", [], () => {}, "Document saved locally!");
                break;

            case "save-as":
                this.openModal("Save As",[
                    { name: "filename", label: "File name:", value: "document" }
                ],(values)=>{
                    const filename=values.filename || "document";
                    const blob = new Blob([this.getAllPagesContent()], { type: "application/msword" });
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.download = filename + ".doc";
                    link.click();
                    URL.revokeObjectURL(link.href);
                });
                break;

            case "email":
                const body = encodeURIComponent(this.getAllPagesContent());
                window.location.href = `mailto:?subject=My Document&body=${body}`;
                break;

            case "download":
                const dlBlob = new Blob([this.getAllPagesContent()], { type: "text/html" });
                const dlLink = document.createElement("a");
                dlLink.href = URL.createObjectURL(dlBlob);
                dlLink.download = "document.html";
                dlLink.click();
                URL.revokeObjectURL(dlLink.href);
                break;

            case "print":
                const printWindow = window.open("", "Print", "width=800,height=600");
                printWindow.document.write(`<html><head><title>Document PDF</title></head><body>${this.getAllPagesContent()}</body></html>`);
                printWindow.document.close();
                printWindow.focus();
                printWindow.print();
                break;

            default:
                document.execCommand(command, false, null);
        }

        if (btn.id === "insert-link") {
            this.restoreSelection();
            this.openModal("Insert Link",[
                { name: "url", label: "URL:", value: "https://" }
            ],(values)=>{
                if (values.url && values.url.trim()!== ""){
                    this.restoreSelection();
                    document.execCommand("createLink", false, values.url);  
                }
            })
        } else if (btn.id === "insert-image") {
            this.handleInsertImage();
        } else if (btn.id === "insert-table") {
            this.handleInsertTable();
        }

        this.saveSelection();
    }

    handleInsertImage() {
    this.openModal("Insert Image", [
        { name: "source", label: "Choose Source: local or url", value: "local" }
    ], (values,closeFirstModal) => {
        
        if (values.source === "local") {
            closeFirstModal();
            const input = document.getElementById("image-upload");
            input.onchange = null;
            input.click();
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    this.restoreSelection();
                    document.execCommand("insertImage", false, evt.target.result);
                    setTimeout(() => this.setupLastInserted("img"), 100);
                };
                reader.readAsDataURL(file);
            };
        } else if (values.source === "url") {
            closeFirstModal();
            this.openModal("Insert Image", [
                { name: "url", label: "Image URL:", value: "https://" }
            ], (values,closeSecondModal) => {
                if (values.url) {
                    this.restoreSelection();
                    document.execCommand("insertImage", false, values.url);
                    setTimeout(() => this.setupLastInserted("img"), 100);
                    closeSecondModal();
                }
            });
        }
    });
}

    handleInsertTable() {
        this.openModal("Insert Table", [
           { name: "rows", label: "Rows:", value: "2", type: "number" },
           { name: "cols", label: "Columns:", value: "2", type: "number" }
        ], (values) => {
            const rows = parseInt(values.rows);
            const cols = parseInt(values.cols);
            if (rows <= 0 || cols <= 0) return;

            const placeholderId = `temp_table_placeholder_${Date.now()}`;
            let tableHTML = `<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;">`;
            for (let r = 0; r < rows; r++) {
                tableHTML += "<tr>" + `<td style="width:${100 / cols}%; min-width:80px; min-height:30px; padding:6px;">&nbsp;</td>`.repeat(cols) + "</tr>";
            }
            tableHTML += "</table><br/>";
            document.execCommand("insertHTML", false, `<span id="${placeholderId}"></span>${tableHTML}`);
    
            const placeholder = this.activePage.querySelector(`#${placeholderId}`);
            const insertedTable = placeholder ? placeholder.nextElementSibling : null;
            if (placeholder) placeholder.remove();
    
            if (insertedTable && insertedTable.tagName === "TABLE") this.setupresizer(insertedTable);
        });
    }

    setupLastInserted(tag) {
        if (!this.activePage) return;
        const elements = this.activePage.querySelectorAll(tag);
        const el = elements[elements.length - 1];
        if (el) this.setupresizer(el);
    }

    setupresizer(element) {
        this.editor.querySelectorAll(".resizing-wrapper").forEach((w) => {
            if (w !== element.parentNode) {
                let parent = w.parentNode;
                while (w.firstChild) parent.insertBefore(w.firstChild, w);
                parent.removeChild(w);
            }
        });

        if (element.parentNode.classList.contains("resizing-wrapper")) return;

        const wrapper = document.createElement("div");
        wrapper.className = "resizing-wrapper";
        element.parentNode.insertBefore(wrapper, element);
        wrapper.appendChild(element);

        ["nw", "ne", "sw", "se", "n", "s", "w", "e"].forEach((pos) => {
            const handle = document.createElement("div");
            handle.className = `resizing-handle ${pos}`;
            wrapper.appendChild(handle);
        });
    }

    handleMouseDown = (e) => {
        let target = e.target;

        if (this.editor.contains(target) && !target.closest(".resizing-wrapper")) {
            this.editor.querySelectorAll(".resizing-wrapper").forEach((w) => {
                let parent = w.parentNode;
                while (w.firstChild) parent.insertBefore(w.firstChild, w);
                parent.removeChild(w);
            });
        }

        if (target.tagName === "IMG" || target.tagName === "TABLE") {
            this.setupresizer(target);
            return;
        }

        if (!target.classList.contains("resizing-handle")) return;

        e.preventDefault();
        this.resizer = target.parentNode.querySelector("img, table");
        if (!this.resizer) return;

        const rect = this.resizer.getBoundingClientRect();
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.startWidth = this.resizer.offsetWidth;
        this.startHeight = this.resizer.offsetHeight;
        this.currentHandle = target.classList[1];

        document.addEventListener("mousemove", this.handleMouseMove);
        document.addEventListener("mouseup", this.handleMouseUp);
    };

    handleMouseMove = (e) => {
        if (!this.resizer) return;
        const dx = e.clientX - this.startX;
        const dy = e.clientY - this.startY;

        let newWidth = this.startWidth;
        let newHeight = this.startHeight;

        switch (this.currentHandle) {
            case "se":
                newWidth += dx;
                newHeight += dy;
                break;
            case "sw":
                newWidth -= dx;
                newHeight += dy;
                break;
            case "ne":
                newWidth += dx;
                newHeight -= dy;
                break;
            case "nw":
                newWidth -= dx;
                newHeight -= dy;
                break;
            case "n":
                newHeight -= dy;
                break;
            case "s":
                newHeight += dy;
                break;
            case "w":
                newWidth -= dx;
                break;
            case "e":
                newWidth += dx;
                break;
        }

        if (newWidth < 50) newWidth = 50;
        if (newHeight < 30) newHeight = 30;

        this.resizer.style.width = `${newWidth}px`;
        this.resizer.style.height = `${newHeight}px`;
    };

    handleMouseUp = () => {
        this.resizer = null;
        document.removeEventListener("mousemove", this.handleMouseMove);
        document.removeEventListener("mouseup", this.handleMouseUp);
    };

    bindResizing() {
        this.editor.addEventListener("mousedown", this.handleMouseDown);
        this.editor.addEventListener("click", (e) => {
            if (
                (e.target.tagName === "IMG" || e.target.tagName === "TABLE") &&
                !e.target.parentNode.classList.contains("resizing-wrapper")
            ) {
                this.setupresizer(e.target);
            }
        });

        document.addEventListener("mousedown", (e) => {
            if (!this.editor.contains(e.target) && !e.target.closest(".resizing-wrapper")) {
                this.editor.querySelectorAll(".resizing-wrapper").forEach((w) => {
                    let parent = w.parentNode;
                    while (w.firstChild) parent.insertBefore(w.firstChild, w);
                    parent.removeChild(w);
                });
            }
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
            this.editor.style.transform = `scale(${zoom / 100})`;
            this.editor.style.transformOrigin = "top center";
        });

        this.updateWordCount();
        this.updatePageCount();
    }
}

window.addEventListener("DOMContentLoaded", () => new Editor());
