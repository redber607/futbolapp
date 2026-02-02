// FutbolApp - Main Logic
const API_CONFIG = {
    ENABLED: true,
    KEY: '931b606865msh9d5fb32aa60bc29p1927a8jsne955cbe8d81c',
    HOST: 'v3.football.api-sports.io',
    BASE_URL: 'https://v3.football.api-sports.io'
};

const LEAGUES = {
    TURKEY: 203,
    PREMIER_LEAGUE: 39,
    LA_LIGA: 140,
    SERIE_A: 135,
    CHAMPIONS_LEAGUE: 2
};

let currentView = 'live'; // 'live', league ID (num), or 'team-ID'
let matchFilter = 'upcoming'; // 'upcoming' or 'finished'

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
    loadSuperLigTeams();
});

async function initApp() {
    renderLoadingState();
    if (API_CONFIG.ENABLED && API_CONFIG.KEY !== 'YOUR_RAPIDAPI_KEY') {
        let matchData;
        if (currentView === 'live') {
            matchData = await fetchLiveScores();
        } else if (typeof currentView === 'number') {
            matchData = await fetchLeagueFixtures(currentView, matchFilter);
            await loadLeagueStandings(currentView);
        } else if (currentView.startsWith('team-')) {
            const teamId = currentView.split('-')[1];
            matchData = await fetchTeamFixtures(teamId, matchFilter);
        }

        if (matchData && matchData.length > 0) {
            renderMatches(matchData);
        } else if (currentView === 'live') {
            initSimulation();
        } else {
            renderEmptyState();
        }
    } else {
        initSimulation();
    }
}

async function fetchLeagueFixtures(leagueId, filter = 'upcoming') {
    try {
        const year = new Date().getFullYear() - 1; // 2024-2025 season
        const type = filter === 'upcoming' ? 'next=15' : 'last=15';
        const response = await fetch(`${API_CONFIG.BASE_URL}/fixtures?league=${leagueId}&season=${year}&${type}`, {
            method: "GET",
            headers: {
                "x-rapidapi-host": API_CONFIG.HOST,
                "x-rapidapi-key": API_CONFIG.KEY
            }
        });
        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error('League Fetch Error:', error);
        return null;
    }
}

async function loadLeagueStandings(leagueId) {
    try {
        const year = new Date().getFullYear() - 1;
        const response = await fetch(`${API_CONFIG.BASE_URL}/standings?league=${leagueId}&season=${year}`, {
            method: "GET",
            headers: {
                "x-rapidapi-host": API_CONFIG.HOST,
                "x-rapidapi-key": API_CONFIG.KEY
            }
        });
        const data = await response.json();
        if (data.response && data.response[0]) {
            renderStandings(data.response[0].league.standings[0]);
        }
    } catch (error) {
        console.error('Standings Fetch Error:', error);
    }
}

function renderStandings(standings) {
    const container = document.querySelector('.standings-container');
    if (!container) return;

    let html = `
        <div class="info-card standings-card" style="margin-top: 24px;">
            <h3 class="section-title">Puan Durumu</h3>
            <div style="overflow-x: auto;">
                <table style="width: 100%; font-size: 11px; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="color: var(--text-secondary); text-align: left; border-bottom: 2px solid var(--border-color);">
                            <th style="padding: 10px 4px;">#</th>
                            <th style="padding: 10px 4px;">Takım</th>
                            <th style="padding: 10px 4px; text-align: center;">O</th>
                            <th style="padding: 10px 4px; text-align: center;">Av</th>
                            <th style="padding: 10px 4px; text-align: center;">P</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    standings.forEach(team => {
        const isSelected = currentView === `team-${team.team.id}`;
        html += `
            <tr style="border-bottom: 1px solid var(--border-color); cursor: pointer; transition: 0.2s; ${isSelected ? 'background: rgba(0, 242, 255, 0.05); border-left: 2px solid var(--accent-blue);' : ''}">
                <td style="padding: 10px 4px;">${team.rank}</td>
                <td style="padding: 10px 4px; display: flex; align-items: center; gap: 8px;">
                    <img src="${team.team.logo}" style="width: 16px; height: 16px; border-radius: 0;">
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px;">${team.team.name}</span>
                </td>
                <td style="padding: 10px 4px; text-align: center;">${team.all.played}</td>
                <td style="padding: 10px 4px; text-align: center;">${team.goalsDiff}</td>
                <td style="padding: 10px 4px; text-align: center; font-weight: 800; color: var(--accent-blue);">${team.points}</td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
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
    feed.innerHTML = '';

    // Render Filters (Upcoming / Finished)
    if (currentView !== 'live') {
        renderMatchFilter(feed);
    } else {
        const title = document.createElement('div');
        title.style.display = 'flex';
        title.style.justifyContent = 'space-between';
        title.style.alignItems = 'center';
        title.style.marginBottom = '8px';
        title.innerHTML = `
            <h2 style="font-size: 18px; font-weight: 700;">Canlı Maçlar</h2>
            <div style="background: var(--bg-accent); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; color: var(--accent-green); border: 1px solid var(--accent-green);">
                ${fixtures.length} CANLI
            </div>
        `;
        feed.appendChild(title);
    }

    fixtures.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'match-card reveal';
        card.style.animationDelay = `${index * 0.05}s`;
        card.innerHTML = `
            <div class="match-time ${item.fixture.status.short === '1H' || item.fixture.status.short === '2H' ? 'live' : ''}">
                ${item.fixture.status.short === 'LIVE' || item.fixture.status.elapsed ? `<div class="live-indicator"></div><span>${item.fixture.status.elapsed}'</span>` : `<span>${item.fixture.status.short}</span>`}
            </div>
            <div class="match-teams">
                <div class="team">
                    <img src="${item.teams.home.logo}" class="team-logo" alt="${item.teams.home.name}">
                    <span style="${item.goals.home > item.goals.away ? 'font-weight: 800; color: var(--text-primary);' : 'color: var(--text-secondary);'}">${item.teams.home.name}</span>
                </div>
                <div class="team">
                    <img src="${item.teams.away.logo}" class="team-logo" alt="${item.teams.away.name}">
                    <span style="${item.goals.away > item.goals.home ? 'font-weight: 800; color: var(--text-primary);' : 'color: var(--text-secondary);'}">${item.teams.away.name}</span>
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

function renderMatchFilter(container) {
    const filterDiv = document.createElement('div');
    filterDiv.className = 'match-filter';
    filterDiv.style.display = 'flex';
    filterDiv.style.gap = '12px';
    filterDiv.style.marginBottom = '16px';
    filterDiv.style.padding = '4px';
    filterDiv.style.background = 'var(--bg-secondary)';
    filterDiv.style.borderRadius = '12px';
    filterDiv.style.width = 'fit-content';

    filterDiv.innerHTML = `
        <button class="filter-btn ${matchFilter === 'upcoming' ? 'active' : ''}" data-filter="upcoming" style="padding: 8px 16px; border-radius: 8px; border: none; background: ${matchFilter === 'upcoming' ? 'var(--accent-blue)' : 'transparent'}; color: white; cursor: pointer; font-weight: 600; font-size: 13px;">Gelecek Program</button>
        <button class="filter-btn ${matchFilter === 'finished' ? 'active' : ''}" data-filter="finished" style="padding: 8px 16px; border-radius: 8px; border: none; background: ${matchFilter === 'finished' ? 'var(--accent-blue)' : 'transparent'}; color: white; cursor: pointer; font-weight: 600; font-size: 13px;">Sonuçlar</button>
    `;

    filterDiv.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            matchFilter = btn.dataset.filter;
            initApp();
        });
    });

    container.appendChild(filterDiv);
}

function renderEmptyState() {
    const feed = document.querySelector('.match-feed');
    feed.innerHTML = '';

    if (currentView !== 'live') renderMatchFilter(feed);

    const empty = document.createElement('div');
    empty.style.padding = '60px 40px';
    empty.style.textAlign = 'center';
    empty.style.color = 'var(--text-secondary)';
    empty.innerHTML = `
        <i data-lucide="calendar-x" style="width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
        <p>Bu kategoride şu an için maç bulunamadı.</p>
    `;
    feed.appendChild(empty);
    lucide.createIcons();
}

function renderLoadingState() {
    const feed = document.querySelector('.match-feed');
    feed.innerHTML = `
        <div style="padding: 80px; text-align: center; color: var(--text-secondary);">
            <div class="live-indicator" style="margin: 0 auto 16px; width: 12px; height: 12px;"></div>
            <p style="font-size: 14px;">Veriler yükleniyor...</p>
        </div>
    `;
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

async function loadSuperLigTeams() {
    if (!API_CONFIG.ENABLED || API_CONFIG.KEY === 'YOUR_RAPIDAPI_KEY') {
        const teamList = document.getElementById('super-lig-teams');
        if (teamList) teamList.innerHTML = '<div style="padding: 10px; color: var(--text-secondary); font-size: 11px;">Simülasyon Modu: Takımlar yüklenemedi.</div>';
        return;
    }

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/teams?league=${LEAGUES.TURKEY}&season=${new Date().getFullYear() - 1}`, {
            method: "GET",
            headers: {
                "x-rapidapi-host": API_CONFIG.HOST,
                "x-rapidapi-key": API_CONFIG.KEY
            }
        });
        const data = await response.json();
        if (data.response) {
            renderSuperLigTeams(data.response);
        }
    } catch (error) {
        console.error('Teams Fetch Error:', error);
    }
}

function renderSuperLigTeams(teams) {
    const list = document.getElementById('super-lig-teams');
    if (!list) return;

    list.innerHTML = '';
    teams.forEach(item => {
        const team = item.team;
        const div = document.createElement('div');
        div.className = 'league-item';
        div.style.cursor = 'pointer';
        div.style.padding = '8px 12px';
        div.style.fontSize = '13px';
        div.innerHTML = `
            <img src="${team.logo}" style="width: 14px; height: 14px; margin-right: 12px;">
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${team.name}</span>
        `;
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            currentView = `team-${team.id}`;
            fetchTeamFixtures(team.id);
        });
        list.appendChild(div);
    });
}

async function fetchTeamFixtures(teamId, filter = 'upcoming') {
    renderLoadingState();
    try {
        const type = filter === 'upcoming' ? 'next=15' : 'last=15';
        const response = await fetch(`${API_CONFIG.BASE_URL}/fixtures?team=${teamId}&${type}`, {
            method: "GET",
            headers: {
                "x-rapidapi-host": API_CONFIG.HOST,
                "x-rapidapi-key": API_CONFIG.KEY
            }
        });
        const data = await response.json();
        if (data.response) {
            renderMatches(data.response);
        }
    } catch (error) {
        console.error('Team Fixtures Fetch Error:', error);
    }
}

function setupEventListeners() {
    // League Switching
    document.querySelectorAll('.league-toggle').forEach(item => {
        item.addEventListener('click', () => {
            currentView = parseInt(item.dataset.leagueId);
            initApp();
        });
    });

    const liveBtn = document.querySelector('.live-btn');
    if (liveBtn) {
        liveBtn.addEventListener('click', () => {
            currentView = 'live';
            initApp();
        });
    }

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
