// FutbolApp - Main Logic
const API_CONFIG = {
    ENABLED: true,
    KEY: '931b606865msh9d5fb32aa60bc29p1927a8jsne955cbe8d81c',
    HOST: 'v3.football.api-sports.io',
    BASE_URL: 'https://v3.football.api-sports.io'
};

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

async function initApp() {
    if (API_CONFIG.ENABLED && API_CONFIG.KEY !== 'YOUR_RAPIDAPI_KEY') {
        renderLoadingState();
        const liveData = await fetchLiveScores();
        if (liveData) {
            renderMatches(liveData);
        } else {
            initSimulation(); // Fallback
        }
    } else {
        console.warn('API Key not set. Running in Simulation Mode.');
        initSimulation();
    }
}

/**
 * Fetches live scores from API-Football
 */
async function fetchLiveScores() {
    try {
        console.log('Fetching live scores...');
        const response = await fetch(`${API_CONFIG.BASE_URL}/fixtures?live=all`, {
            method: "GET",
            headers: {
                "x-rapidapi-host": API_CONFIG.HOST,
                "x-rapidapi-key": API_CONFIG.KEY
            }
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();

        if (!data.response || data.response.length === 0) {
            console.warn('No live matches found from API. Falling back to simulation.');
            initSimulation();
            return null;
        }

        return data.response;
    } catch (error) {
        console.error('API Fetch Error:', error.message);
        console.log('Falling back to simulation mode...');
        initSimulation();
        return null;
    }
}

/**
 * Maps API data to HTML Cards
 */
function renderMatches(fixtures) {
    const feed = document.querySelector('.match-feed');
    // Clear existing hardcoded matches except title
    const title = feed.querySelector('div:first-child');
    feed.innerHTML = '';
    feed.appendChild(title);

    fixtures.forEach(item => {
        const card = document.createElement('div');
        card.className = 'match-card';
        card.innerHTML = `
            <div class="match-time ${item.fixture.status.short === '1H' || item.fixture.status.short === '2H' ? 'live' : ''}">
                ${item.fixture.status.short === 'LIVE' || item.fixture.status.elapsed ? `<div class="live-indicator"></div><span>${item.fixture.status.elapsed}'</span>` : `<span>${item.fixture.status.short}</span>`}
            </div>
            <div class="match-teams">
                <div class="team">
                    <img src="${item.teams.home.logo}" class="team-logo" alt="${item.teams.home.name}">
                    <span>${item.teams.home.name}</span>
                </div>
                <div class="team">
                    <img src="${item.teams.away.logo}" class="team-logo" alt="${item.teams.away.name}">
                    <span>${item.teams.away.name}</span>
                </div>
            </div>
            <div class="match-score">
                <div class="score-row">${item.goals.home ?? 0}</div>
                <div class="score-row">${item.goals.away ?? 0}</div>
            </div>
        `;
        feed.appendChild(card);
    });

    // Re-attach listeners to new dynamic cards
    setupEventListeners();
}

function renderLoadingState() {
    const feed = document.querySelector('.match-feed');
    const loading = document.createElement('div');
    loading.style.padding = '40px';
    loading.style.textAlign = 'center';
    loading.style.color = 'var(--text-secondary)';
    loading.textContent = 'Canlı veriler yükleniyor...';
    feed.appendChild(loading);
}

/**
 * Original Simulation Logic (Fallback)
 */
function initSimulation() {
    initLiveUpdates();
}

function initLiveUpdates() {
    const liveMatchTime = document.querySelector('.match-time.live span');
    let minute = 74;

    setInterval(() => {
        // Increment minute
        if (Math.random() > 0.8) {
            minute++;
            if (minute > 90) minute = 90;
            if (liveMatchTime) liveMatchTime.textContent = minute + "'";
        }

        // Random goal simulation
        if (Math.random() > 0.98) {
            updateScore('match-1');
        }
    }, 5000);
}

function updateScore(matchId) {
    const matchCard = document.getElementById(matchId);
    if (!matchCard) return;

    const scores = matchCard.querySelectorAll('.score-row');
    const isHomeGoal = Math.random() > 0.5;

    if (isHomeGoal) {
        let current = parseInt(scores[0].textContent);
        scores[0].textContent = current + 1;
        highlightScore(scores[0]);
    } else {
        let current = parseInt(scores[1].textContent);
        scores[1].textContent = current + 1;
        highlightScore(scores[1]);
    }
}

function highlightScore(element) {
    element.style.color = 'var(--accent-green)';
    element.style.transition = 'color 0.3s';

    setTimeout(() => {
        element.style.color = 'var(--text-primary)';
    }, 3000);
}

function setupEventListeners() {
    // Search animation
    const searchBar = document.querySelector('.search-bar');
    const searchInput = searchBar?.querySelector('input');

    if (searchInput) {
        searchInput.addEventListener('focus', () => {
            searchBar.style.boxShadow = '0 0 0 2px var(--accent-blue)';
        });
        searchInput.addEventListener('blur', () => {
            searchBar.style.boxShadow = 'none';
        });
    }

    // Modal Control
    const overlay = document.getElementById('match-details-overlay');
    const closeBtn = document.getElementById('close-details');

    document.querySelectorAll('.match-card').forEach(card => {
        card.addEventListener('click', () => {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scroll
        });
    });

    closeBtn?.addEventListener('click', () => {
        overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    });

    // Close on backdrop click
    overlay?.addEventListener('click', (e) => {
        if (e.target === overlay) closeBtn.click();
    });

    // Tab Switching
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            updateTabContent(tab.dataset.tab);
        });
    });
}

function updateTabContent(tabName) {
    const content = document.getElementById('details-content');
    // For demo purposes, we'll just show/hide specific sections or update text
    console.log(`Tab switched to: ${tabName}`);
    // In a full app, this would fetch data or render different components
}
