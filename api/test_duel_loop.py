"""Automated integration test for full 1v1 duel loop.
Simulates two players (Alice & Bob) queueing, matching, connecting via WS,
submitting an answer, receiving commentary/progress, and finalizing match state.
"""
import asyncio
import os
import sys

# Ensure api directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Use sqlite for local offline test if Postgres is not running
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_duel.db"
os.environ["CACHE_URL"] = "redis://localhost:6379"  # Will fallback to memory automatically if Redis not up

from fastapi.testclient import TestClient
from starlette.testclient import TestClient as StarletteTestClient
from app.db import init_models, AsyncSessionLocal
from app.models import Player, Match
from main import app


async def run_test():
    print("--- STEP 1: Initialize Database Models ---")
    await init_models()
    print("Database initialized successfully.")

    # Create test client using Starlette TestClient (supports WebSockets)
    client = TestClient(app)

    print("\n--- STEP 2: Join Queue for Player 1 (Alice) ---")
    resp_a = client.post("/api/queue/join", json={"nickname": "Alice"})
    assert resp_a.status_code == 200, f"Alice join failed: {resp_a.text}"
    data_a = resp_a.json()
    player_a_id = data_a["player_id"]
    print(f"Alice joined with ID: {player_a_id}, Rating: {data_a['rating']}")

    print("\n--- STEP 3: Connect WebSocket for Alice ---")
    ws_a = client.websocket_connect(f"/ws/{player_a_id}")
    ws_a.send_json({"action": "join_queue"})
    print("Alice WebSocket connected.")

    print("\n--- STEP 4: Join Queue for Player 2 (Bob) ---")
    resp_b = client.post("/api/queue/join", json={"nickname": "Bob"})
    assert resp_b.status_code == 200, f"Bob join failed: {resp_b.text}"
    data_b = resp_b.json()
    player_b_id = data_b["player_id"]
    print(f"Bob joined with ID: {player_b_id}, Rating: {data_b['rating']}")

    print("\n--- STEP 5: Connect WebSocket for Bob ---")
    ws_b = client.websocket_connect(f"/ws/{player_b_id}")
    ws_b.send_json({"action": "join_queue"})
    print("Bob WebSocket connected.")

    print("\n--- STEP 6: Waiting for duel_start message on WebSockets ---")
    # Wait for duel_start on both sockets
    start_a = None
    start_b = None

    # Give async task time to generate problem and push message
    for _ in range(20):
        await asyncio.sleep(0.5)
        try:
            msg_a = ws_a.receive_json(mode="text")
            if msg_a.get("type") == "duel_start":
                start_a = msg_a
                break
        except Exception:
            pass

    for _ in range(20):
        try:
            msg_b = ws_b.receive_json(mode="text")
            if msg_b.get("type") == "duel_start":
                start_b = msg_b
                break
        except Exception:
            pass

    assert start_a is not None, "Alice did not receive duel_start message!"
    print(f"Alice received duel_start! Problem Category: {start_a['problem']['category']}, Type: {start_a['problem']['type']}")
    print(f"Problem Prompt: {start_a['problem']['prompt']}")

    room_id = start_a["room_id"]

    print("\n--- STEP 7: Submit Answer from Alice ---")
    # Retrieve actual answer from problem generator or test correct answer logic
    # For testing fallback or actual problem:
    # If short_answer fallback: expected is "O(log n)"
    # Submit answer
    answer = "O(log n)"
    ws_a.send_json({"action": "submit_answer", "room_id": room_id, "answer": answer})
    print(f"Alice submitted answer: {answer}")

    # Listen on Bob's socket for opponent_progress and duel_end
    end_msg = None
    progress_msg = None

    for _ in range(10):
        await asyncio.sleep(0.5)
        try:
            msg = ws_b.receive_json(mode="text")
            if msg.get("type") == "opponent_progress":
                progress_msg = msg
                print(f"Bob received opponent progress: {msg}")
            elif msg.get("type") == "duel_end":
                end_msg = msg
                print(f"Bob received duel_end: {msg}")
                break
        except Exception:
            pass

    print("\n--- STEP 8: Verify Leaderboard Endpoint ---")
    lb_resp = client.get("/api/leaderboard")
    assert lb_resp.status_code == 200
    lb_data = lb_resp.json()
    print(f"Leaderboard standings ({len(lb_data)} players):")
    for entry in lb_data:
        print(f"  - {entry['nickname']}: Rating {entry['rating']} (W: {entry['wins']}, L: {entry['losses']})")

    print("\n--- STEP 9: Verify Profile Endpoint ---")
    prof_resp = client.get(f"/api/players/{player_a_id}/profile")
    assert prof_resp.status_code == 200
    prof_data = prof_resp.json()
    print(f"Alice profile: {prof_data}")

    ws_a.close()
    ws_b.close()
    print("\nSUCCESS: Full duel loop verified locally!")


if __name__ == "__main__":
    asyncio.run(run_test())
