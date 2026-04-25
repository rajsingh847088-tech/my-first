const API_URL = (window.location.protocol === 'file:' || ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '8000')) ? 'http://127.0.0.1:8000/api' : window.location.origin + '/api';

// Check auth state
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('notes_user'));
    const loginBtn = document.getElementById('nav-login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (user && loginBtn && logoutBtn) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        logoutBtn.innerText = `Logout (${user.username})`;
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('notes_user');
            window.location.reload();
        });
    }
});

async function loginUser(email, password) {
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('notes_user', JSON.stringify(data));
            window.location.href = 'dashboard.html';
        } else {
            document.getElementById('auth-error').innerText = data.detail || 'Login failed';
        }
    } catch (err) {
        console.error(err);
        document.getElementById('auth-error').innerText = 'Network error. Make sure backend is running.';
    }
}

async function registerUser(username, email, password) {
    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (res.ok) {
            // Auto login after register
            await loginUser(email, password);
        } else {
            document.getElementById('auth-error').innerText = data.detail || 'Registration failed';
        }
    } catch (err) {
        console.error(err);
        document.getElementById('auth-error').innerText = 'Network error. Make sure backend is running.';
    }
}

async function fetchNotes(branch = '', semester = '', subject = '') {
    const container = document.getElementById('notes-container');
    if (!container) return;

    container.innerHTML = '<div style="color:var(--text-muted); width:100%; text-align:center; grid-column: 1/-1;">Loading...</div>';

    let url = new URL(`${API_URL}/notes`);
    if (branch) url.searchParams.append('branch', branch);
    if (semester) url.searchParams.append('semester', semester);
    if (subject) url.searchParams.append('subject', subject);

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch');
        const notes = await res.json();

        container.innerHTML = '';
        if (notes.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted); width:100%; text-align:center; grid-column: 1/-1;">No notes found matching criteria.</div>';
            return;
        }

        notes.forEach(note => {
            const date = new Date(note.created_at || Date.now()).toLocaleDateString();
            const card = document.createElement('div');
            card.className = 'glass-effect note-card';

            const contentStr = (note.content || '').trim();
            const isLink = /^https?:\/\//i.test(contentStr) && !contentStr.includes('\n');

            let showReadBtn = false;
            let readText = '';
            let downloadText = 'Download';
            if (note.file_path) {
                readText = 'Open PDF';
                downloadText = 'Download PDF';
                showReadBtn = true;
            } else if (isLink) {
                readText = 'Visit Link';
                downloadText = 'Copy Link';
                showReadBtn = true;
            }

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 0.5rem;">
                    <div style="font-size: 0.75rem; background: var(--primary-color); padding: 0.1rem 0.5rem; border-radius: 12px; color:white;">
                        ${note.branch} - Sem ${note.semester}
                    </div>
                </div>
                <h3 class="note-title">${note.title}</h3>
                <div class="note-meta">${note.subject} • Posted on ${date}</div>
                <div class="note-text-content note-text-clamped">
                    ${isLink ? `<a href="${contentStr}" target="_blank" style="color:var(--primary-color);text-decoration:underline;">${contentStr}</a>` : contentStr}
                </div>
                <button class="read-more-toggle" style="display:none;">Read More</button>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: auto;">
                    ${showReadBtn ? `<button class="btn btn-outline read-btn" style="padding: 0.4rem 0.8rem; font-size: 0.875rem;">
                        ${readText}
                    </button>` : ''}
                    ${!isLink ? `<button class="btn btn-primary download-btn" style="padding: 0.4rem 0.8rem; font-size: 0.875rem;">
                        ${downloadText}
                    </button>` : `<button class="btn btn-primary copy-btn" style="padding: 0.4rem 0.8rem; font-size: 0.875rem;">
                        ${downloadText}
                    </button>`}
                </div>
            `;

            const readBtn = card.querySelector('.read-btn');
            if (readBtn) {
                readBtn.addEventListener('click', () => {
                    if (note.file_path) {
                        const fileUrl = `${API_URL.replace('/api', '')}/${note.file_path}`;
                        window.open(fileUrl, '_blank');
                    } else if (isLink) {
                        window.open(contentStr, '_blank');
                    } else {
                        const blob = new Blob([contentStr], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank');
                    }
                });
            }

            const downloadBtn = card.querySelector('.download-btn');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', () => {
                    if (note.file_path) {
                        const fileUrl = `${API_URL.replace('/api', '')}/${note.file_path}`;
                        const a = document.createElement('a');
                        a.href = fileUrl;
                        a.target = '_blank';
                        a.download = note.file_path.split('/').pop();
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    } else {
                        const blob = new Blob([contentStr], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }
                });
            }

            const copyBtn = card.querySelector('.copy-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(contentStr);
                    copyBtn.innerText = 'Copied!';
                    setTimeout(() => copyBtn.innerText = downloadText, 2000);
                });
            }

            container.appendChild(card);

            const contentDiv = card.querySelector('.note-text-content');
            const toggleBtn = card.querySelector('.read-more-toggle');
            setTimeout(() => {
                if (contentDiv.scrollHeight > contentDiv.clientHeight) {
                    toggleBtn.style.display = 'inline-block';
                    toggleBtn.addEventListener('click', () => {
                        if (contentDiv.classList.contains('note-text-clamped')) {
                            contentDiv.classList.remove('note-text-clamped');
                            toggleBtn.innerText = 'Show Less';
                        } else {
                            contentDiv.classList.add('note-text-clamped');
                            toggleBtn.innerText = 'Read More';
                        }
                    });
                }
            }, 0);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div style="color:#ef4444; width:100%; text-align:center; grid-column: 1/-1;">Failed to load notes. Please start the Python backend.</div>';
    }
}

async function createNote(noteData) {
    const msgEl = document.getElementById('upload-msg');
    msgEl.innerText = 'Publishing...';
    msgEl.style.color = 'var(--text-muted)';

    try {
        const fetchOptions = { method: 'POST' };
        if (noteData instanceof FormData) {
            fetchOptions.body = noteData;
        } else {
            fetchOptions.headers = { 'Content-Type': 'application/json' };
            fetchOptions.body = JSON.stringify(noteData);
        }

        const res = await fetch(`${API_URL}/notes`, fetchOptions);

        if (res.ok) {
            msgEl.innerText = 'Note published successfully!';
            msgEl.style.color = 'var(--secondary-color)';
            setTimeout(() => window.location.href = 'dashboard.html', 1500);
        } else {
            const data = await res.json();
            msgEl.innerText = 'Error: ' + JSON.stringify(data);
            msgEl.style.color = '#ef4444';
        }
    } catch (err) {
        msgEl.innerText = 'Network Error. Backend might be down.';
        msgEl.style.color = '#ef4444';
        console.error(err);
    }
}
