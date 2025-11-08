document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const screens = document.querySelectorAll('.screen');
    const createEventForm = document.getElementById('create-event-form');
    const shareUrlInput = document.getElementById('share-url');
    const copyUrlBtn = document.getElementById('copy-url-btn');
    const createAnotherEventBtn = document.getElementById('create-another-event-btn');
    const createNewEventFromDetailsBtn = document.getElementById('create-new-event-from-details');
    const addPaymentForm = document.getElementById('add-payment-form');
    const paymentsTbody = document.getElementById('payments-tbody');
    
    // 編集モーダル関連
    const editModal = document.getElementById('edit-modal');
    const editPaymentForm = document.getElementById('edit-payment-form');
    const closeBtn = document.querySelector('.close-btn');
    const editPaymentId = document.getElementById('edit-payment-id');

    let currentEventData = null;

    // --- 画面切り替え ---
    const showScreen = (screenId) => {
        screens.forEach(screen => screen.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    };

    // --- イベントリスナー ---
    const backToHome = () => {
        window.open(window.location.pathname, '_blank');
    };

    createAnotherEventBtn.addEventListener('click', backToHome);
    createNewEventFromDetailsBtn.addEventListener('click', backToHome);

    // イベント作成フォームの処理
    createEventForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const eventData = {
            id: Date.now(), // ユニークIDを付与
            title: document.getElementById('event-title').value,
            date: document.getElementById('event-date').value,
            participants: document.getElementById('event-participants').value,
            totalAmount: document.getElementById('event-total-amount').value,
            comment: document.getElementById('event-comment').value,
        };
        const encodedData = btoa(unescape(encodeURIComponent(JSON.stringify(eventData))));
        const url = `${window.location.origin}${window.location.pathname}#${encodedData}`;
        shareUrlInput.value = url;
        showScreen('share-screen');
    });

    // URLコピー処理
    copyUrlBtn.addEventListener('click', () => {
        shareUrlInput.select();
        navigator.clipboard.writeText(shareUrlInput.value).then(() => {
            copyUrlBtn.textContent = 'コピー完了！';
            setTimeout(() => { copyUrlBtn.textContent = 'コピー'; }, 2000);
        });
    });

    // 支払い追加フォームの処理
    addPaymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentEventData) return;
        const newPayment = {
            name: document.getElementById('participant-name').value,
            amount: parseInt(document.getElementById('payment-amount').value, 10),
            method: document.getElementById('payment-method').value,
            comment: document.getElementById('payment-comment').value,
            id: Date.now()
        };
        const storageKey = getStorageKey(currentEventData);
        const payments = getPayments(storageKey);
        payments.push(newPayment);
        saveAndRerender(storageKey, payments);
        addPaymentForm.reset();
    });

    // 支払いリストのクリックイベント（編集・削除）
    paymentsTbody.addEventListener('click', (e) => {
        const target = e.target;
        const paymentId = parseInt(target.closest('tr')?.dataset.id, 10);
        if (!paymentId) return;

        if (target.classList.contains('edit-btn')) {
            openEditModal(paymentId);
        } else if (target.classList.contains('delete-btn')) {
            deletePayment(paymentId);
        }
    });

    // 編集モーダルを閉じる
    closeBtn.addEventListener('click', () => editModal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target == editModal) {
            editModal.style.display = 'none';
        }
    });

    // 編集フォームの保存処理
    editPaymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const paymentId = parseInt(editPaymentId.value, 10);
        const storageKey = getStorageKey(currentEventData);
        let payments = getPayments(storageKey);
        
        payments = payments.map(p => {
            if (p.id === paymentId) {
                return {
                    ...p,
                    name: document.getElementById('edit-participant-name').value,
                    amount: parseInt(document.getElementById('edit-payment-amount').value, 10),
                    method: document.getElementById('edit-payment-method').value,
                    comment: document.getElementById('edit-payment-comment').value,
                };
            }
            return p;
        });

        saveAndRerender(storageKey, payments);
        editModal.style.display = 'none';
    });

    // --- データ処理 & 描画 ---
    const getStorageKey = (eventData) => {
        if (eventData.id) {
            // 新しい形式：IDベースのキー
            return `payments_${eventData.id}`;
        }
        // 古い形式：後方互換性のためのフォールバック
        return `payments_${eventData.title}_${eventData.date}`;
    };
    const getPayments = (key) => JSON.parse(localStorage.getItem(key) || '[]');
    const savePayments = (key, payments) => localStorage.setItem(key, JSON.stringify(payments));

    const saveAndRerender = (storageKey, payments) => {
        savePayments(storageKey, payments);
        renderPayments(payments);
        updateSummary(currentEventData, payments);
    };

    const openEditModal = (paymentId) => {
        const storageKey = getStorageKey(currentEventData);
        const payments = getPayments(storageKey);
        const payment = payments.find(p => p.id === paymentId);
        if (!payment) return;

        editPaymentId.value = payment.id;
        document.getElementById('edit-participant-name').value = payment.name;
        document.getElementById('edit-payment-amount').value = payment.amount;
        document.getElementById('edit-payment-method').value = payment.method;
        document.getElementById('edit-payment-comment').value = payment.comment;
        
        editModal.style.display = 'block';
    };

    const deletePayment = (paymentId) => {
        if (!confirm('この支払いを削除しますか？')) return;
        
        const storageKey = getStorageKey(currentEventData);
        let payments = getPayments(storageKey);
        payments = payments.filter(p => p.id !== paymentId);
        saveAndRerender(storageKey, payments);
    };

    const renderPayments = (payments) => {
        paymentsTbody.innerHTML = '';
        if (payments.length === 0) {
            paymentsTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">まだ支払いがありません</td></tr>';
            return;
        }
        payments.forEach(p => {
            const tr = document.createElement('tr');
            tr.dataset.id = p.id;
            tr.innerHTML = `
                <td>${escapeHTML(p.name)}</td>
                <td>${p.amount.toLocaleString()}円</td>
                <td>${escapeHTML(p.method)}</td>
                <td>${escapeHTML(p.comment)}</td>
                <td>
                    <button class="action-btn edit-btn">編集</button>
                    <button class="action-btn delete-btn">削除</button>
                </td>
            `;
            paymentsTbody.appendChild(tr);
        });
    };

    const updateSummary = (eventData, payments) => {
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = eventData.totalAmount - totalPaid;
        document.getElementById('summary-participants').textContent = `${eventData.participants}人`;
        document.getElementById('summary-total-amount').textContent = `${parseInt(eventData.totalAmount).toLocaleString()}円`;
        document.getElementById('summary-paid-amount').textContent = `${totalPaid.toLocaleString()}円`;
        document.getElementById('summary-remaining-amount').textContent = `${remaining.toLocaleString()}円`;
        const remainingAmountEl = document.getElementById('summary-remaining-amount');
        const remainingRowEl = remainingAmountEl.closest('tr');
        if (remaining <= 0) {
            remainingRowEl.style.color = 'var(--success-color)';
            remainingAmountEl.style.color = 'var(--success-color)';
        } else {
            remainingRowEl.style.color = 'var(--danger-color)';
            remainingAmountEl.style.color = 'var(--danger-color)';
        }
    };
    
    const escapeHTML = (str) => {
        if (!str) return '';
        return str.replace(/[&<>"']/g, match => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[match]);
    };

    // --- 初期化処理 ---
    const init = () => {
        const hash = window.location.hash.substring(1);
        if (hash) {
            try {
                const decodedData = decodeURIComponent(escape(atob(hash)));
                currentEventData = JSON.parse(decodedData);
                document.getElementById('event-title-display').textContent = currentEventData.title;
                document.getElementById('event-date-display').textContent = `開催日: ${currentEventData.date}`;
                
                // イベントコメントの表示
                const commentDisplay = document.getElementById('event-comment-display');
                if (currentEventData.comment) {
                    commentDisplay.textContent = currentEventData.comment;
                    commentDisplay.style.display = 'block';
                } else {
                    commentDisplay.style.display = 'none';
                }

                const storageKey = getStorageKey(currentEventData);
                const payments = getPayments(storageKey);
                renderPayments(payments);
                updateSummary(currentEventData, payments);
                showScreen('event-details-screen');
            } catch (e) {
                console.error("URLデータの解析に失敗しました:", e);
                showScreen('create-event-screen');
            }
        } else {
            showScreen('create-event-screen');
        }
    };

    init();
});