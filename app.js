document.addEventListener('DOMContentLoaded', () => {
    const store = window.appStore;
    
    // UI Elements
    const gridView = document.getElementById('grid-view');
    const editorView = document.getElementById('editor-view');
    const settingsView = document.getElementById('settings-view');
    const notesGrid = document.getElementById('notes-grid');
    const controlsBar = document.getElementById('controls-bar');
    const tabsBar = document.getElementById('tabs-bar');
    const tabsContainer = document.querySelector('.tabs-container');
    const btnBack = document.getElementById('btn-back');
    const btnAddNote = document.getElementById('btn-add-note');
    const btnTheme = document.getElementById('btn-theme');
    const btnSettings = document.getElementById('btn-settings');
    const appTitle = document.getElementById('app-title');
    const zoomSlider = document.getElementById('zoom-slider');
    const fontSizeSlider = document.getElementById('font-size-slider');
    const fontSizeVal = document.getElementById('font-size-val');
    
    // Editor Elements
    const noteTitleInput = document.getElementById('note-title-input');
    const noteFolderSelect = document.getElementById('note-folder-select');
    const noteEditor = document.getElementById('note-editor');
    const btnAddImage = document.getElementById('btn-add-image');
    const imageUpload = document.getElementById('image-upload');
    
    // Folders Elements
    const btnFolders = document.getElementById('btn-folders');
    
    // State
    let currentView = 'grid'; // 'grid', 'editor', 'settings'
    let pathHistory = []; // Array of node IDs representing the drill-down path
    let currentFolderId = null; // null means root, otherwise folder ID
    
    // Initialization
    applySettings();
    renderGrid();
    
    // Drag & Drop
    new DragDropHandler(notesGrid, (newOrder) => {
        if (currentFolderId === null) {
            store.reorderRootNotes(newOrder);
        }
    });

    // --- Navigation & Views ---

    function showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const view = document.getElementById(`${viewId}-view`);
        if (view) {
            view.classList.remove('hidden');
            setTimeout(() => view.classList.add('active'), 10);
        }
        currentView = viewId;
        updateHeader();
    }

    function updateHeader() {
        if (currentView === 'grid') {
            btnBack.classList.toggle('hidden', currentFolderId === null);
            appTitle.textContent = currentFolderId ? store.data.folders[currentFolderId].name : 'Notas';
            controlsBar.classList.remove('hidden');
            tabsBar.classList.add('hidden');
        } else if (currentView === 'editor') {
            btnBack.classList.remove('hidden');
            controlsBar.classList.add('hidden');
            // Title is dynamically set in renderEditor
        } else {
            btnBack.classList.remove('hidden');
            appTitle.textContent = 'Ajustes';
            controlsBar.classList.add('hidden');
            tabsBar.classList.add('hidden');
        }
    }

    function navigateToNote(noteId, pushToHistory = true) {
        if (pushToHistory) {
            pathHistory.push(noteId);
        }
        renderEditor(noteId);
        showView('editor');
    }

    function goBack() {
        if (currentView === 'editor') {
            saveCurrentNote();
            pathHistory.pop();
            if (pathHistory.length > 0) {
                const prevNoteId = pathHistory[pathHistory.length - 1];
                renderEditor(prevNoteId);
            } else {
                renderGrid();
                showView('grid');
            }
        } else if (currentView === 'settings') {
            currentFolderId = null; // reset to root
            renderGrid();
            showView('grid');
        } else if (currentView === 'grid' && currentFolderId !== null) {
            // go back from folder grid to root grid
            currentFolderId = null;
            renderGrid();
        }
    }

    // --- Render Grid ---
    
    function renderGrid() {
        notesGrid.innerHTML = '';
        let itemsToRender = currentFolderId 
            ? store.getNotesInFolder(currentFolderId).map(n => ({ type: 'note', ...n })) 
            : store.getRootItems();
        
        itemsToRender.forEach(item => {
            const square = document.createElement('div');
            square.className = 'note-square' + (item.type === 'folder' ? ' folder-square' : '');
            square.style.backgroundColor = item.type === 'note' ? item.color : '';
            square.dataset.id = item.id;
            square.draggable = true;
            
            const title = document.createElement('div');
            title.className = 'note-title';
            title.textContent = item.type === 'note' ? item.title : item.name;
            
            square.appendChild(title);
            square.addEventListener('click', () => {
                if (item.type === 'folder') {
                    currentFolderId = item.id;
                    renderGrid();
                    updateHeader();
                } else {
                    pathHistory = [];
                    navigateToNote(item.id);
                }
            });
            notesGrid.appendChild(square);
        });
    }

    // --- Render Editor ---

    function renderEditor(noteId) {
        const note = store.getNote(noteId);
        if (!note) return;

        noteTitleInput.value = note.title;
        appTitle.textContent = note.title;
        
        // Populate folder select
        noteFolderSelect.innerHTML = '<option value="">(Sin carpeta)</option>';
        store.getFolders().forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = f.name;
            noteFolderSelect.appendChild(opt);
        });
        noteFolderSelect.value = note.folderId || '';
        noteFolderSelect.classList.remove('hidden');
        
        // Parse custom Markdown-like links to clickable elements
        noteEditor.innerHTML = parseMarkdownToHTML(note.content);
        
        // Render Tabs (Sub-notes)
        renderTabs(note);
    }

    function saveCurrentNote() {
        if (pathHistory.length === 0) return;
        const currentNoteId = pathHistory[pathHistory.length - 1];
        
        const title = noteTitleInput.value.trim() || 'Sin Título';
        const content = parseHTMLToMarkdown(noteEditor.innerHTML);
        const folderId = noteFolderSelect.value || null;
        
        store.updateNote(currentNoteId, title, content, folderId);
        
        // Parse links to ensure sub-notes exist
        const links = store.extractLinks(content);
        links.forEach(linkTitle => {
            if (!store.getNoteByTitle(linkTitle)) {
                // Auto-create linked note (not a root note)
                store.createNote(linkTitle, '', false);
            }
        });
    }

    // --- Tabs (Sub-notes) ---

    function renderTabs(parentNote) {
        // Extract links from content
        const linkTitles = store.extractLinks(parentNote.content);
        
        tabsContainer.innerHTML = '';
        if (linkTitles.length === 0) {
            tabsBar.classList.add('hidden');
            return;
        }
        
        tabsBar.classList.remove('hidden');
        
        // Create tab for parent note (Active)
        const parentTab = document.createElement('div');
        parentTab.className = 'tab active';
        parentTab.textContent = parentNote.title;
        tabsContainer.appendChild(parentTab);

        // Create tabs for sub-notes
        linkTitles.forEach(title => {
            const tab = document.createElement('div');
            tab.className = 'tab';
            tab.textContent = title;
            tab.addEventListener('click', () => {
                saveCurrentNote();
                let linkedNote = store.getNoteByTitle(title);
                if (!linkedNote) {
                    linkedNote = store.createNote(title, '', false);
                }
                navigateToNote(linkedNote.id, true);
            });
            tabsContainer.appendChild(tab);
        });
    }

    // --- Basic Markdown & Link Parsing ---
    
    function parseMarkdownToHTML(markdown) {
        let html = markdown || '';
        
        // Preserve standard HTML structure if it's already HTML (contenteditable generates HTML)
        // We mainly want to replace [[Link]] with styled span
        const linkRegex = /\[\[(.*?)\]\]/g;
        html = html.replace(linkRegex, (match, title) => {
            return `<span class="note-link" data-title="${title}" contenteditable="false">[[${title}]]</span>`;
        });
        
        return html;
    }

    function parseHTMLToMarkdown(html) {
        // Here we keep it simple. Real robust editor would use a proper DOM parser.
        // We just ensure links are saved properly.
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Revert styled link spans back to raw text so contenteditable doesn't nest them infinitely
        const links = tempDiv.querySelectorAll('.note-link');
        links.forEach(span => {
            const title = span.getAttribute('data-title');
            span.replaceWith(`[[${title}]]`);
        });
        
        return tempDiv.innerHTML;
    }

    // Click on editor to handle links
    noteEditor.addEventListener('click', (e) => {
        if (e.target.classList.contains('note-link')) {
            const title = e.target.getAttribute('data-title');
            saveCurrentNote();
            let linkedNote = store.getNoteByTitle(title);
            if (!linkedNote) {
                linkedNote = store.createNote(title, '', false);
            }
            navigateToNote(linkedNote.id, true);
        }
    });

    // --- Settings & UI Logic ---

    function applySettings() {
        document.documentElement.setAttribute('data-theme', store.settings.theme);
        notesGrid.className = `cols-${store.settings.zoom}`;
        zoomSlider.value = store.settings.zoom;
        
        noteEditor.style.setProperty('--editor-font-size', `${store.settings.fontSize}px`);
        fontSizeSlider.value = store.settings.fontSize;
        fontSizeVal.textContent = `${store.settings.fontSize}px`;
    }

    btnTheme.addEventListener('click', () => {
        store.settings.theme = store.settings.theme === 'dark' ? 'light' : 'dark';
        store.saveSettings();
        applySettings();
    });

    zoomSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        store.settings.zoom = parseInt(val);
        store.saveSettings();
        notesGrid.className = `cols-${val}`;
    });

    fontSizeSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        store.settings.fontSize = parseInt(val);
        store.saveSettings();
        applySettings();
    });

    btnBack.addEventListener('click', goBack);

    btnAddNote.addEventListener('click', () => {
        const note = store.createNote('Nueva Nota', '', true);
        renderGrid();
        navigateToNote(note.id);
    });

    btnSettings.addEventListener('click', () => {
        if (currentView === 'editor') saveCurrentNote();
        showView('settings');
    });

    btnFolders.addEventListener('click', () => {
        const name = prompt('Nombre de la nueva carpeta:');
        if (name && name.trim()) {
            store.createFolder(name.trim());
            renderGrid();
        }
    });

    noteFolderSelect.addEventListener('change', () => {
        saveCurrentNote();
    });

    // --- Image Handling ---

    btnAddImage.addEventListener('click', () => {
        imageUpload.click();
    });

    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                insertImage(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    function insertImage(src) {
        noteEditor.focus();
        
        const wrapper = document.createElement('div');
        wrapper.className = 'resizable-image-wrapper';
        wrapper.contentEditable = "false";
        
        const img = document.createElement('img');
        img.src = src;
        
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        
        wrapper.appendChild(img);
        wrapper.appendChild(handle);
        
        // Insert at cursor
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.insertNode(wrapper);
            // Add a zero-width space or break after to allow typing
            const br = document.createElement('br');
            range.collapse(false);
            range.insertNode(br);
        } else {
            noteEditor.appendChild(wrapper);
        }
        
        setupImageResize(wrapper, img, handle);
    }

    function setupImageResize(wrapper, img, handle) {
        let isResizing = false;
        let startX, startWidth;

        function startResize(e) {
            isResizing = true;
            startX = e.clientX || e.touches[0].clientX;
            startWidth = parseInt(document.defaultView.getComputedStyle(img).width, 10);
            document.addEventListener('mousemove', doResize);
            document.addEventListener('mouseup', stopResize);
            document.addEventListener('touchmove', doResize, {passive: false});
            document.addEventListener('touchend', stopResize);
            e.preventDefault();
        }

        function doResize(e) {
            if (!isResizing) return;
            const clientX = e.clientX || e.touches[0].clientX;
            const newWidth = startWidth + (clientX - startX);
            if (newWidth > 50) {
                img.style.width = newWidth + 'px';
            }
        }

        function stopResize() {
            isResizing = false;
            document.removeEventListener('mousemove', doResize);
            document.removeEventListener('mouseup', stopResize);
            document.removeEventListener('touchmove', doResize);
            document.removeEventListener('touchend', stopResize);
            saveCurrentNote(); // Save state with new image size
        }

        handle.addEventListener('mousedown', startResize);
        handle.addEventListener('touchstart', startResize, {passive: false});
    }

    // Auto-save on input
    let saveTimeout;
    noteEditor.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveCurrentNote, 1000);
    });
    noteTitleInput.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveCurrentNote();
            appTitle.textContent = noteTitleInput.value;
        }, 500);
    });

    // Add some initial data if empty
    if (Object.keys(store.data.notes).length === 0) {
        store.createNote('Tutorial Amoled Notes', '¡Bienvenido a tu nueva app de notas!\n\nPuedes crear enlaces usando corchetes, por ejemplo: [[Mis Ideas]].\nAl hacer clic en el enlace, irás a esa nota y aparecerá en las pestañas de arriba.');
        renderGrid();
    }
    
    // Handle hardware back button for Android PWA
    window.addEventListener('popstate', (e) => {
        if (currentView !== 'grid' || currentFolderId !== null) {
            goBack();
            history.pushState(null, null, document.URL); // trap history again
        }
    });
    history.pushState(null, null, document.URL);
});
