# Melodifestivalen Ranking App

A real-time web application for ranking Melodifestivalen entries using the Eurovision scoring system. Hosts can create rooms and share a code with participants to vote together.

## Features

- Create voting rooms with custom entries
- Join rooms using unique room codes
- Real-time participant tracking
- Eurovision-style scoring system (12, 10, 8, 7, 6, 5, 4, 3, 2, 1 points)
- Drag-and-drop ranking interface
- Beautiful animated scoreboard reveal

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Start the server:
```bash
python app.py
```

3. Open `frontend/index.html` in your web browser

## How to Use

1. **Host a Room:**
   - Click "Create New Room"
   - Add your Melodifestivalen entries
   - Click "Start Room" to get your room code

2. **Join a Room:**
   - Enter the room code provided by the host
   - Click "Join Room"

3. **Voting:**
   - Drag entries to rank them
   - Points are automatically assigned based on position
   - Click "Submit Votes" when done

4. **Results:**
   - Host can reveal final scores when everyone has voted
   - Scores are displayed in an animated scoreboard
