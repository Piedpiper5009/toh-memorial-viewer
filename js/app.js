// ToH Memorial Viewer - Client-Side Application

class MemorialViewer {
    constructor() {
        this.data = null;
        this.filteredImages = [];
        // Default ToH sort: newest year first, then state code order, then sequence number
        this.currentSort = { field: 'memorial_code', direction: 'desc' };
        this.searchTerm = '';

        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.setupEventListeners();
            this.initDarkMode();
            this.populateFilters();
            document.getElementById('statusFilter').value = 'active';
            this.applyFilters();
        } catch (error) {
            console.error('Failed to initialize viewer:', error);
            this.showError('Failed to load memorial data. Please check the data source.');
        }
    }

    async loadData() {
        console.log('Loading embedded memorial data...');

        // Wait for the data script to load if it hasn't already
        if (typeof TOH_MEMORIAL_DATA === 'undefined') {
            // Try to load the script dynamically
            await this.loadDataScript();
        }

        if (typeof TOH_MEMORIAL_DATA !== 'undefined') {
            this.data = TOH_MEMORIAL_DATA;
            console.log('Loaded embedded data:', this.data);
        } else {
            throw new Error('Unable to load memorial data. Please regenerate the data files.');
        }
    }

    async loadDataScript() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'data/toh_data.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load data script'));
            document.head.appendChild(script);
        });
    }

    setupEventListeners() {
        // Search input
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // Filters
        document.getElementById('categoryFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('stateFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('statusFilter').addEventListener('change', () => this.applyFilters());

        // Sort controls
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.currentSort.field = e.target.value;
            this.applyFilters();
        });

        document.getElementById('sortDirection').addEventListener('click', () => {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
            this.updateSortDirectionButton();
            this.applyFilters();
        });

        // Reset and utility buttons
        document.getElementById('resetFilters').addEventListener('click', () => this.resetFilters());
        document.getElementById('scrollToTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

        // Summary toggle
        document.getElementById('summaryToggle').addEventListener('click', () => this.toggleSummary());
    }

    initDarkMode() {
        const saved = localStorage.getItem('darkMode');
        if (saved === 'true') {
            document.body.classList.add('dark-mode');
        }
        document.getElementById('darkModeToggle').addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark);
            this.updateDarkModeButton();
        });
        this.updateDarkModeButton();
    }

    updateDarkModeButton() {
        const button = document.getElementById('darkModeToggle');
        const isDark = document.body.classList.contains('dark-mode');
        button.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    }

    populateFilters() {
        // Populate category filter
        const categorySelect = document.getElementById('categoryFilter');
        this.data.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });

        // Populate state filter
        const stateSelect = document.getElementById('stateFilter');
        this.data.states.forEach(state => {
            const option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            stateSelect.appendChild(option);
        });
    }

    applyFilters() {
        let filtered = [...this.data.images];

        // Apply category filter
        const categoryFilter = document.getElementById('categoryFilter').value;
        if (categoryFilter) {
            filtered = filtered.filter(img => img.category === categoryFilter);
        }

        // Apply state filter
        const stateFilter = document.getElementById('stateFilter').value;
        if (stateFilter) {
            filtered = filtered.filter(img => img.state === stateFilter);
        }

        // Apply status filter
        const statusFilter = document.getElementById('statusFilter').value;
        if (statusFilter) {
            filtered = filtered.filter(img => img.status === statusFilter);
        }

        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(img =>
                img.filename.toLowerCase().includes(this.searchTerm) ||
                img.city.toLowerCase().includes(this.searchTerm) ||
                img.memorial_code.toLowerCase().includes(this.searchTerm) ||
                img.category.toLowerCase().includes(this.searchTerm) ||
                img.state.toLowerCase().includes(this.searchTerm)
            );
        }

        // Apply sorting
        if (this.currentSort.field === 'memorial_code') {
            filtered.sort((a, b) => {
                let comparison = this.compareDefaultMemorials(a, b);

                if (this.currentSort.direction === 'asc') {
                    comparison = -comparison;
                }

                return comparison;
            });
        } else if (this.currentSort.field === 'category') {
            filtered.sort((a, b) => {
                const order = this.data.categories || [];
                const aIndex = order.indexOf(a.category);
                const bIndex = order.indexOf(b.category);
                let comparison = aIndex - bIndex;

                if (comparison === 0) {
                    comparison = a.memorial_code.localeCompare(b.memorial_code, undefined, { numeric: true, sensitivity: 'base' });
                }

                if (this.currentSort.direction === 'desc') {
                    comparison = -comparison;
                }

                return comparison;
            });
        } else {
            filtered.sort((a, b) => {
                const aVal = (a[this.currentSort.field] || '').toString();
                const bVal = (b[this.currentSort.field] || '').toString();

                if (this.currentSort.direction === 'asc') {
                    return aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
                } else {
                    return bVal.localeCompare(aVal, undefined, { numeric: true, sensitivity: 'base' });
                }
            });
        }

        this.filteredImages = filtered;
        this.updateDisplay();
    }

    parseMemorialCode(code) {
        const value = (code || '').toString().trim();
        const year = parseInt(value.slice(0, 4), 10) || 0;
        let remainder = value.slice(4);

        const stateMatch = remainder.match(/^[A-Za-z]{2}/);
        const state = stateMatch ? stateMatch[0].toUpperCase() : '';

        let seq = remainder.slice(state.length);
        seq = parseInt(seq.replace(/[^0-9]/g, ''), 10) || 0;

        return { year, state, seq };
    }

    compareTourOfHonor(a, b) {
        const aa = this.parseMemorialCode(a.memorial_code);
        const bb = this.parseMemorialCode(b.memorial_code);

        // Year descending
        if (aa.year !== bb.year) {
            return bb.year - aa.year;
        }

        // State ascending (AK -> WY)
        if (aa.state !== bb.state) {
            return aa.state.localeCompare(bb.state, undefined, { sensitivity: 'base' });
        }

        // Sequence ascending (1 to 7)
        return aa.seq - bb.seq;
    }

    compareDefaultMemorials(a, b) {
        const categoryOrder = this.data.categories || [];
        const aCatIndex = categoryOrder.indexOf(a.category);
        const bCatIndex = categoryOrder.indexOf(b.category);

        if (aCatIndex !== bCatIndex) {
            return aCatIndex - bCatIndex;
        }

        if (a.category === 'Tour of Honor' && b.category === 'Tour of Honor') {
            return this.compareTourOfHonor(a, b);
        }

        // For other categories, lexical with numeric to keep DB001, DB002... order
        const codeCmp = a.memorial_code.localeCompare(b.memorial_code, undefined, { numeric: true, sensitivity: 'base' });
        return codeCmp;
    }

    updateDisplay() {
        this.updateSummary();
        this.renderImages();
        this.updateRecordCount();
    }

    updateSummary() {
        const summary = this.data.metadata.summary;
        document.getElementById('totalImages').textContent = summary.total_images.toLocaleString();
        document.getElementById('activeCount').textContent = summary.active_count.toLocaleString();
        document.getElementById('inactiveCount').textContent = summary.inactive_count.toLocaleString();
        document.getElementById('unknownCount').textContent = summary.unknown_count.toLocaleString();
        document.getElementById('statesCount').textContent = summary.states.toLocaleString();
        document.getElementById('categoriesCount').textContent = summary.categories.toLocaleString();

        document.getElementById('lastUpdated').textContent = `Last Updated: ${this.data.metadata.last_updated}`;
    }

    renderImages() {
        const grid = document.getElementById('imageGrid');

        if (this.filteredImages.length === 0) {
            grid.innerHTML = '<div class="loading">No images match the current filters.</div>';
            return;
        }

        const html = this.filteredImages.map(img => this.createImageCard(img)).join('');
        grid.innerHTML = html;
    }

    createImageCard(img) {
        const location = img.city && img.state ? `${img.category} - ${img.city}, ${img.state}` : img.category;
        const inactiveNote = img.status === 'inactive' ? '<div class="inactive-note">Inactive / no current API match</div>' :
                           img.status === 'unknown' ? '<div class="inactive-note">Status unknown - API unavailable</div>' : '';

        return `
            <article class="card" data-memorial-code="${img.memorial_code}" data-category="${img.category}" data-state="${img.state}" data-status="${img.status}">
                <a href="${img.url}" target="_blank" rel="noopener noreferrer" class="thumb-link">
                    <img src="${img.url}" loading="lazy" alt="${img.filename}">
                </a>
                <div class="card-body">
                    <div class="filename">${img.filename}</div>
                    <div class="category">${location}</div>
                    ${inactiveNote}
                    <div class="links">
                        <a href="${img.url}" target="_blank" rel="noopener noreferrer">Open Full Image</a>
                    </div>
                </div>
            </article>
        `;
    }

    updateRecordCount() {
        const count = this.filteredImages.length;
        const total = this.data.images.length;
        document.getElementById('recordCount').textContent = `Showing ${count.toLocaleString()} of ${total.toLocaleString()} images`;
    }

    updateSortDirectionButton() {
        const button = document.getElementById('sortDirection');
        button.textContent = this.currentSort.direction === 'asc' ? '▲' : '▼';
        button.title = this.currentSort.direction === 'asc' ? 'Ascending' : 'Descending';
    }

    resetFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('stateFilter').value = '';
        document.getElementById('statusFilter').value = 'active';
        document.getElementById('sortBy').value = 'memorial_code';

        this.searchTerm = '';
        this.currentSort = { field: 'memorial_code', direction: 'desc' };
        this.updateSortDirectionButton();
        this.applyFilters();
    }

    toggleSummary() {
        const summaryBar = document.getElementById('summaryBar');
        const toggleBtn = document.getElementById('summaryToggle');

        if (summaryBar.classList.contains('collapsed')) {
            summaryBar.classList.remove('collapsed');
            toggleBtn.textContent = '▲';
            toggleBtn.setAttribute('aria-expanded', 'true');
        } else {
            summaryBar.classList.add('collapsed');
            toggleBtn.textContent = '▼';
            toggleBtn.setAttribute('aria-expanded', 'false');
        }
    }

    showError(message) {
        const grid = document.getElementById('imageGrid');
        grid.innerHTML = `<div class="loading" style="color: #dc3545;">${message}</div>`;
    }
}

// Initialize the viewer when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MemorialViewer();
});