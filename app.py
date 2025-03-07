from flask import Flask, render_template, send_from_directory, request
from flask_socketio import SocketIO, emit, join_room, leave_room
import random
import string
import os

app = Flask(__name__, static_folder='frontend', static_url_path='')
app.config['SECRET_KEY'] = 'melodifestivalen2025'
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='threading',
    engineio_options={
        'transports': ['polling'],
        'path': '/socket.io'
    }
)

rooms = {}

def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase, k=4))

@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')

@socketio.on('create_room')
def on_create_room(data):
    entries = data.get('entries', [])
    if not entries:
        emit('error', {'message': 'No entries provided'})
        return

    room_code = generate_room_code()
    while room_code in rooms:
        room_code = generate_room_code()

    rooms[room_code] = {
        'entries': entries,
        'votes': {},
        'revealed': False,
        'host': request.sid
    }

    join_room(room_code)
    emit('room_created', {'code': room_code, 'entries': entries})

@socketio.on('join_room')
def on_join(data):
    code = data.get('code')
    if not code or code not in rooms:
        emit('error', {'message': 'Invalid room code'})
        return

    join_room(code)
    emit('joined_room', {
        'code': code,
        'entries': rooms[code]['entries'],
        'is_host': request.sid == rooms[code]['host']
    })

@socketio.on('submit_votes')
def on_submit_votes(data):
    room = data.get('room')
    votes = data.get('votes')
    
    if not room or room not in rooms:
        emit('error', {'message': 'Invalid room'})
        return
    
    if not votes:
        emit('error', {'message': 'No votes provided'})
        return

    rooms[room]['votes'][request.sid] = votes
    emit('votes_submitted', {'message': 'Votes submitted successfully'}, room=room)

@socketio.on('reveal_scores')
def on_reveal_scores(data):
    room = data.get('room')
    
    if not room or room not in rooms:
        emit('error', {'message': 'Invalid room'})
        return

    if not rooms[room]['votes']:
        emit('error', {'message': 'No votes submitted yet'})
        return

    if request.sid != rooms[room]['host']:
        emit('error', {'message': 'Only the host can reveal scores'})
        return

    total_scores = calculate_total_scores(rooms[room]['votes'])
    emit('reveal_scores', {'scores': total_scores}, room=room)

def calculate_total_scores(votes):
    total_scores = {}
    for voter_scores in votes.values():
        for entry, points in voter_scores.items():
            if entry not in total_scores:
                total_scores[entry] = 0
            total_scores[entry] += int(points)
    return total_scores

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    socketio.run(app, port=port, debug=False, allow_unsafe_werkzeug=True)
