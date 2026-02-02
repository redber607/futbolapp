// FutbolApp - Main Logic
const API_CONFIG = {
    ENABLED: true,
    KEY: '931b606865msh9d5fb32aa60bc29p1927a8jsne955cbe8d81c'.trim(),
    HOSTS: ['api-football-v1.p.rapidapi.com', 'v3.football.api-sports.io'],
    ENDPOINTS: ['https://api-football-v1.p.rapidapi.com/v3', 'https://v3.football.api-sports.io']
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

function logDiag(msg, type = 'info') {
    const diagLogs = document.getElementById('diag-logs');
    const diagConsole = document.getElementById('diagnostic-console');
    if (!diagLogs) return;

    diagConsole.style.display = 'block';
    const log = document.createElement('div');
    log.style.color = type === 'error' ? '#ff3333' : (type === 'warn' ? '#ffcc00' : '#00f2ff');
    log.textContent = `> ${msg}`;
    diagLogs.appendChild(log);
    if (diagLogs.childNodes.length > 5) diagLogs.removeChild(diagLogs.firstChild);
}

async function initApp() {
    renderLoadingState();
    logDiag(`Görünüm değiştirildi: ${currentView}`);

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
        } else {
            if (currentView === 'live') {
                initSimulation();
            } else {
                renderEmptyState();
            }
        }
    } else {
        initSimulation();
    }
}

async function fetchWithRetry(path) {
    logDiag(`İstek atılıyor: ${path.split('?')[0]}`);

    // Try RapidAPI first
    try {
        const response = await fetch(`${API_CONFIG.ENDPOINTS[0]}${path}`, {
            method: "GET",
            headers: {
                "x-rapidapi-host": API_CONFIG.HOSTS[0],
                "x-rapidapi-key": API_CONFIG.KEY
            }
        });
        if (response.ok) {
            logDiag(`RapidAPI Başarılı`);
            return await response.json();
        }
        logDiag(`RapidAPI Hata: ${response.status}`, 'warn');
    } catch (e) {
        logDiag(`RapidAPI Fetch Error`, 'error');
    }

    // Try API-Sports as fallback
    try {
        const response = await fetch(`${API_CONFIG.ENDPOINTS[1]}${path}`, {
            method: "GET",
            headers: {
                "x-apisports-key": API_CONFIG.KEY
            }
        });
        if (response.ok) {
            logDiag(`API-Sports Başarılı`);
            return await response.json();
        }
        logDiag(`API-Sports Hata: ${response.status}`, 'warn');
    } catch (e) {
        logDiag(`API-Sports Fetch Error`, 'error');
    }
    return null;
}

async function fetchLeagueFixtures(leagueId, filter = 'upcoming') {
    try {
        const currentYear = new Date().getFullYear();
        const month = new Date().getMonth();
        let season = month < 7 ? currentYear - 1 : currentYear;

        const tryLoad = async (targetSeason) => {
            const type = filter === 'upcoming' ? 'next=15' : 'last=15';
            const data = await fetchWithRetry(`/fixtures?league=${leagueId}&season=${targetSeason}&${type}`);
            return (data && data.response && data.response.length > 0) ? data.response : null;
        };

        let result = await tryLoad(season);
        if (!result) result = await tryLoad(season - 1);
        if (!result && season > 2023) result = await tryLoad(2024);

        return result;
    } catch (error) {
        return null;
    }
}

async function loadLeagueStandings(leagueId) {
    const container = document.querySelector('.standings-container');
    if (!container) return;

    try {
        const currentYear = new Date().getFullYear();
        const month = new Date().getMonth();
        let season = month < 7 ? currentYear - 1 : currentYear;

        const tryLoadStandings = async (targetSeason) => {
            const data = await fetchWithRetry(`/standings?league=${leagueId}&season=${targetSeason}`);
            if (data && data.response && data.response[0]) {
                document.getElementById('season-label').textContent = `Sezon ${targetSeason}/${(targetSeason + 1).toString().slice(-2)}`;
                renderStandings(data.response[0].league.standings[0]);
                return true;
            }
            return false;
        };

        let success = await tryLoadStandings(season);
        if (!success) success = await tryLoadStandings(season - 1);
        if (!success && season > 2023) success = await tryLoadStandings(2024);

    } catch (error) { }
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

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
}

async function fetchLiveScores() {
    try {
        const data = await fetchWithRetry('/fixtures?live=all');
        return (data && data.response && data.response.length > 0) ? data.response : null;
    } catch (error) {
        return null;
    }
}

function renderMatches(fixtures) {
    const feed = document.querySelector('.match-feed');
    feed.innerHTML = '';

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
            <div class="match-time ${['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(item.fixture.status.short) ? 'live' : ''}">
                ${item.fixture.status.elapsed ? `<div class="live-indicator"></div><span>${item.fixture.status.elapsed}'</span>` : `<span>${item.fixture.status.short}</span>`}
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
    if (window.lucide) lucide.createIcons();
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

function initSimulation() {
    const feed = document.querySelector('.match-feed');
    feed.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
            <i data-lucide="shield-alert" style="width: 32px; height: 32px; margin-bottom: 12px; opacity: 0.5;"></i>
            <p style="font-size: 14px; font-weight: 600;">Simülasyon Modu Aktif</p>
            <p style="font-size: 11px; margin-top: 4px;">Gerçek zamanlı verilere ulaşılamadı. Örnek maçlar gösteriliyor.</p>
        </div>
        <div class="match-card reveal" style="opacity: 0.7;">
            <div class="match-time live">
                <div class="live-indicator"></div><span>74'</span>
            </div>
            <div class="match-teams">
                <div class="team">
                    <img src="https://media.api-sports.io/football/teams/564.png" class="team-logo">
                    <span style="font-weight: 800;">Galatasaray</span>
                </div>
                <div class="team">
                    <img src="https://media.api-sports.io/football/teams/567.png" class="team-logo">
                    <span>Beşiktaş</span>
                </div>
            </div>
            <div class="match-score">
                <div class="score-row">2</div>
                <div class="score-row">1</div>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

async function loadSuperLigTeams() {
    logDiag('Süper Lig takımları yükleniyor...');
    const teamList = document.getElementById('super-lig-teams');
    if (!teamList) return;

    try {
        const currentYear = new Date().getFullYear();
        const month = new Date().getMonth();
        let season = month < 7 ? currentYear - 1 : currentYear;

        const tryLoad = async (targetSeason) => {
            const data = await fetchWithRetry(`/teams?league=${LEAGUES.TURKEY}&season=${targetSeason}`);
            if (data && data.response && data.response.length > 0) {
                renderSuperLigTeams(data.response);
                return true;
            }
            return false;
        };

        let success = await tryLoad(season);
        if (!success) success = await tryLoad(season - 1);
        if (!success && season > 2023) success = await tryLoad(2024);

        if (!success) {
            teamList.innerHTML = '<div style="padding: 10px; color: var(--text-secondary); font-size: 11px;">Takım bulunamadı.</div>';
            logDiag('Takım listesi boş döndü.', 'warn');
        }
    } catch (error) {
        teamList.innerHTML = `<div style="padding: 10px; color: var(--accent-red); font-size: 11px;">Hata.</div>`;
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
        div.style.padding = '8px 12px';
        div.style.cursor = 'pointer';
        div.style.borderBottom = '1px solid var(--border-color)';
        div.innerHTML = `
            <img src="${team.logo}" style="width: 14px; height: 14px; margin-right: 12px; border-radius: 0;">
            <span style="font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${team.name}</span>
        `;
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            currentView = `team-${team.id}`;
            initApp();
        });
        list.appendChild(div);
    });
}

async function fetchTeamFixtures(teamId, filter = 'upcoming') {
    renderLoadingState();
    try {
        const type = filter === 'upcoming' ? 'next=15' : 'last=15';
        const data = await fetchWithRetry(`/fixtures?team=${teamId}&${type}`);
        if (data && data.response) {
            renderMatches(data.response);
        }
    } catch (error) { }
}

function setupEventListeners() {
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

    const overlay = document.getElementById('match-details-overlay');
    const closeBtn = document.getElementById('close-details');
    document.querySelectorAll('.match-card').forEach(card => {
        card.addEventListener('click', () => {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });
    closeBtn?.addEventListener('click', () => {
        overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    });
    overlay?.addEventListener('click', (e) => {
        if (e.target === overlay) closeBtn.click();
    });
}
