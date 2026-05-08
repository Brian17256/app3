const STORAGE_KEY = 'amoled_notes_data';
const SETTINGS_KEY = 'amoled_notes_settings';

const colors = [
    '#e53935', '#d81b60', '#8e24aa', '#5e35b1', '#3949ab',
    '#1e88e5', '#039be5', '#00acc1', '#00897b', '#43a047',
    '#7cb342', '#fdd835', '#ffb300', '#fb8c00', '#f4511e'
];

function generateId() {
    return 'note_' + Math.random().toString(36).substr(2, 9);
}

function getRandomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
}

class Store {
    constructor() {
        this.data = this.loadData();
        this.settings = this.loadSettings();
    }

    loadData() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            return JSON.parse(raw);
        }
        return {
            notes: {},
            folders: {},
            rootOrder: []
        };
    }

    saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    }

    loadSettings() {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) {
            return JSON.parse(raw);
        }
        return {
            theme: 'dark',
            fontSize: 16,
            zoom: 4
        };
    }

    saveSettings() {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    }

    createNote(title, content = '', isRoot = true) {
        const id = generateId();
        const note = {
            id,
            title: title || 'Nueva Nota',
            content,
            color: getRandomColor(),
            links: [], // IDs of linked notes
            folderId: null // Reference to folder
        };
        this.data.notes[id] = note;
        if (isRoot) {
            this.data.rootOrder.push(id);
        }
        this.saveData();
        return note;
    }

    updateNote(id, title, content, folderId = undefined) {
        if (this.data.notes[id]) {
            this.data.notes[id].title = title;
            this.data.notes[id].content = content;
            if (folderId !== undefined) {
                this.data.notes[id].folderId = folderId;
            }
            this.saveData();
        }
    }

    deleteNote(id) {
        delete this.data.notes[id];
        this.data.rootOrder = this.data.rootOrder.filter(nId => nId !== id);
        this.saveData();
    }

    getNote(id) {
        return this.data.notes[id];
    }

    getNoteByTitle(title) {
        return Object.values(this.data.notes).find(n => n.title.toLowerCase() === title.toLowerCase());
    }

    getRootItems() {
        return this.data.rootOrder.map(id => {
            if (this.data.notes[id]) {
                return { type: 'note', ...this.data.notes[id] };
            } else if (this.data.folders[id]) {
                return { type: 'folder', ...this.data.folders[id] };
            }
            return null;
        }).filter(Boolean);
    }

    reorderRootNotes(newOrder) {
        this.data.rootOrder = newOrder;
        this.saveData();
    }

    extractLinks(content) {
        const linkRegex = /\[\[(.*?)\]\]/g;
        let match;
        const links = [];
        while ((match = linkRegex.exec(content)) !== null) {
            links.push(match[1]);
        }
        return [...new Set(links)]; // Unique titles
    }

    // --- Folders ---
    createFolder(name) {
        const id = 'folder_' + Math.random().toString(36).substr(2, 9);
        const folder = { id, name, color: getRandomColor() };
        this.data.folders[id] = folder;
        this.data.rootOrder.push(id);
        this.saveData();
        return folder;
    }

    getFolders() {
        return Object.values(this.data.folders);
    }

    getNotesInFolder(folderId) {
        return Object.values(this.data.notes).filter(n => n.folderId === folderId);
    }
}

window.appStore = new Store();
