// ==================== КОНФИГУРАЦИЯ ====================
const CONFIG = {
    API_KEY: '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',
    API_URL: 'https://api.openai.com/v1/chat/completions',
    MODEL: 'gpt-3.5-turbo',
    MAX_TOKENS: 2000,
    TEMPERATURE: 0.7
};

// ==================== СОСТОЯНИЕ ====================
const state = {
    messages: [],
    isTyping: false,
    apiWorking: false
};

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
function init() {
    console.log('🚀 ABS AI запущен');
    setupEventListeners();
    loadHistory();
    testAPI();
}

// ==================== ОБРАБОТЧИКИ ====================
function setupEventListeners() {
    const sendBtn = document.getElementById('sendBtn');
    const input = document.getElementById('messageInput');
    const newChatBtn = document.getElementById('newChatBtn');
    
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (newChatBtn) newChatBtn.addEventListener('click', createNewChat);
    
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        input.addEventListener('input', autoResizeTextarea);
    }
    
    // Быстрые кнопки
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const text = e.currentTarget.dataset.text;
            if (input) {
                input.value = text;
                input.focus();
                autoResizeTextarea();
            }
        });
    });
}

// ==================== ОТПРАВКА СООБЩЕНИЙ ====================
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input?.value.trim();
    
    if (!text) {
        showToast('Введите сообщение', 'warning');
        return;
    }
    
    if (!state.apiWorking) {
        showToast('API не подключен', 'error');
        return;
    }
    
    // Скрыть приветствие
    const welcome = document.getElementById('welcome');
    if (welcome) welcome.style.display = 'none';
    
    // Добавить сообщение
    addMessage(text, 'user');
    
    // Очистить поле
    if (input) {
        input.value = '';
        autoResizeTextarea();
    }
    
    // Показать индикатор
    showTyping(true);
    
    try {
        // Отправить в OpenAI
        const response = await callOpenAI(text);
        
        // Добавить ответ
        addMessage(response, 'bot');
        
        // Сохранить историю
        saveHistory();
        
        showToast('Ответ получен', 'success');
        
    } catch (error) {
        console.error('Ошибка:', error);
        
        let errorMsg = 'Ошибка соединения';
        if (error.message.includes('401')) errorMsg = 'Неверный API ключ';
        if (error.message.includes('429')) errorMsg = 'Слишком много запросов';
        if (error.message.includes('quota')) errorMsg = 'Лимит исчерпан';
        
        addMessage(`Ошибка: ${errorMsg}`, 'bot');
        showToast(errorMsg, 'error');
        
    } finally {
        showTyping(false);
    }
}

// ==================== ВЫЗОВ OPENAI API ====================
async function callOpenAI(userMessage) {
    const messages = [
        {
            role: 'system',
            content: 'Ты ABS AI, полезный ассистент. Отвечай на русском языке кратко и по делу.'
        }
    ];
    
    // Добавить историю
    const history = state.messages.slice(-4);
    history.forEach(msg => {
        messages.push({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.text
        });
    });
    
    // Добавить текущее сообщение
    messages.push({
        role: 'user',
        content: userMessage
    });
    
    // Отправить запрос
    const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${CONFIG.API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: CONFIG.MODEL,
            messages: messages,
            max_tokens: CONFIG.MAX_TOKENS,
            temperature: CONFIG.TEMPERATURE
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

// ==================== РАБОТА С СООБЩЕНИЯМИ ====================
function addMessage(text, type) {
    const message = {
        text: text,
        type: type,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    state.messages.push(message);
    renderMessage(message);
    scrollToBottom();
}

function renderMessage(message) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.type}`;
    
    const avatar = message.type === 'user' ? 'U' : 'ABS';
    const avatarBg = message.type === 'user' ? '#ff6b00' : 'rgba(255, 107, 0, 0.1)';
    
    // Форматировать текст
    const formattedText = formatText(message.text);
    
    messageDiv.innerHTML = `
        <div class="message-avatar" style="background: ${avatarBg}">${avatar}</div>
        <div class="message-content">
            <div class="message-text">${formattedText}</div>
            <div class="message-time">${message.time}</div>
        </div>
    `;
    
    messagesDiv.appendChild(messageDiv);
}

function formatText(text) {
    let safeText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    
    safeText = safeText
        .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
    
    return safeText;
}

// ==================== ИСТОРИЯ ====================
function loadHistory() {
    try {
        const saved = localStorage.getItem('abs_messages');
        if (saved) {
            state.messages = JSON.parse(saved);
            renderAllMessages();
        }
    } catch (e) {
        console.log('Нет истории');
    }
}

function saveHistory() {
    try {
        localStorage.setItem('abs_messages', JSON.stringify(state.messages));
    } catch (e) {
        console.log('Не сохранилось');
    }
}

function renderAllMessages() {
    const messagesDiv = document.getElementById('messages');
    const welcomeDiv = document.getElementById('welcome');
    
    if (!messagesDiv) return;
    
    messagesDiv.innerHTML = '';
    
    if (state.messages.length === 0) {
        if (welcomeDiv) welcomeDiv.style.display = 'flex';
        return;
    }
    
    if (welcomeDiv) welcomeDiv.style.display = 'none';
    state.messages.forEach(msg => renderMessage(msg));
    scrollToBottom();
}

function createNewChat() {
    if (state.messages.length > 0) {
        if (!confirm('Создать новый чат?')) return;
    }
    
    state.messages = [];
    saveHistory();
    renderAllMessages();
    showToast('Новый чат создан', 'success');
}

// ==================== UI УТИЛИТЫ ====================
function autoResizeTextarea() {
    const ta = document.getElementById('messageInput');
    if (ta) {
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }
}

function showTyping(show) {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.classList.toggle('show', show);
        if (show) scrollToBottom();
    }
}

function scrollToBottom() {
    setTimeout(() => {
        const chatMain = document.querySelector('.chat-main');
        if (chatMain) {
            chatMain.scrollTop = chatMain.scrollHeight;
        }
    }, 100);
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const colors = {
        success: '#ff6b00',
        error: '#ff3b30',
        warning: '#ff9500'
    };
    
    toast.textContent = message;
    toast.style.background = colors[type] || '#ff6b00';
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==================== ТЕСТ API ====================
async function testAPI() {
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${CONFIG.API_KEY}`
            }
        });
        
        if (response.ok) {
            state.apiWorking = true;
            console.log('✅ API работает');
            showToast('✅ API подключен', 'success');
        } else {
            const error = await response.json();
            console.error('❌ API ошибка:', error);
            showToast('❌ Проблема с API', 'error');
        }
    } catch (error) {
        console.error('❌ Ошибка сети:', error);
        showToast('❌ Нет интернета', 'error');
    }
}

// ==================== ЗАПУСК ====================
document.addEventListener('DOMContentLoaded', init);

// ==================== ОТЛАДКА ====================
window.ABS_AI = {
    sendMessage: sendMessage,
    clearChat: createNewChat,
    testAPI: testAPI,
    getState: () => state
};
