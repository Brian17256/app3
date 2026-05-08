class DragDropHandler {
    constructor(container, onReorder) {
        this.container = container;
        this.onReorder = onReorder;
        this.draggedItem = null;
        this.init();
    }

    init() {
        // We use event delegation since items are dynamic
        this.container.addEventListener('dragstart', this.handleDragStart.bind(this));
        this.container.addEventListener('dragover', this.handleDragOver.bind(this));
        this.container.addEventListener('dragenter', this.handleDragEnter.bind(this));
        this.container.addEventListener('drop', this.handleDrop.bind(this));
        this.container.addEventListener('dragend', this.handleDragEnd.bind(this));

        // For mobile touch drag (simple version)
        this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), {passive: false});
        this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), {passive: false});
        this.container.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    handleDragStart(e) {
        if (!e.target.classList.contains('note-square')) return;
        this.draggedItem = e.target;
        setTimeout(() => e.target.classList.add('dragging'), 0);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.innerHTML);
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    handleDragEnter(e) {
        e.preventDefault();
        const target = e.target.closest('.note-square');
        if (target && target !== this.draggedItem && this.draggedItem) {
            const allItems = [...this.container.querySelectorAll('.note-square')];
            const draggedIndex = allItems.indexOf(this.draggedItem);
            const targetIndex = allItems.indexOf(target);

            if (draggedIndex < targetIndex) {
                target.parentNode.insertBefore(this.draggedItem, target.nextSibling);
            } else {
                target.parentNode.insertBefore(this.draggedItem, target);
            }
        }
    }

    handleDrop(e) {
        e.stopPropagation();
        return false;
    }

    handleDragEnd(e) {
        if (this.draggedItem) {
            this.draggedItem.classList.remove('dragging');
            this.draggedItem = null;
            this.notifyReorder();
        }
    }

    notifyReorder() {
        if (this.onReorder) {
            const newOrder = [...this.container.querySelectorAll('.note-square')].map(el => el.dataset.id);
            this.onReorder(newOrder);
        }
    }

    // Very basic touch support for dragging
    handleTouchStart(e) {
        const target = e.target.closest('.note-square');
        if (!target) return;
        this.touchTimeout = setTimeout(() => {
            this.draggedItem = target;
            target.classList.add('dragging');
        }, 500); // long press to drag
    }

    handleTouchMove(e) {
        if (!this.draggedItem) {
            clearTimeout(this.touchTimeout);
            return;
        }
        e.preventDefault(); // prevent scroll
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const target = element ? element.closest('.note-square') : null;

        if (target && target !== this.draggedItem) {
            const allItems = [...this.container.querySelectorAll('.note-square')];
            const draggedIndex = allItems.indexOf(this.draggedItem);
            const targetIndex = allItems.indexOf(target);

            if (draggedIndex < targetIndex) {
                target.parentNode.insertBefore(this.draggedItem, target.nextSibling);
            } else {
                target.parentNode.insertBefore(this.draggedItem, target);
            }
        }
    }

    handleTouchEnd(e) {
        clearTimeout(this.touchTimeout);
        if (this.draggedItem) {
            this.draggedItem.classList.remove('dragging');
            this.draggedItem = null;
            this.notifyReorder();
        }
    }
}
