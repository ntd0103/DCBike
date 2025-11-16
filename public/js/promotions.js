// Promotions Management
class PromotionService {
    constructor() {
        this.appliedPromotion = null;
        this.init();
    }

    init() {
        this.loadPromotions();
    }

    // Load all promotions
    async loadPromotions() {
        try {
            // Fetch active promotions (public endpoint)
            const response = await fetch('/api/promotions/active');
            const result = await response.json();

            if (result.success) {
                // Normalize server response shapes: result.data may be an array or an object
                let promotions = [];
                if (Array.isArray(result.data)) promotions = result.data;
                else if (result.data && Array.isArray(result.data.promotions)) promotions = result.data.promotions;
                else promotions = [];

                this.displayPromotions(promotions);
                // If booking page has a small container, render a compact list of available promotions
                if (document.getElementById('available-promotions-mini')) {
                    this.renderAvailablePromotions(promotions);
                }
                // If booking modal exists, render promotions there too
                if (document.getElementById('available-promotions-modal')) {
                    this.renderAvailablePromotionsModal(promotions);
                }
            } else {
                console.error('Failed to load promotions:', result.message);
            }
        } catch (error) {
            console.error('Load promotions error:', error);
        }
    }

    // Render compact list of available promotions into booking page small container
    renderAvailablePromotions(promotions) {
        const container = document.getElementById('available-promotions-mini');
        if (!container) return;

        // Filter active-like statuses
        const active = promotions.filter(p => !p.trang_thai || p.trang_thai === 'hoat_dong' || p.trang_thai === 'kich_hoat' || p.trang_thai === 'active');
        if (active.length === 0) {
            container.innerHTML = `<div class="col-12 text-muted small">Không có mã khả dụng.</div>`;
            return;
        }

        let html = '';
        active.forEach(p => {
            const totalAllowed = p.so_luong_toi_da || p.so_luong_toi_da || p.gioi_han_su_dung || null;
            const used = p.so_luong_su_dung || 0;
            const remaining = totalAllowed ? Math.max(0, totalAllowed - used) : 'Không giới hạn';

            html += `
                <div class="col-12">
                    <div class="d-flex align-items-center border rounded p-2">
                        <div class="flex-grow-1">
                            <div class="fw-bold">${p.ten_khuyen_mai || p.ten || ''}</div>
                            <div class="small text-muted">Mã: ${p.ma_khuyen_mai} • Giảm: ${this.formatDiscount(p)}</div>
                            <div class="small text-muted">Còn lại: ${remaining}</div>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-primary" onclick="applyPromotionFromModal('${p.ma_khuyen_mai}')">Sử dụng</button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // Render list of available promotions into the booking modal
    renderAvailablePromotionsModal(promotions) {
        const container = document.getElementById('available-promotions-modal');
        if (!container) return;

        const active = promotions.filter(p => !p.trang_thai || p.trang_thai === 'hoat_dong' || p.trang_thai === 'kich_hoat' || p.trang_thai === 'active');
        if (active.length === 0) {
            container.innerHTML = `<div class="col-12 text-muted small">Không có mã khả dụng.</div>`;
            return;
        }

        let html = '';
        active.forEach(p => {
            const totalAllowed = p.so_luong_toi_da || p.gioi_han_su_dung || null;
            const used = p.so_luong_su_dung || 0;
            const remaining = totalAllowed ? Math.max(0, totalAllowed - used) : 'Không giới hạn';

            html += `
                <div class="col-12">
                    <div class="d-flex align-items-center border rounded p-2">
                        <div class="flex-grow-1">
                            <div class="fw-bold">${p.ten_khuyen_mai || p.ten || ''}</div>
                            <div class="small text-muted">Mã: ${p.ma_khuyen_mai}</div>
                            <div class="small text-muted">Giảm: ${this.formatDiscount(p)} • Còn lại: ${remaining}</div>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-primary" onclick="applyPromotionFromModal('${p.ma_khuyen_mai}')">Sử dụng</button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // Display promotions
    displayPromotions(promotions) {
        const promotionsContainer = document.getElementById('promotions-list');
        if (!promotionsContainer) return;

        let html = '';

        if (promotions.length === 0) {
            html = '<div class="col-12 text-center"><p>Hiện tại không có khuyến mãi nào.</p></div>';
        } else {
            promotions.forEach(promotion => {
                // Compute remaining uses if fields exist
                const totalAllowed = promotion.so_luong_toi_da || promotion.gioi_han_su_dung || null;
                const used = promotion.so_luong_su_dung || 0;
                const remaining = totalAllowed ? Math.max(0, totalAllowed - used) : 'Không giới hạn';

                html += `
                    <div class="col-md-6 col-lg-4 mb-4">
                        <div class="card h-100 ${promotion.trang_thai !== 'kich_hoat' ? 'opacity-75' : ''}">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-3">
                                    <h6 class="card-title">${promotion.ten_khuyen_mai}</h6>
                                    <span class="badge ${this.getStatusBadgeClass(promotion.trang_thai)}">
                                        ${this.getStatusText(promotion.trang_thai)}
                                    </span>
                                </div>
                                
                                <div class="mb-3">
                                    <div class="promotion-code">
                                        <strong>Mã: ${promotion.ma_khuyen_mai}</strong>
                                        <button class="btn btn-sm btn-outline-primary ms-2" 
                                                onclick="copyPromotionCode('${promotion.ma_khuyen_mai}')">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                    </div>
                                </div>

                                ${promotion.mo_ta ? `<p class="card-text">${promotion.mo_ta}</p>` : ''}

                                <div class="promotion-details">
                                    <div class="row g-2 text-sm">
                                        <div class="col-6">
                                            <strong>Giảm giá:</strong><br>
                                            ${this.formatDiscount(promotion)}
                                        </div>
                                        <div class="col-6">
                                            <strong>Đơn tối thiểu:</strong><br>
                                            ${this.formatPrice(promotion.gia_tri_toi_thieu)} VND
                                        </div>
                                        ${promotion.gia_tri_toi_da ? `
                                            <div class="col-6">
                                                <strong>Giảm tối đa:</strong><br>
                                                ${this.formatPrice(promotion.gia_tri_toi_da)} VND
                                            </div>
                                        ` : ''}
                                        <div class="col-6">
                                            <strong>Còn lại:</strong><br>
                                            ${remaining}
                                        </div>
                                    </div>
                                </div>

                                <div class="mt-3">
                                    <small class="text-muted">
                                        <i class="fas fa-calendar me-1"></i>
                                        ${this.formatDateRange(promotion.ngay_bat_dau, promotion.ngay_ket_thuc)}
                                    </small>
                                </div>

                                ${((promotion.trang_thai === 'kich_hoat' || promotion.trang_thai === 'hoat_dong') && (totalAllowed === null || remaining > 0)) ? `
                                    <div class="mt-3">
                                        <button class="btn btn-primary btn-sm w-100" 
                                                onclick="usePromotionCode('${promotion.ma_khuyen_mai}')">
                                            Sử dụng mã này
                                        </button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        promotionsContainer.innerHTML = html;
    }

    // Get status badge class
    getStatusBadgeClass(status) {
        const classes = {
            'kich_hoat': 'bg-success',
            'tam_dung': 'bg-warning',
            'het_han': 'bg-secondary',
            'het_luot': 'bg-danger'
        };
        return classes[status] || 'bg-secondary';
    }

    // Get status text
    getStatusText(status) {
        const texts = {
            'kich_hoat': 'Có hiệu lực',
            'tam_dung': 'Tạm dừng',
            'het_han': 'Hết hạn',
            'het_luot': 'Hết lượt'
        };
        return texts[status] || status;
    }

    // Format discount value
    formatDiscount(promotion) {
        if (!promotion) return '';
        if (promotion.loai_khuyen_mai === 'phan_tram') {
            return `${promotion.gia_tri}%`;
        } else {
            return `${this.formatPrice(promotion.gia_tri)} VND`;
        }
    }

    // Format price
    formatPrice(price) {
        return new Intl.NumberFormat('vi-VN').format(price);
    }

    // Format date range
    formatDateRange(startDate, endDate) {
        const start = new Date(startDate).toLocaleDateString('vi-VN');
        const end = new Date(endDate).toLocaleDateString('vi-VN');
        return `${start} - ${end}`;
    }

    // Apply promotion code
    async applyPromotionCode(promotionCode, orderTotal) {
        try {
            // Call public validate endpoint which expects { ma_khuyen_mai, gia_don_hang }
            const response = await fetch('/api/promotions/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ma_khuyen_mai: promotionCode,
                    gia_don_hang: orderTotal
                })
            });

            const result = await response.json();

            if (result.success && result.data) {
                // Normalize appliedPromotion shape for UI code (gia_tri_giam absolute value)
                const applied = {
                    ma_khuyen_mai: promotionCode,
                    gia_tri_giam: result.data.giam_gia || 0,
                    promotion: result.data.promotion || null
                };

                this.appliedPromotion = applied;
                this.displayPromotionResult(applied);
                return applied;
            } else {
                this.displayPromotionError(result.message || 'Mã không hợp lệ');
                return null;
            }
        } catch (error) {
            console.error('Apply promotion error:', error);
            this.displayPromotionError('Lỗi khi áp dụng mã khuyến mãi');
            return null;
        }
    }

    // Display promotion result
    displayPromotionResult(promotionData) {
        const resultContainer = document.getElementById('promotion-result');
        if (!resultContainer) return;

        resultContainer.innerHTML = `
            <div class="alert alert-success alert-sm">
                <i class="fas fa-check-circle me-2"></i>
                <strong>Áp dụng thành công!</strong><br>
                Giảm giá: ${this.formatPrice(promotionData.gia_tri_giam)} VND
                <button class="btn btn-sm btn-outline-danger ms-2" onclick="promotionService.removePromotion()">
                    Hủy
                </button>
            </div>
        `;
    }

    // Display promotion error
    displayPromotionError(message) {
        const resultContainer = document.getElementById('promotion-result');
        if (!resultContainer) return;

        resultContainer.innerHTML = `
            <div class="alert alert-danger alert-sm">
                <i class="fas fa-exclamation-circle me-2"></i>
                ${message}
            </div>
        `;
    }

    // Remove applied promotion
    removePromotion() {
        this.appliedPromotion = null;
        const resultContainer = document.getElementById('promotion-result');
        if (resultContainer) {
            resultContainer.innerHTML = '';
        }
        
        // Clear promotion code input
        const promotionInput = document.getElementById('promotion-code');
        if (promotionInput) {
            promotionInput.value = '';
        }
    }

    // Get applied promotion
    getAppliedPromotion() {
        return this.appliedPromotion;
    }

}

// Apply promotion (called from booking form)
async function applyPromotion() {
    const promotionInput = document.getElementById('promotion-code');
    const promotionCode = promotionInput.value.trim();

    if (!promotionCode) {
        showAlert('warning', 'Vui lòng nhập mã khuyến mãi');
        return;
    }

    // Use last calculated total if available, otherwise fallback to a sample
    const orderTotal = (typeof window.lastCalculatedTotal === 'number' && window.lastCalculatedTotal > 0) ? window.lastCalculatedTotal : 100000;

    const result = await promotionService.applyPromotionCode(promotionCode, orderTotal);
    
    if (result) {
        showAlert('success', `Áp dụng mã khuyến mãi thành công! Giảm ${promotionService.formatPrice(result.gia_tri_giam)} VND`);
        // Recalculate UI prices if booking page has calculatePrice
        try { if (typeof calculatePrice === 'function') calculatePrice(); } catch (e) { console.debug('calculatePrice not available', e); }
    }
}

// Apply an available promotion code directly from the compact list on booking page
async function applyAvailablePromotion(code) {
    const orderTotal = (typeof window.lastCalculatedTotal === 'number' && window.lastCalculatedTotal > 0) ? window.lastCalculatedTotal : 100000;

    const result = await promotionService.applyPromotionCode(code, orderTotal);
    if (result) {
        showAlert('success', `Áp dụng mã ${code} thành công! Giảm ${promotionService.formatPrice(result.gia_tri_giam)} VND`);
        // Switch UI to manual mode and show code in input
        const manualRadio = document.getElementById('promo-manual');
        const manualArea = document.getElementById('promo-manual-area');
        const availableArea = document.getElementById('promo-available-area');
        const promoInput = document.getElementById('promotion-code');
        try {
            if (manualRadio) manualRadio.checked = true;
            if (manualArea) manualArea.style.display = 'block';
            if (availableArea) availableArea.style.display = 'none';
            if (promoInput) promoInput.value = code;
        } catch (e) { console.debug(e); }

        try { if (typeof calculatePrice === 'function') calculatePrice(); } catch (e) { console.debug('calculatePrice not available', e); }
    }
}

// Open promotion modal (booking page)
function openPromotionModal() {
    const modalEl = document.getElementById('promotionModal');
    if (!modalEl) return;
    const modal = new bootstrap.Modal(modalEl);
    // Ensure promotions are up-to-date
    try {
        promotionService.loadPromotions();
    } catch (e) { console.debug('Failed to reload promotions before opening modal', e); }
    modal.show();
    // Focus input after short delay
    setTimeout(() => {
        const input = document.getElementById('promotion-code-modal');
        if (input) input.focus();
    }, 250);
}

// Apply promotion from modal: either typed code or selected code
async function applyPromotionFromModal(code) {
    const promoCode = code || (document.getElementById('promotion-code-modal') && document.getElementById('promotion-code-modal').value.trim());
    if (!promoCode) {
        showAlert('warning', 'Vui lòng nhập hoặc chọn mã khuyến mãi');
        return;
    }

    const orderTotal = (typeof window.lastCalculatedTotal === 'number' && window.lastCalculatedTotal > 0) ? window.lastCalculatedTotal : 100000;

    const result = await promotionService.applyPromotionCode(promoCode, orderTotal);
    if (result) {
        showAlert('success', `Áp dụng mã ${promoCode} thành công! Giảm ${promotionService.formatPrice(result.gia_tri_giam)} VND`);

        // Mirror code into main input (if present)
        const mainInput = document.getElementById('promotion-code');
        if (mainInput) mainInput.value = promoCode;

        // Close modal
        try {
            const modalEl = document.getElementById('promotionModal');
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.hide();
        } catch (e) { console.debug('Promotion modal close failed', e); }

        // Recalculate prices on booking page if available
        try { if (typeof calculatePrice === 'function') calculatePrice(); } catch (e) { console.debug('calculatePrice not available', e); }
    }
}

// Initialize promotion service
const promotionService = new PromotionService();