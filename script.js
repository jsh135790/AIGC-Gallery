// 主要功能脚本 - NAIv4 Artists Codex
class ArtistsApp {
    constructor() {
        this.currentData = FULL_ARTISTS_DATA;
        this.displayedItems = [];
        this.itemsPerPage = 50;
        this.currentPage = 0;
        this.isShowingFavorites = false;
        this.searchQuery = '';
        this.isLoading = false;
        this.currentToast = null; // 添加当前toast引用，防止叠加
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadInitialData();
        this.setupIntersectionObserver();
    }
    
    bindEvents() {
        // 搜索功能
        const searchInput = document.getElementById('search-input');
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.handleSearch(e.target.value);
            }, 300);
        });
        
        // 收藏切换按钮
        const toggleFavoritesBtn = document.getElementById('toggle-favorites');
        toggleFavoritesBtn.addEventListener('click', () => {
            this.toggleFavorites();
        });
        
        // 导入收藏按钮
        const importBtn = document.getElementById('import-favorites');
        const fileInput = document.getElementById('import-file-input');
        importBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleImport(e.target.files[0]);
            }
        });
        
        // 导出收藏按钮
        const exportBtn = document.getElementById('export-favorites');
        exportBtn.addEventListener('click', () => {
            this.handleExport();
        });
        
        // 加载更多按钮
        const loadMoreBtn = document.getElementById('load-more-btn');
        loadMoreBtn.addEventListener('click', () => {
            this.loadMoreItems();
        });
        
        // 图片点击放大功能
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('artist-image')) {
                this.showImageModal(e.target.src);
            }
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeImageModal();
            }
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                searchInput.focus();
            }
        });
    }
    
    loadInitialData() {
        this.currentPage = 0;
        this.displayedItems = [];
        this.loadMoreItems();
    }
    
    loadMoreItems() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();
        
        // 模拟异步加载以提升性能
        setTimeout(() => {
            const startIndex = this.currentPage * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const newItems = this.currentData.slice(startIndex, endIndex);
            
            this.displayedItems.push(...newItems);
            this.renderItems(newItems);
            this.currentPage++;
            
            this.updateLoadMoreButton();
            this.isLoading = false;
        }, 100);
    }
    
    renderItems(items) {
        const container = document.getElementById('artists-container');
        
        items.forEach(artist => {
            const artistElement = this.createArtistElement(artist);
            container.appendChild(artistElement);
        });
        
        // 添加交叉观察器来实现懒加载
        this.observeImages();
    }
    
    // 检测图片链接是否有效
    isValidImageUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        // 去除首尾空格
        url = url.trim();
        if (url === '') return false;
        
        // 检查是否是有效的URL格式（http/https开头）
        const urlPattern = /^https?:\/\/.+/;
        
        // 检查是否是有效的相对路径（以./或../或/开头，或直接是文件名）
        const pathPattern = /^(\.\/|\.\.\/|\/|[^\/\s]+\.(jpg|jpeg|png|gif|webp|svg))/i;
        
        return urlPattern.test(url) || pathPattern.test(url);
    }
    
    // 创建SVG占位符
    createImagePlaceholder() {
        return `
            <div class="image-placeholder">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
                <span>暂无图片</span>
            </div>
        `;
    }
    
    createArtistElement(artist) {
        const div = document.createElement('div');
        div.className = 'artist-item';
        div.setAttribute('data-artist-id', artist.id);
        
        const isFav = isFavorited(artist.id);
        
        // 检测图片链接有效性
        const hasImage1 = this.isValidImageUrl(artist.image1);
        const hasImage2 = this.isValidImageUrl(artist.image2);
        
        // 构建图片HTML
        const image1Html = hasImage1 
            ? `<img class="artist-image" data-src="${artist.image1}" alt="${artist.name} 样例 1" loading="lazy">`
            : this.createImagePlaceholder();
            
        const image2Html = hasImage2 
            ? `<img class="artist-image" data-src="${artist.image2}" alt="${artist.name} 样例 2" loading="lazy">`
            : this.createImagePlaceholder();
        
        div.innerHTML = `
            <button class="favorite-btn ${isFav ? 'favorited' : ''}" data-artist-id="${artist.id}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
            </button>
            <div class="artist-number">#${artist.id}</div>
            <div class="artist-name" title="点击复制">${artist.name}</div>
            <div class="artist-images">
                ${image1Html}
                ${image2Html}
            </div>
        `;
        
        // 绑定收藏按钮事件
        const favoriteBtn = div.querySelector('.favorite-btn');
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFavorite(artist.id);
        });
        
        // 绑定复制功能
        const artistName = div.querySelector('.artist-name');
        artistName.addEventListener('click', () => {
            this.copyToClipboard(artist.name);
        });
        
        return div;
    }
    
    setupIntersectionObserver() {
        // 图片懒加载观察器
        this.imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.getAttribute('data-src');
                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                        this.imageObserver.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px'
        });
    }
    
    observeImages() {
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => {
            this.imageObserver.observe(img);
        });
    }
    
    handleSearch(query) {
        this.searchQuery = query;
        this.currentData = searchArtists(query);
        this.clearContainer();
        this.loadInitialData();
    }
    
    toggleFavorites() {
        const toggleBtn = document.getElementById('toggle-favorites');
        const span = toggleBtn.querySelector('span');
        
        this.isShowingFavorites = !this.isShowingFavorites;
        
        if (this.isShowingFavorites) {
            this.currentData = getFavoriteArtists();
            toggleBtn.classList.add('active');
            span.textContent = '显示全部';
        } else {
            this.currentData = this.searchQuery ? searchArtists(this.searchQuery) : FULL_ARTISTS_DATA;
            toggleBtn.classList.remove('active');
            span.textContent = '显示收藏';
        }
        
        this.clearContainer();
        this.loadInitialData();
    }
    
    toggleFavorite(artistId) {
        const favoriteBtn = document.querySelector(`.favorite-btn[data-artist-id="${artistId}"]`);
        const isFav = isFavorited(artistId);
        
        if (isFav) {
            removeFromFavorites(artistId);
            favoriteBtn.classList.remove('favorited');
            
            // 如果当前显示收藏列表，移除该项目
            if (this.isShowingFavorites) {
                const artistItem = favoriteBtn.closest('.artist-item');
                artistItem.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => {
                    artistItem.remove();
                }, 300);
            }
            
            this.showToast('已取消收藏', 'warning');
        } else {
            addToFavorites(artistId);
            favoriteBtn.classList.add('favorited');
            this.showToast('已添加到收藏', 'success');
        }
    }
    
    async handleImport(file) {
        try {
            const count = await importFavorites(file);
            this.showToast(`成功导入 ${count} 个收藏项目`, 'success');
            
            // 如果当前显示收藏，刷新显示
            if (this.isShowingFavorites) {
                this.toggleFavorites();
                this.toggleFavorites();
            }
        } catch (error) {
            this.showToast(`导入失败: ${error}`, 'error');
        }
    }
    
    handleExport() {
        const favorites = getFavoriteArtists();
        if (favorites.length === 0) {
            this.showToast('没有收藏项目可导出', 'warning');
            return;
        }
        
        exportFavorites();
        this.showToast(`成功导出 ${favorites.length} 个收藏项目`, 'success');
    }
    
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('已复制到剪贴板', 'info');
        }).catch(() => {
            // 兼容旧浏览器
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('已复制到剪贴板', 'info');
        });
    }
    
    showImageModal(src) {
        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-content">
                    <img src="${src}" alt="预览图片">
                    <button class="modal-close">&times;</button>
                </div>
            </div>
        `;
        
        // 计算安全的显示尺寸
        const safeWidth = Math.min(window.innerWidth - 80, 800); // 最大800px，两边各留40px
        const safeHeight = Math.min(window.innerHeight - 120, 1000); // 最大1000px，上下各留60px
        
        // 添加样式
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            backdrop-filter: blur(15px);
            overflow: hidden;
        `;
        
        const modalContent = modal.querySelector('.modal-content');
        modalContent.style.cssText = `
            position: relative;
            max-width: ${safeWidth}px;
            max-height: ${safeHeight}px;
            width: auto;
            height: auto;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 40px;
        `;
        
        const img = modal.querySelector('img');
        img.style.cssText = `
            max-width: 90vw;
            max-height: 90vh;
            width: auto;
            height: auto;
            object-fit: contain;
            border-radius: 1rem;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
            border: 2px solid rgba(255, 255, 255, 0.1);
            display: block;
        `;
        
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 2rem;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            cursor: pointer;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
            z-index: 1001;
        `;
        
        // 添加关闭按钮悬停效果
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
            closeBtn.style.transform = 'scale(1.1)';
        });
        
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            closeBtn.style.transform = 'scale(1)';
        });
        
        // 绑定关闭事件
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.className === 'modal-backdrop') {
                this.closeImageModal();
            }
        });
        
        closeBtn.addEventListener('click', () => {
            this.closeImageModal();
        });
        
        document.body.appendChild(modal);
        this.currentModal = modal;
        
        // 防止页面滚动
        document.body.style.overflow = 'hidden';
        
        // 图片加载完成后进行最终尺寸调整
        img.onload = () => {
            const imgAspectRatio = img.naturalWidth / img.naturalHeight;
            const containerAspectRatio = safeWidth / safeHeight;
            
            if (imgAspectRatio > containerAspectRatio) {
                // 图片更宽，以宽度为准
                img.style.width = '100%';
                img.style.height = 'auto';
            } else {
                // 图片更高，以高度为准
                img.style.width = 'auto';
                img.style.height = '100%';
            }
        };
        
        // 窗口大小改变时重新计算
        const handleResize = () => {
            const newSafeWidth = Math.min(window.innerWidth - 80, 800);
            const newSafeHeight = Math.min(window.innerHeight - 120, 1000);
            modalContent.style.maxWidth = `${newSafeWidth}px`;
            modalContent.style.maxHeight = `${newSafeHeight}px`;
            
            // 移动端调整
            if (window.innerWidth <= 768) {
                closeBtn.style.top = '10px';
                closeBtn.style.right = '10px';
                closeBtn.style.width = '45px';
                closeBtn.style.height = '45px';
                closeBtn.style.fontSize = '1.5rem';
                modalContent.style.margin = '20px';
            } else {
                closeBtn.style.top = '20px';
                closeBtn.style.right = '20px';
                closeBtn.style.width = '50px';
                closeBtn.style.height = '50px';
                closeBtn.style.fontSize = '2rem';
                modalContent.style.margin = '40px';
            }
        };
        
        handleResize();
        window.addEventListener('resize', handleResize);
        
        // 清理resize监听器
        modal.addEventListener('remove', () => {
            window.removeEventListener('resize', handleResize);
        });
    }
    
    closeImageModal() {
        if (this.currentModal) {
            this.currentModal.remove();
            this.currentModal = null;
            // 恢复页面滚动
            document.body.style.overflow = 'auto';
        }
    }
    
    showToast(message, type = 'info') {
        // 如果有当前toast，先移除
        if (this.currentToast) {
            this.currentToast.remove();
            this.currentToast = null;
        }
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // 创建SVG图标
        const icons = {
            success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"/>
            </svg>`,
            error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>`,
            warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>`,
            info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>`
        };
        
        // 设置现代化的配色方案
        const toastStyles = {
            success: {
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                icon: icons.success
            },
            error: {
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                icon: icons.error
            },
            warning: {
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#f59e0b',
                icon: icons.warning
            },
            info: {
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#6366f1',
                icon: icons.info
            }
        };
        
        const style = toastStyles[type] || toastStyles.info;
        
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">${style.icon}</div>
                <span class="toast-message">${message}</span>
            </div>
        `;
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${style.background};
            border: ${style.border};
            color: ${style.color};
            padding: 1rem 1.25rem;
            border-radius: 0.75rem;
            z-index: 1001;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
            transform: translateX(120%);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(16px);
            font-weight: 500;
            max-width: 320px;
            word-break: break-word;
            font-family: inherit;
        `;
        
        // 内容样式
        const content = toast.querySelector('.toast-content');
        content.style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.75rem;
        `;
        
        const iconElement = toast.querySelector('.toast-icon');
        iconElement.style.cssText = `
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${style.color};
        `;
        
        const messageElement = toast.querySelector('.toast-message');
        messageElement.style.cssText = `
            font-size: 0.875rem;
            line-height: 1.5;
            color: #ffffff;
            font-weight: 500;
        `;
        
        document.body.appendChild(toast);
        this.currentToast = toast;
        
        // 动画显示
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 10);
        
        // 添加悬停暂停功能
        let hideTimeout;
        
        const startHideTimer = () => {
            hideTimeout = setTimeout(() => {
                this.hideToast(toast);
            }, 4000); // 增加显示时间到4秒
        };
        
        const clearHideTimer = () => {
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }
        };
        
        toast.addEventListener('mouseenter', () => {
            clearHideTimer();
            toast.style.transform = 'translateX(-4px)';
        });
        
        toast.addEventListener('mouseleave', () => {
            toast.style.transform = 'translateX(0)';
            startHideTimer();
        });
        
        // 点击关闭
        toast.addEventListener('click', () => {
            clearHideTimer();
            this.hideToast(toast);
        });
        
        // 开始计时
        startHideTimer();
    }
    
    hideToast(toast) {
        if (toast && toast.parentNode) {
            toast.style.transform = 'translateX(120%)';
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
                if (this.currentToast === toast) {
                    this.currentToast = null;
                }
            }, 400);
        }
    }
    
    showLoadingState() {
        const container = document.getElementById('artists-container');
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading';
        loadingDiv.textContent = '加载中...';
        container.appendChild(loadingDiv);
        
        setTimeout(() => {
            if (loadingDiv.parentNode) {
                loadingDiv.remove();
            }
        }, 1000);
    }
    
    updateLoadMoreButton() {
        const loadMoreBtn = document.getElementById('load-more-btn');
        const loadMoreContainer = document.getElementById('load-more-container');
        
        const hasMore = this.displayedItems.length < this.currentData.length;
        
        if (hasMore) {
            loadMoreContainer.style.display = 'flex';
            loadMoreBtn.disabled = false;
            const remaining = this.currentData.length - this.displayedItems.length;
            loadMoreBtn.querySelector('svg').nextSibling.textContent = ` 加载更多 (${remaining})`;
        } else {
            loadMoreContainer.style.display = 'none';
        }
    }
    
    clearContainer() {
        const container = document.getElementById('artists-container');
        container.innerHTML = '';
        this.currentPage = 0;
        this.displayedItems = [];
    }
}

// 性能监控和优化
class PerformanceMonitor {
    constructor() {
        this.startTime = performance.now();
        this.checkpoints = {};
    }
    
    checkpoint(name) {
        this.checkpoints[name] = performance.now() - this.startTime;
        console.log(`⏱️ ${name}: ${this.checkpoints[name].toFixed(2)}ms`);
    }
    
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .artist-item {
        animation: fadeIn 0.3s ease-out;
    }
    
    .toast {
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .toast:hover {
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2), 0 4px 8px rgba(0, 0, 0, 0.15) !important;
    }
    
    .toast-content {
        pointer-events: none;
    }
    
    .image-modal {
        animation: fadeIn 0.2s ease-out;
    }
    
    /* Toast响应式设计 */
    @media (max-width: 480px) {
        .toast {
            top: 10px !important;
            right: 10px !important;
            left: 10px !important;
            max-width: none !important;
            transform: translateY(-120%) !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        
        .toast.show {
            transform: translateY(0) !important;
        }
    }
`;
document.head.appendChild(style);

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    const monitor = new PerformanceMonitor();
    monitor.checkpoint('DOM Content Loaded');
    
    app = new ArtistsApp();
    monitor.checkpoint('App Initialized');
    
    console.log('🎨 NAIv4 Artists Codex 加载完成!');
    console.log(`📊 总计 ${FULL_ARTISTS_DATA.length} 位画师`);
}); 