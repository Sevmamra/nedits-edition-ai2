document.addEventListener('DOMContentLoaded', () => {

    // CONFIGURATION & API DETAILS
    const API_KEY = "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";
    const MODEL_NAME = "llama3-8b-8192";
    const API_URL = "https://api.groq.com/openai/v1/chat/completions";
    let SYSTEM_PROMPT = '';
    
    // DOM ELEMENT REFERENCES
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('menu-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatHistoryEl = document.getElementById('chat-history');
    const messageListEl = document.getElementById('message-list');
    const emptyStateEl = document.getElementById('empty-state');
    const promptSuggestionsEl = document.getElementById('prompt-suggestions');
    const inputEl = document.getElementById('input');
    const sendBtn = document.getElementById('sendBtn');
    const mobileOverlay = document.getElementById('mobile-overlay');
    const chatSearchEl = document.getElementById('chat-search');
    const instructionsBtn = document.getElementById('instructions-btn');
    const instructionsModal = document.getElementById('instructions-modal');
    const closeInstructions = document.getElementById('close-instructions');
    const cancelInstructions = document.getElementById('cancel-instructions');
    const saveInstructions = document.getElementById('save-instructions');
    const instructionsText = document.getElementById('instructions-text');
    const exportBtn = document.getElementById('export-btn');
    const exportModal = document.getElementById('export-modal');
    const closeExport = document.getElementById('close-export');
    const exportOptions = document.querySelectorAll('.export-option');
    const voiceInputBtn = document.getElementById('voice-input-btn');
    const stopContainer = document.getElementById('stop-container');
    const stopBtn = document.getElementById('stop-btn');
    const attachBtn = document.getElementById('attach-btn');
    const shareBtn = document.getElementById('share-btn');
    const shareModal = document.getElementById('share-modal');
    const closeShare = document.getElementById('close-share');
    const cancelShare = document.getElementById('cancel-share');
    const generateLink = document.getElementById('generate-link');
    const copyLink = document.getElementById('copy-link');
    const shareLink = document.getElementById('share-link');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    const cancelSettings = document.getElementById('cancel-settings');
    const saveSettings = document.getElementById('save-settings');
    const audioResponseBtn = document.getElementById('audio-response-btn');
    const audioPlayer = document.getElementById('audio-player');
    const responseAudio = document.getElementById('response-audio');
    const closeAudio = document.getElementById('close-audio');
    const chatFilters = document.getElementById('chat-filters');
    const currentChatTitle = document.getElementById('current-chat-title');
    const messageCount = document.getElementById('message-count');
    const storageStatus = document.getElementById('storage-status');
    const storageProgress = document.querySelector('.storage-progress');
    const storageText = document.querySelector('.storage-text');
    const clearDataBtn = document.getElementById('clear-data-btn');
    const themeSelect = document.getElementById('theme-select');
    const colorOptions = document.querySelectorAll('.color-option');

    // STATE MANAGEMENT
    let chats = {};
    let activeChatId = null;
    let isListening = false;
    let recognition = null;
    let abortController = null;
    let CUSTOM_INSTRUCTIONS = '';
    let APP_SETTINGS = {
        enterToSend: true,
        autoScroll: true,
        messageTimestamps: false,
        chatBackup: false,
        usageAnalytics: true,
        theme: 'auto'
    };
    let currentAudio = null;

    // FUNCTIONS
    async function loadConfig() {
        try {
            const response = await fetch('prompt.json');
            if (!response.ok) throw new Error('Could not load prompt.json');
            const data = await response.json();
            SYSTEM_PROMPT = data.system_prompt;
            renderPromptSuggestions(data.suggestions || data.examples);
        } catch (error) {
            console.error('Failed to load configuration:', error);
            renderPromptSuggestions([
                { text: "Explain all services of Nedits Edition", prompt: "Explain all services of Nedits Edition in detail." },
                { text: "Help me with video editing", prompt: "I need help with video editing for my YouTube channel." },
                { text: "I want to build a website", prompt: "I want to build a website for my business. Can you help?" }
            ]);
        }
    }

    function renderPromptSuggestions(suggestions) {
        promptSuggestionsEl.innerHTML = '';
        suggestions.forEach(s => {
            const card = document.createElement('div');
            card.className = 'suggestion-card';
            card.innerHTML = `
                <div class="suggestion-icon">💡</div>
                <div class="suggestion-text">${s.text}</div>
            `;
            card.dataset.prompt = s.prompt || s.text;
            promptSuggestionsEl.appendChild(card);
        });
    }

    function saveState() {
        try {
            localStorage.setItem('nedits_ai_chats', JSON.stringify(chats));
            localStorage.setItem('nedits_ai_active_chat', activeChatId);
            if (CUSTOM_INSTRUCTIONS) {
                localStorage.setItem('nedits_ai_instructions', CUSTOM_INSTRUCTIONS);
            }
            localStorage.setItem('nedits_ai_settings', JSON.stringify(APP_SETTINGS));
            updateStorageStatus();
        } catch (e) {
            console.error('Error saving to localStorage:', e);
            if (e.name === 'QuotaExceededError') {
                alert('Storage is full. Some older chats will be cleared.');
                clearOldChats();
            }
        }
    }

    function updateStorageStatus() {
        const used = JSON.stringify(localStorage).length;
        const max = 5 * 1024 * 1024; // 5MB approx for most browsers
        const percentage = Math.min(100, Math.round((used / max) * 100));
        
        storageProgress.style.width = `${percentage}%`;
        storageText.textContent = `Storage: ${percentage}% used`;
        
        if (percentage > 90) {
            storageProgress.style.background = 'var(--danger)';
        } else if (percentage > 70) {
            storageProgress.style.background = 'var(--warning)';
        } else {
            storageProgress.style.background = 'var(--accent)';
        }
    }

    function clearOldChats() {
        const chatIds = Object.keys(chats).sort((a, b) => a - b);
        const chatsToRemove = Math.max(1, Math.floor(chatIds.length * 0.2)); // Remove 20% oldest
        
        for (let i = 0; i < chatsToRemove; i++) {
            delete chats[chatIds[i]];
        }
        
        saveState();
        renderSidebar();
    }

    function loadState() {
        try {
            const savedChats = JSON.parse(localStorage.getItem('nedits_ai_chats'));
            const savedActiveId = localStorage.getItem('nedits_ai_active_chat');
            const savedInstructions = localStorage.getItem('nedits_ai_instructions');
            const savedSettings = JSON.parse(localStorage.getItem('nedits_ai_settings'));
            
            if (savedChats) chats = savedChats;
            if (savedInstructions) CUSTOM_INSTRUCTIONS = savedInstructions;
            if (savedSettings) APP_SETTINGS = {...APP_SETTINGS, ...savedSettings};
            
            instructionsText.value = CUSTOM_INSTRUCTIONS;
            applySettings();

            if (savedActiveId && chats[savedActiveId]) {
                activeChatId = savedActiveId;
            } else if (Object.keys(chats).length > 0) {
                activeChatId = Object.keys(chats).sort((a, b) => b - a)[0];
            } else {
                startNewChat();
            }
        } catch (e) {
            console.error('Error loading from localStorage:', e);
            startNewChat();
        }
    }

    function applySettings() {
        // Theme settings
        if (APP_SETTINGS.theme === 'auto') {
            if (window.matchMedia('(prefers-color-scheme: light)').matches) {
                document.documentElement.dataset.theme = 'light';
                themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
            } else {
                document.documentElement.removeAttribute('data-theme');
                themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
            }
        } else {
            document.documentElement.dataset.theme = APP_SETTINGS.theme;
            themeToggle.innerHTML = APP_SETTINGS.theme === 'light' ? 
                '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        }
        
        themeSelect.value = APP_SETTINGS.theme;
        
        // Apply other settings to UI elements
        document.getElementById('enter-to-send').checked = APP_SETTINGS.enterToSend;
        document.getElementById('auto-scroll').checked = APP_SETTINGS.autoScroll;
        document.getElementById('message-timestamps').checked = APP_SETTINGS.messageTimestamps;
        document.getElementById('chat-backup').checked = APP_SETTINGS.chatBackup;
        document.getElementById('usage-analytics').checked = APP_SETTINGS.usageAnalytics;
        
        // Re-render to apply timestamp setting
        renderActiveChat();
    }

    function renderSidebar() {
        chatHistoryEl.innerHTML = '';
        const sortedChatIds = Object.keys(chats).sort((a, b) => b - a);
        const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';

        sortedChatIds.forEach(chatId => {
            const chat = chats[chatId];
            
            // Apply filters
            if (activeFilter !== 'all' && chat.tag !== activeFilter) {
                return;
            }

            const chatItem = document.createElement('div');
            chatItem.className = 'chat-history-item';
            chatItem.dataset.chatId = chatId;

            const title = document.createElement('span');
            title.className = 'chat-title';
            title.textContent = chat.title;

            const timestamp = document.createElement('div');
            timestamp.className = 'chat-timestamp';
            timestamp.textContent = formatTimestamp(chat.createdAt || parseInt(chatId));

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-chat-btn';
            deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
            deleteBtn.dataset.chatId = chatId;

            const contentWrapper = document.createElement('div');
            contentWrapper.style.flexGrow = '1';
            contentWrapper.style.overflow = 'hidden';
            contentWrapper.appendChild(title);
            contentWrapper.appendChild(timestamp);

            chatItem.appendChild(contentWrapper);
            chatItem.appendChild(deleteBtn);

            if (chatId === activeChatId) {
                chatItem.classList.add('active');
            }
            chatHistoryEl.appendChild(chatItem);
        });

        applySearchFilter();
        updateStorageStatus();
    }

    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            return 'Today';
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return `${days} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    function applySearchFilter() {
        const searchTerm = chatSearchEl.value.toLowerCase();
        const chatItems = chatHistoryEl.querySelectorAll('.chat-history-item');
        
        chatItems.forEach(item => {
            const title = item.querySelector('.chat-title').textContent.toLowerCase();
            if (searchTerm === '' || title.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    function renderActiveChat() {
        messageListEl.innerHTML = '';
        const chatContainer = messageListEl.parentElement;
        
        if (activeChatId && chats[activeChatId] && chats[activeChatId].messages.length > 0) {
            emptyStateEl.style.display = 'none';
            chats[activeChatId].messages.forEach(msg => addBubble(msg.role, msg.content, msg.timestamp));
            
            // Update header info
            currentChatTitle.textContent = chats[activeChatId].title;
            messageCount.textContent = `${chats[activeChatId].messages.length} messages`;
        } else {
            emptyStateEl.style.display = 'flex';
            currentChatTitle.textContent = 'New Conversation';
            messageCount.textContent = '0 messages';
        }
        
        if (APP_SETTINGS.autoScroll) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }

    function addBubble(role, content, timestamp = Date.now()) {
        const bubble = document.createElement('div');
        bubble.className = `bubble ${role}`;
        
        const avatar = document.createElement('div');
        avatar.className = `avatar ${role}`;
        avatar.textContent = role === 'user' ? 'You' : 'AI';

        const msg = document.createElement('div');
        msg.className = 'msg';
        
        // Parse markdown and add copy buttons to code blocks
        msg.innerHTML = marked.parse(content);
        
        // Add timestamp if enabled
        if (APP_SETTINGS.messageTimestamps) {
            const timeElement = document.createElement('span');
            timeElement.className = 'msg-time';
            timeElement.textContent = new Date(timestamp).toLocaleTimeString();
            msg.appendChild(timeElement);
        }
        
        // Add message actions
        const actions = document.createElement('div');
        actions.className = 'msg-actions';
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'msg-action-btn';
        copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
        copyBtn.title = 'Copy message';
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(content)
                .then(() => {
                    copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
                    }, 2000);
                });
        });
        
        actions.appendChild(copyBtn);
        
        if (role === 'ai') {
            const audioBtn = document.createElement('button');
            audioBtn.className = 'msg-action-btn';
            audioBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
            audioBtn.title = 'Read aloud';
            audioBtn.addEventListener('click', () => speakText(content));
            actions.appendChild(audioBtn);
        }
        
        msg.appendChild(actions);

        // Add copy buttons to code blocks
        msg.querySelectorAll('pre').forEach((preElement) => {
            const codeBlock = preElement.querySelector('code');
            if (codeBlock) {
                const copyButton = document.createElement('button');
                copyButton.className = 'code-copy-btn';
                copyButton.innerHTML = '<i class="fa-solid fa-copy"></i>';
                copyButton.title = 'Copy code';
                copyButton.addEventListener('click', () => {
                    navigator.clipboard.writeText(codeBlock.textContent)
                        .then(() => {
                            copyButton.innerHTML = '<i class="fa-solid fa-check"></i>';
                            setTimeout(() => {
                                copyButton.innerHTML = '<i class="fa-solid fa-copy"></i>';
                            }, 2000);
                        });
                });
                preElement.appendChild(copyButton);
                
                if (typeof hljs !== 'undefined') {
                    hljs.highlightElement(codeBlock);
                }
            }
        });

        bubble.appendChild(avatar);
        bubble.appendChild(msg);
        messageListEl.appendChild(bubble);
        
        if (APP_SETTINGS.autoScroll) {
            messageListEl.parentElement.scrollTop = messageListEl.parentElement.scrollHeight;
        }

        return msg;
    }

    function startNewChat() {
        const newChatId = Date.now().toString();
        chats[newChatId] = {
            title: 'New Conversation',
            messages: [],
            createdAt: Date.now(),
            tag: 'business'
        };
        activeChatId = newChatId;
        renderActiveChat();
        renderSidebar();
        saveState();
        if (window.innerWidth <= 768) {
            toggleSidebar();
        }
    }
    
    function switchChat(chatId) {
        activeChatId = chatId;
        renderActiveChat();
        renderSidebar();
        saveState();
        if (window.innerWidth <= 768) {
            toggleSidebar();
        }
    }

    function deleteChat(chatIdToDelete) {
        if (confirm('Are you sure you want to delete this chat history?')) {
            delete chats[chatIdToDelete];
            
            if (activeChatId === chatIdToDelete) {
                const remainingChats = Object.keys(chats).sort((a,b) => b-a);
                if(remainingChats.length > 0) {
                    switchChat(remainingChats[0]);
                } else {
                    startNewChat();
                }
            }
            saveState();
            renderSidebar();
        }
    }

    function showStopButton() {
        stopContainer.style.display = 'flex';
    }

    function hideStopButton() {
        stopContainer.style.display = 'none';
    }

    async function sendMessage(userInput) {
        if (!userInput || !activeChatId) return;

        inputEl.value = '';
        inputEl.style.height = 'auto';
        sendBtn.disabled = true;
        hideStopButton();

        emptyStateEl.style.display = 'none';

        addBubble('user', userInput);
        chats[activeChatId].messages.push({ 
            role: 'user', 
            content: userInput,
            timestamp: Date.now()
        });

        if (chats[activeChatId].messages.length === 1) {
            chats[activeChatId].title = userInput.substring(0, 30) + (userInput.length > 30 ? '...' : '');
            renderSidebar();
        }

        const aiMsgElement = addBubble('ai', '<span class="typing"></span>');
        let fullResponse = '';

        try {
            // Prepare messages for API
            const historyForAPI = chats[activeChatId].messages.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            }));
            
            // Add system prompt and custom instructions
            let finalSystemPrompt = SYSTEM_PROMPT;
            if (CUSTOM_INSTRUCTIONS) {
                finalSystemPrompt += `\n\nADDITIONAL USER INSTRUCTIONS:\n${CUSTOM_INSTRUCTIONS}`;
            }
            
            historyForAPI.unshift({
                role: 'system',
                content: finalSystemPrompt
            });

            // Create abort controller for stopping generation
            abortController = new AbortController();
            showStopButton();

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    messages: historyForAPI,
                    stream: false
                }),
                signal: abortController.signal
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            fullResponse = data.choices[0].message.content;

            aiMsgElement.innerHTML = marked.parse(fullResponse);
            
            // Add timestamp if enabled
            if (APP_SETTINGS.messageTimestamps) {
                const timeElement = document.createElement('span');
                timeElement.className = 'msg-time';
                timeElement.textContent = new Date().toLocaleTimeString();
                aiMsgElement.appendChild(timeElement);
            }
            
            // Add message actions
            const actions = document.createElement('div');
            actions.className = 'msg-actions';
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'msg-action-btn';
            copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(fullResponse)
                    .then(() => {
                        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                        setTimeout(() => {
                            copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
                        }, 2000);
                    });
            });
            
            const audioBtn = document.createElement('button');
            audioBtn.className = 'msg-action-btn';
            audioBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
            audioBtn.addEventListener('click', () => speakText(fullResponse));
            
            actions.appendChild(copyBtn);
            actions.appendChild(audioBtn);
            aiMsgElement.appendChild(actions);
            
            // Add copy buttons to code blocks in the response
            aiMsgElement.querySelectorAll('pre').forEach((preElement) => {
                const codeBlock = preElement.querySelector('code');
                if (codeBlock) {
                    const copyButton = document.createElement('button');
                    copyButton.className = 'code-copy-btn';
                    copyButton.innerHTML = '<i class="fa-solid fa-copy"></i>';
                    copyButton.title = 'Copy code';
                    copyButton.addEventListener('click', () => {
                        navigator.clipboard.writeText(codeBlock.textContent)
                            .then(() => {
                                copyButton.innerHTML = '<i class="fa-solid fa-check"></i>';
                                setTimeout(() => {
                                    copyButton.innerHTML = '<i class="fa-solid fa-copy"></i>';
                                }, 2000);
                            });
                    });
                    preElement.appendChild(copyButton);
                    
                    if (typeof hljs !== 'undefined') {
                        hljs.highlightElement(codeBlock);
                    }
                }
            });
            
            chats[activeChatId].messages.push({ 
                role: 'ai', 
                content: fullResponse,
                timestamp: Date.now()
            });

        } catch (error) {
            if (error.name === 'AbortError') {
                aiMsgElement.innerHTML = '<em>Response stopped by user.</em>';
            } else {
                console.error('Error during API call:', error);
                aiMsgElement.innerHTML = `Oops! I couldn't process your request right now. Error: ${error.message}. Please try again or contact us at <a href="mailto:neditsedition@gmail.com">neditsedition@gmail.com</a>.`;
            }
        } finally {
            sendBtn.disabled = false;
            hideStopButton();
            abortController = null;
            saveState();
            const typingSpan = aiMsgElement.querySelector('.typing');
            if(typingSpan) typingSpan.remove();
        }
    }

    function stopGeneration() {
        if (abortController) {
            abortController.abort();
            hideStopButton();
        }
    }

    function toggleSidebar() {
        sidebar.classList.toggle('open');
        mobileOverlay.classList.toggle('active');
    }

    function toggleModal(modal) {
        modal.classList.toggle('active');
    }

    function initVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                isListening = true;
                voiceInputBtn.classList.add('listening');
                voiceInputBtn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>';
                voiceInputBtn.title = 'Stop listening';
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                inputEl.value = transcript;
                inputEl.style.height = 'auto';
                inputEl.style.height = `${inputEl.scrollHeight}px`;
            };

            recognition.onend = () => {
                isListening = false;
                voiceInputBtn.classList.remove('listening');
                voiceInputBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
                voiceInputBtn.title = 'Voice Input';
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                isListening = false;
                voiceInputBtn.classList.remove('listening');
                voiceInputBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
                voiceInputBtn.title = 'Voice Input';
                
                if (event.error === 'not-allowed') {
                    alert('Microphone access is blocked. Please allow microphone access in your browser settings.');
                }
            };
        } else {
            voiceInputBtn.style.display = 'none';
        }
    }

    function toggleVoiceInput() {
        if (!recognition) return;

        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    }

    function speakText(text) {
        // Stop any currently playing audio
        if (currentAudio) {
            currentAudio.pause();
        }
        
        if ('speechSynthesis' in window) {
            // Show audio player
            audioPlayer.style.display = 'flex';
            
            // Create speech
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            utterance.pitch = 1;
            
            // Play audio
            speechSynthesis.speak(utterance);
            currentAudio = utterance;
            
            // Handle when audio ends
            utterance.onend = () => {
                audioPlayer.style.display = 'none';
                currentAudio = null;
            };
        } else {
            alert('Text-to-speech is not supported in your browser.');
        }
    }

    function exportChat(format) {
        if (!activeChatId || !chats[activeChatId]) return;

        const chat = chats[activeChatId];
        let content, filename, mimeType;

        const timestamp = new Date().toISOString().slice(0, 10);
        filename = `nedits-ai-chat-${chat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${timestamp}`;

        switch(format) {
            case 'text':
                content = `Nedits AI Conversation - ${chat.title}\n\n`;
                chat.messages.forEach(msg => {
                    const role = msg.role === 'user' ? 'You' : 'Nedits AI';
                    content += `${role}: ${msg.content}\n\n`;
                });
                mimeType = 'text/plain';
                filename += '.txt';
                break;

            case 'pdf':
                content = document.getElementById('message-list').innerHTML;
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                doc.setFontSize(16);
                doc.text(`Nedits AI Conversation - ${chat.title}`, 10, 10);
                doc.setFontSize(10);
                
                // Simple text version for PDF
                let pdfContent = '';
                chat.messages.forEach(msg => {
                    const role = msg.role === 'user' ? 'You' : 'Nedits AI';
                    pdfContent += `${role}: ${msg.content}\n\n`;
                });
                
                const splitContent = doc.splitTextToSize(pdfContent, 180);
                doc.text(splitContent, 10, 20);
                
                doc.save(filename + '.pdf');
                return;

            case 'image':
                html2canvas(messageListEl).then(canvas => {
                    const imgData = canvas.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.href = imgData;
                    link.download = filename + '.png';
                    link.click();
                });
                return;

            case 'html':
                content = `<!DOCTYPE html>
<html>
<head>
    <title>Nedits AI Conversation - ${chat.title}</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .message { margin-bottom: 20px; padding: 15px; border-radius: 8px; }
        .user { background: #f0f0f0; text-align: right; }
        .ai { background: #e0e0e0; }
        .timestamp { font-size: 12px; color: #666; margin-top: 5px; }
    </style>
</head>
<body>
    <h1>Nedits AI Conversation</h1>
    <h2>${chat.title}</h2>
    <div class="chat">`;
                
                chat.messages.forEach(msg => {
                    content += `
        <div class="message ${msg.role}">
            <div class="content">${msg.content.replace(/\n/g, '<br>')}</div>
            <div class="timestamp">${new Date(msg.timestamp).toLocaleString()}</div>
        </div>`;
                });
                
                content += `
    </div>
</body>
</html>`;
                mimeType = 'text/html';
                filename += '.html';
                break;

            case 'markdown':
                const turndownService = new Turndown();
                content = `# Nedits AI Conversation\n## ${chat.title}\n\n`;
                
                chat.messages.forEach(msg => {
                    const role = msg.role === 'user' ? '**You**' : '**Nedits AI**';
                    content += `${role}: ${turndownService.turndown(msg.content)}\n\n`;
                });
                
                mimeType = 'text/markdown';
                filename += '.md';
                break;
        }

        // For text-based exports
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toggleModal(exportModal);
    }

    function generateShareLink() {
        if (!activeChatId || !chats[activeChatId]) return;
        
        // In a real app, you would send this to a server and get a shareable link
        // For this demo, we'll create a data URL (not practical for large chats)
        const chatData = JSON.stringify({
            chat: chats[activeChatId],
            timestamp: Date.now(),
            readOnly: document.getElementById('read-only-toggle').checked
        });
        
        const base64Data = btoa(unescape(encodeURIComponent(chatData)));
        shareLink.value = `${window.location.origin}${window.location.pathname}?shared=${base64Data}`;
        
        copyLink.disabled = false;
    }

    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(() => console.log('Service Worker registered'))
                .catch(err => console.log('Service Worker registration failed: ', err));
        }
    }

    function loadSharedChat() {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedData = urlParams.get('shared');
        
        if (sharedData) {
            try {
                const chatData = JSON.parse(decodeURIComponent(escape(atob(sharedData))));
                const newChatId = `shared_${Date.now()}`;
                
                chats[newChatId] = chatData.chat;
                activeChatId = newChatId;
                
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
                
                renderActiveChat();
                renderSidebar();
                saveState();
                
                alert('Shared conversation loaded successfully!');
            } catch (e) {
                console.error('Error loading shared chat:', e);
                alert('Invalid shared conversation link.');
            }
        }
    }

    // EVENT LISTENERS
    sendBtn.addEventListener('click', () => sendMessage(inputEl.value.trim()));
    
    inputEl.addEventListener('keydown', (e) => {
        if (APP_SETTINGS.enterToSend) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(inputEl.value.trim());
            }
        } else {
            if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                sendMessage(inputEl.value.trim());
            }
        }
    });

    inputEl.addEventListener('input', () => {
        inputEl.style.height = 'auto';
        inputEl.style.height = `${inputEl.scrollHeight}px`;
    });

    newChatBtn.addEventListener('click', startNewChat);

    chatHistoryEl.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.delete-chat-btn');
        if (deleteButton) {
            e.stopPropagation();
            const chatId = deleteButton.dataset.chatId;
            deleteChat(chatId);
            return;
        }

        const chatItem = e.target.closest('.chat-history-item');
        if (chatItem) {
            const chatId = chatItem.dataset.chatId;
            switchChat(chatId);
        }
    });

    chatFilters.addEventListener('click', (e) => {
        const filterBtn = e.target.closest('.filter-btn');
        if (filterBtn) {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            filterBtn.classList.add('active');
            renderSidebar();
        }
    });

    promptSuggestionsEl.addEventListener('click', (e) => {
        const card = e.target.closest('.suggestion-card');
        if (card) {
            sendMessage(card.dataset.prompt);
        }
    });

    chatSearchEl.addEventListener('input', debounce(applySearchFilter, 300));

    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.dataset.theme !== 'light';
        if (isDark) {
            document.documentElement.dataset.theme = 'light';
            themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
            APP_SETTINGS.theme = 'light';
        } else {
            document.documentElement.removeAttribute('data-theme');
            themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
            APP_SETTINGS.theme = 'dark';
        }
        saveState();
    });

    themeSelect.addEventListener('change', (e) => {
        APP_SETTINGS.theme = e.target.value;
        applySettings();
    });

    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            const color = option.dataset.color;
            document.documentElement.style.setProperty('--accent', color);
            document.documentElement.style.setProperty('--accent-hover', adjustColor(color, -20));
            
            colorOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
        });
    });

    function adjustColor(color, amount) {
        return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
    }

    instructionsBtn.addEventListener('click', () => toggleModal(instructionsModal));
    closeInstructions.addEventListener('click', () => toggleModal(instructionsModal));
    cancelInstructions.addEventListener('click', () => toggleModal(instructionsModal));
    saveInstructions.addEventListener('click', () => {
        CUSTOM_INSTRUCTIONS = instructionsText.value.trim();
        saveState();
        toggleModal(instructionsModal);
    });

    exportBtn.addEventListener('click', () => toggleModal(exportModal));
    closeExport.addEventListener('click', () => toggleModal(exportModal));
    exportOptions.forEach(option => {
        option.addEventListener('click', () => {
            exportChat(option.dataset.format);
        });
    });

    shareBtn.addEventListener('click', () => {
        shareLink.value = '';
        copyLink.disabled = true;
        toggleModal(shareModal);
    });
    closeShare.addEventListener('click', () => toggleModal(shareModal));
    cancelShare.addEventListener('click', () => toggleModal(shareModal));
    generateLink.addEventListener('click', generateShareLink);
    copyLink.addEventListener('click', () => {
        shareLink.select();
        document.execCommand('copy');
        copyLink.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        setTimeout(() => {
            copyLink.innerHTML = 'Copy';
        }, 2000);
    });

    settingsBtn.addEventListener('click', () => toggleModal(settingsModal));
    closeSettings.addEventListener('click', () => toggleModal(settingsModal));
    cancelSettings.addEventListener('click', () => toggleModal(settingsModal));
    saveSettings.addEventListener('click', () => {
        APP_SETTINGS.enterToSend = document.getElementById('enter-to-send').checked;
        APP_SETTINGS.autoScroll = document.getElementById('auto-scroll').checked;
        APP_SETTINGS.messageTimestamps = document.getElementById('message-timestamps').checked;
        APP_SETTINGS.chatBackup = document.getElementById('chat-backup').checked;
        APP_SETTINGS.usageAnalytics = document.getElementById('usage-analytics').checked;
        
        applySettings();
        saveState();
        toggleModal(settingsModal);
    });

    clearDataBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all chat data? This cannot be undone.')) {
            localStorage.clear();
            chats = {};
            startNewChat();
            alert('All chat data has been cleared.');
        }
    });

    voiceInputBtn.addEventListener('click', toggleVoiceInput);
    
    audioResponseBtn.addEventListener('click', () => {
        if (currentAudio) {
            // Stop audio if playing
            speechSynthesis.cancel();
            audioPlayer.style.display = 'none';
            currentAudio = null;
        } else if (activeChatId && chats[activeChatId].messages.length > 0) {
            // Read the last AI response
            const aiMessages = chats[activeChatId].messages.filter(msg => msg.role === 'ai');
            if (aiMessages.length > 0) {
                speakText(aiMessages[aiMessages.length - 1].content);
            }
        }
    });
    
    closeAudio.addEventListener('click', () => {
        speechSynthesis.cancel();
        audioPlayer.style.display = 'none';
        currentAudio = null;
    });
    
    stopBtn.addEventListener('click', stopGeneration);

    menuBtn.addEventListener('click', toggleSidebar);
    mobileOverlay.addEventListener('click', toggleSidebar);

    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (instructionsModal.classList.contains('active') && e.target === instructionsModal) {
            toggleModal(instructionsModal);
        }
        if (exportModal.classList.contains('active') && e.target === exportModal) {
            toggleModal(exportModal);
        }
        if (shareModal.classList.contains('active') && e.target === shareModal) {
            toggleModal(shareModal);
        }
        if (settingsModal.classList.contains('active') && e.target === settingsModal) {
            toggleModal(settingsModal);
        }
    });

    // Utility function for debouncing
    function debounce(func, wait) {
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

    // INITIALIZATION
    function initTheme() {
        const savedTheme = localStorage.getItem('nedits_ai_theme');
        if (savedTheme === 'light') {
            document.documentElement.dataset.theme = 'light';
            themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else if (savedTheme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
        } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            document.documentElement.dataset.theme = 'light';
            themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
        }
    }
    
    initTheme();
    
    loadConfig().then(() => {
        loadState();
        loadSharedChat();
        renderSidebar();
        renderActiveChat();
        initVoiceRecognition();
        registerServiceWorker();
    });
});
