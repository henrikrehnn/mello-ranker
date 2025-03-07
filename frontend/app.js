const socket = io('https://mello-ranker.vercel.app');
let isHost = false;
let currentEntries = [];
let currentRoomCode = '';

// Standard Melodifestivalen 2024 entries
const standardEntries = [
    "John Lundvik - Voice of the Silent",
    "Dolly Style - YIHAA",
    "Greczula - Believe Me",
    "Klara Hammarström - On and On and On",
    "SCARLET - Sweet N' Psycho",
    "Erik Segerstedt - Show Me What Love Is",
    "Maja Ivarsson - Kamikaze Life",
    "Meira Omar - Hush Hush",
    "Måns Zelmerlöw - Revolution",
    "Saga Ludvigsson - Hate You So Much",
    "Annika Wickihalder - Life Again",
    "KAJ - Bara bada bastu"
];

// Show welcome screen initially
showScreen('welcome');

// Event listeners for navigation
document.getElementById('create-room-btn').addEventListener('click', () => {
    showScreen('host-setup');
    isHost = true;
    // Pre-populate with standard entries
    standardEntries.forEach(entry => addEntryToList(entry));
});

document.getElementById('join-room-btn').addEventListener('click', () => showScreen('join'));
document.getElementById('submit-join-btn').addEventListener('click', joinRoom);
document.getElementById('add-entry-btn').addEventListener('click', addEntry);
document.getElementById('start-room-btn').addEventListener('click', createRoom);
document.getElementById('submit-votes-btn').addEventListener('click', submitVotes);

function showScreen(screenName) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => screen.style.display = 'none');
    // Show the requested screen
    document.getElementById(screenName + '-screen').style.display = 'block';
}

function addEntry() {
    const input = document.getElementById('entry-input');
    const entry = input.value.trim();
    if (entry) {
        addEntryToList(entry);
        input.value = '';
    }
}

function addEntryToList(entry) {
    const list = document.getElementById('entry-list');
    const item = document.createElement('li');
    item.className = 'list-group-item d-flex align-items-center';
    item.innerHTML = `
        <span class="drag-handle">⋮⋮</span>
        <span class="ms-2">${entry}</span>
        <button class="btn btn-danger btn-sm ms-auto" onclick="this.parentElement.remove()">Remove</button>
    `;
    list.appendChild(item);
}

function createRoom() {
    const entries = Array.from(document.getElementById('entry-list').children)
        .map(item => item.children[1].textContent);
    if (entries.length > 0) {
        socket.emit('create_room', { entries });
    }
}

function joinRoom() {
    const code = document.getElementById('join-code').value.trim().toUpperCase();
    if (code) {
        socket.emit('join_room', { code });
    }
}

function setupVotingArea(entries) {
    const votingArea = document.getElementById('voting-area');
    votingArea.innerHTML = '';
    entries.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'entry-item';
        item.draggable = true;
        item.innerHTML = `
            <span class="drag-handle">⋮⋮</span>
            <span class="entry-text">${entry}</span>
            <span class="points-badge">${getPoints(index)}</span>
        `;
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', updatePoints);
        votingArea.appendChild(item);
    });
}

function getPoints(position) {
    if (position === 0) return 12;
    if (position === 1) return 10;
    if (position >= 10) return 0;
    if (position >= 2) return 10 - position;
    return 0;
}

function handleDragStart(e) {
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', Array.from(this.parentNode.children).indexOf(this));
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const draggingItem = document.querySelector('.dragging');
    if (draggingItem !== this) {
        const allItems = [...this.parentNode.children];
        const draggingIndex = allItems.indexOf(draggingItem);
        const droppingIndex = allItems.indexOf(this);
        if (draggingIndex < droppingIndex) {
            this.parentNode.insertBefore(draggingItem, this.nextSibling);
        } else {
            this.parentNode.insertBefore(draggingItem, this);
        }
    }
}

function handleDrop(e) {
    e.preventDefault();
    updatePoints();
}

function updatePoints() {
    document.querySelectorAll('.entry-item').forEach((item, index) => {
        const pointsBadge = item.querySelector('.points-badge');
        pointsBadge.textContent = getPoints(index);
    });
    document.querySelector('.dragging')?.classList.remove('dragging');
}

function submitVotes() {
    const votes = {};
    document.querySelectorAll('.entry-item').forEach((item, index) => {
        const entry = item.querySelector('.entry-text').textContent;
        votes[entry] = getPoints(index);
    });
    socket.emit('submit_votes', { votes, room: currentRoomCode });
}

function showResults(scores) {
    showScreen('results');
    const scoreboard = document.getElementById('scoreboard');
    scoreboard.innerHTML = '';

    // Sort entries by score
    const sortedEntries = Object.entries(scores)
        .sort(([,a], [,b]) => b - a);

    // Create podium for top 3
    if (sortedEntries.length >= 3) {
        const podium = document.createElement('div');
        podium.className = 'podium-container row g-3';
        
        // Second place
        podium.innerHTML = `
            <div class="col-4 second">
                <div class="podium-box">
                    <div class="trophy">🥈</div>
                    <div class="entry-name">${sortedEntries[1][0]}</div>
                    <div class="points">${sortedEntries[1][1]} points</div>
                </div>
            </div>
        `;

        // First place
        podium.innerHTML += `
            <div class="col-4 first">
                <div class="podium-box">
                    <div class="trophy">👑</div>
                    <div class="entry-name">${sortedEntries[0][0]}</div>
                    <div class="points">${sortedEntries[0][1]} points</div>
                </div>
            </div>
        `;

        // Third place
        podium.innerHTML += `
            <div class="col-4 third">
                <div class="podium-box">
                    <div class="trophy">🥉</div>
                    <div class="entry-name">${sortedEntries[2][0]}</div>
                    <div class="points">${sortedEntries[2][1]} points</div>
                </div>
            </div>
        `;

        scoreboard.appendChild(podium);
    }

    // Create list for remaining entries
    const remainingEntries = document.createElement('div');
    remainingEntries.className = 'mt-5';
    sortedEntries.slice(3).forEach(([entry, score], index) => {
        const scoreEntry = document.createElement('div');
        scoreEntry.className = 'score-entry';
        scoreEntry.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span class="h5">${index + 4}. ${entry}</span>
                <span class="points-badge">${score}</span>
            </div>
            <div class="progress mt-2">
                <div class="progress-bar" style="width: ${(score / sortedEntries[0][1]) * 100}%"></div>
            </div>
        `;
        remainingEntries.appendChild(scoreEntry);
    });
    scoreboard.appendChild(remainingEntries);
}

// Socket event handlers
socket.on('room_created', data => {
    currentRoomCode = data.code;
    currentEntries = data.entries;
    showScreen('voting');
    document.getElementById('room-code-display').textContent = `Room Code: ${currentRoomCode}`;
    setupVotingArea(currentEntries);
    if (isHost) {
        document.getElementById('host-controls').classList.remove('d-none');
    }
});

socket.on('joined_room', data => {
    currentRoomCode = data.code;
    currentEntries = data.entries;
    showScreen('voting');
    document.getElementById('room-code-display').textContent = `Room Code: ${currentRoomCode}`;
    setupVotingArea(currentEntries);
});

socket.on('error', data => {
    alert(data.message);
});

socket.on('reveal_scores', data => {
    showResults(data.scores);
});

// Add reveal scores button handler for host
document.getElementById('reveal-scores-btn')?.addEventListener('click', () => {
    socket.emit('reveal_scores', { room: currentRoomCode });
});
