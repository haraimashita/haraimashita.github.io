document.addEventListener('DOMContentLoaded', () => {
    // --- Firebaseの初期化 ---
    const firebaseConfig = {
        apiKey: "AIzaSyB3NwVo4M2l-yRyIcJSjZGRs3tB6exITng",
        authDomain: "haraimashita.firebaseapp.com",
        projectId: "haraimashita",
        storageBucket: "haraimashita.firebasestorage.app",
        messagingSenderId: "913746709279",
        appId: "1:913746709279:web:4a0fcf1677624ace147e2a",
        measurementId: "G-9WQJFCPLDZ"
    };
    const app = firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // --- DOM要素の取得 ---
    const screens = document.querySelectorAll('.screen');
    const createEventForm = document.getElementById('create-event-form');
    const shareUrlInput = document.getElementById('share-url');
    const copyUrlBtn = document.getElementById('copy-url-btn');
    const checkPaymentStatusBtn = document.getElementById('check-payment-status-btn'); // 追加
    const createAnotherEventBtn = document.getElementById('create-another-event-btn');
    const createNewEventFromDetailsBtn = document.getElementById('create-new-event-from-details');
    const addPaymentForm = document.getElementById('add-payment-form');
    const paymentsTbody = document.getElementById('payments-tbody');
    
    // 編集モーダル関連
    const editModal = document.getElementById('edit-modal');
    const editPaymentForm = document.getElementById('edit-payment-form');
    const closeBtn = document.querySelector('.close-btn');
    const editPaymentId = document.getElementById('edit-payment-id');

    let currentEventId = null;
    let currentEventData = null;
    let paymentsUnsubscribe = null; // リアルタイムリスナーの購読を解除するための変数

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

    // イベント作成フォームの処理 (Firebase対応)
    createEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const eventData = {
            title: document.getElementById('event-title').value,
            date: document.getElementById('event-date').value,
            participants: document.getElementById('event-participants').value,
            totalAmount: document.getElementById('event-total-amount').value,
            comment: document.getElementById('event-comment').value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        try {
            const docRef = await db.collection('events').add(eventData);
            const url = `${window.location.origin}${window.location.pathname}#${docRef.id}`;
            shareUrlInput.value = url;
            showScreen('share-screen');
        } catch (error) {
            console.error("イベントの作成に失敗しました:", error);
            alert("エラーが発生しました。イベントを作成できませんでした。");
        }
    });

    // URLコピー処理
    copyUrlBtn.addEventListener('click', () => {
        shareUrlInput.select();
        navigator.clipboard.writeText(shareUrlInput.value).then(() => {
            copyUrlBtn.textContent = 'コピー完了！';
            setTimeout(() => { copyUrlBtn.textContent = 'コピー'; }, 2000);
        });
    });

    // 支払状況確認ボタンの処理
    checkPaymentStatusBtn.addEventListener('click', () => {
        const url = shareUrlInput.value;
        if (url) {
            window.open(url, '_blank');
        }
    });

    // 支払い追加フォームの処理 (Firebase対応)
    addPaymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentEventId) return;
        const newPayment = {
            name: document.getElementById('participant-name').value,
            amount: parseInt(document.getElementById('payment-amount').value, 10),
            method: document.getElementById('payment-method').value,
            comment: document.getElementById('payment-comment').value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        db.collection('events').doc(currentEventId).collection('payments').add(newPayment)
            .then(() => {
                addPaymentForm.reset();
                alert('支払いを記録しました！'); // ポップアップを追加
            })
            .catch(error => {
                console.error("支払いの追加に失敗しました:", error);
                alert("エラーが発生しました。支払いを追加できませんでした。");
            });
    });

    // 支払いリストのクリックイベント（編集・削除）
    paymentsTbody.addEventListener('click', (e) => {
        const target = e.target;
        const paymentId = target.closest('tr')?.dataset.id;
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

    // 編集フォームの保存処理 (Firebase対応)
    editPaymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const paymentId = editPaymentId.value;
        if (!currentEventId || !paymentId) return;

        const updatedPayment = {
            name: document.getElementById('edit-participant-name').value,
            amount: parseInt(document.getElementById('edit-payment-amount').value, 10),
            method: document.getElementById('edit-payment-method').value,
            comment: document.getElementById('edit-payment-comment').value,
        };

        db.collection('events').doc(currentEventId).collection('payments').doc(paymentId).update(updatedPayment)
            .then(() => {
                editModal.style.display = 'none';
            })
            .catch(error => {
                console.error("支払いの更新に失敗しました:", error);
                alert("エラーが発生しました。支払いを更新できませんでした。");
            });
    });

    // --- データ処理 & 描画 (Firebase対応) ---

    const openEditModal = (paymentId) => {
        db.collection('events').doc(currentEventId).collection('payments').doc(paymentId).get()
            .then(doc => {
                if (!doc.exists) return;
                const payment = doc.data();
                
                editPaymentId.value = doc.id;
                document.getElementById('edit-participant-name').value = payment.name;
                document.getElementById('edit-payment-amount').value = payment.amount;
                document.getElementById('edit-payment-method').value = payment.method;
                document.getElementById('edit-payment-comment').value = payment.comment;
                
                editModal.style.display = 'block';
            });
    };

    const deletePayment = (paymentId) => {
        if (!confirm('この支払いを削除しますか？')) return;
        
        db.collection('events').doc(currentEventId).collection('payments').doc(paymentId).delete()
            .catch(error => {
                console.error("支払いの削除に失敗しました:", error);
                alert("エラーが発生しました。支払いを削除できませんでした。");
            });
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

    const renderPaymentMethodTotals = (payments) => {
        const totalsByMethodCard = document.getElementById('totals-by-method-card');
        const totalsTable = document.getElementById('totals-by-method-table');
        
        if (payments.length === 0) {
            totalsByMethodCard.style.display = 'none';
            return;
        }

        const totals = payments.reduce((acc, p) => {
            if (!acc[p.method]) {
                acc[p.method] = 0;
            }
            acc[p.method] += p.amount;
            return acc;
        }, {});

        totalsTable.innerHTML = '';
        for (const method in totals) {
            const row = `
                <tr>
                    <th>${escapeHTML(method)}</th>
                    <td>${totals[method].toLocaleString()}円</td>
                </tr>
            `;
            totalsTable.innerHTML += row;
        }
        
        totalsByMethodCard.style.display = 'block';
    };
    
    const escapeHTML = (str) => {
        if (!str) return '';
        return str.replace(/[&<>"']/g, match => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[match]);
    };

    // --- 初期化処理 (Firebase対応) ---
    const init = () => {
        const eventId = window.location.hash.substring(1);
        if (eventId) {
            currentEventId = eventId;
            
            // イベントデータを取得
            db.collection('events').doc(eventId).get().then(doc => {
                if (doc.exists) {
                    currentEventData = doc.data();
                    document.getElementById('event-title-display').textContent = currentEventData.title;
                    document.getElementById('event-date-display').textContent = `開催日: ${currentEventData.date}`;
                    
                    const commentDisplay = document.getElementById('event-comment-display');
                    if (currentEventData.comment) {
                        commentDisplay.textContent = currentEventData.comment;
                        commentDisplay.style.display = 'block';
                    } else {
                        commentDisplay.style.display = 'none';
                    }

                    // 支払い情報をリアルタイムで購読
                    if (paymentsUnsubscribe) paymentsUnsubscribe(); // 既存のリスナーを解除
                    paymentsUnsubscribe = db.collection('events').doc(eventId).collection('payments')
                        .orderBy('createdAt', 'desc')
                        .onSnapshot(snapshot => {
                            const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                            renderPayments(payments);
                            updateSummary(currentEventData, payments);
                            renderPaymentMethodTotals(payments);
                        }, error => {
                            console.error("支払い情報の取得に失敗しました:", error);
                        });

                    showScreen('event-details-screen');
                } else {
                    console.error("指定されたイベントが見つかりません。");
                    alert("エラー: 指定されたイベントが見つかりません。");
                    showScreen('create-event-screen');
                }
            }).catch(error => {
                console.error("イベントデータの取得に失敗しました:", error);
                showScreen('create-event-screen');
            });
        } else {
            showScreen('create-event-screen');
        }
    };

    init();
});
