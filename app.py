from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import random
import string
import os
from typing import Dict, List

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files
app.mount("/", StaticFiles(directory="frontend", html=True), name="static")

rooms: Dict[str, Dict] = {}

def generate_room_code() -> str:
    return ''.join(random.choices(string.ascii_uppercase, k=4))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_json()
            event = data.get("event")
            
            if event == "create_room":
                entries = data.get("entries", [])
                if not entries:
                    await websocket.send_json({"error": "No entries provided"})
                    continue

                room_code = generate_room_code()
                while room_code in rooms:
                    room_code = generate_room_code()

                rooms[room_code] = {
                    "entries": entries,
                    "votes": {},
                    "revealed": False,
                    "host": websocket.client.host
                }

                await websocket.send_json({
                    "event": "room_created",
                    "data": {
                        "code": room_code,
                        "entries": entries
                    }
                })

            elif event == "join_room":
                code = data.get("code")
                if not code or code not in rooms:
                    await websocket.send_json({"error": "Invalid room code"})
                    continue

                await websocket.send_json({
                    "event": "joined_room",
                    "data": {
                        "code": code,
                        "entries": rooms[code]["entries"],
                        "is_host": websocket.client.host == rooms[code]["host"]
                    }
                })

            elif event == "submit_votes":
                room = data.get("room")
                votes = data.get("votes")
                
                if not room or room not in rooms:
                    await websocket.send_json({"error": "Invalid room"})
                    continue
                
                if not votes:
                    await websocket.send_json({"error": "No votes provided"})
                    continue

                rooms[room]["votes"][websocket.client.host] = votes
                await websocket.send_json({
                    "event": "votes_submitted",
                    "data": {"message": "Votes submitted successfully"}
                })

            elif event == "reveal_scores":
                room = data.get("room")
                
                if not room or room not in rooms:
                    await websocket.send_json({"error": "Invalid room"})
                    continue

                if not rooms[room]["votes"]:
                    await websocket.send_json({"error": "No votes submitted yet"})
                    continue

                if websocket.client.host != rooms[room]["host"]:
                    await websocket.send_json({"error": "Only the host can reveal scores"})
                    continue

                total_scores = calculate_total_scores(rooms[room]["votes"])
                await websocket.send_json({
                    "event": "reveal_scores",
                    "data": {"scores": total_scores}
                })

    except WebSocketDisconnect:
        pass

def calculate_total_scores(votes: Dict) -> Dict:
    total_scores = {}
    for voter_scores in votes.values():
        for entry, points in voter_scores.items():
            if entry not in total_scores:
                total_scores[entry] = 0
            total_scores[entry] += int(points)
    return total_scores

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
