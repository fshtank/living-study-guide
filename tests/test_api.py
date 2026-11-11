from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

def test_api_notes_crud_and_cards():
    # 1. Create a note
    note_content = "The inventory management API uses RESTful endpoints to track stock levels. PostgreSQL is used as the relational database."
    res = client.post("/api/notes", json={"title": "Inventory Architecture", "content": note_content})
    assert res.status_code == 200
    note_data = res.json()
    assert note_data["title"] == "Inventory Architecture"
    note_id = note_data["id"]

    # 2. List notes
    res = client.get("/api/notes")
    assert res.status_code == 200
    notes = res.json()
    assert any(n["id"] == note_id for n in notes)

    # 3. Generate cards from note
    res = client.post("/api/cards/generate", json={
        "note_ids": [note_id],
        "style": "basic recall",
        "count": 3
    })
    assert res.status_code == 200
    cards = res.json()
    assert len(cards) >= 1
    first_card = cards[0]
    assert first_card["status"] == "pending"
    assert len(first_card["source_reference"]) > 0

    # 4. Get pending cards
    res = client.get("/api/cards/pending")
    assert res.status_code == 200
    pending = res.json()
    assert any(c["id"] == first_card["id"] for c in pending)

    # 5. Edit pending card
    edit_res = client.put(f"/api/cards/{first_card['id']}/edit", json={
        "prompt": "Custom edited prompt: What does the inventory API use?",
        "answer": "RESTful endpoints"
    })
    assert edit_res.status_code == 200
    assert edit_res.json()["prompt"] == "Custom edited prompt: What does the inventory API use?"

    # 6. Approve card
    app_res = client.patch(f"/api/cards/{first_card['id']}/approve")
    assert app_res.status_code == 200
    assert app_res.json()["status"] == "approved"

    # 7. Check library
    lib_res = client.get("/api/cards/library?q=inventory")
    assert lib_res.status_code == 200
    lib_cards = lib_res.json()
    assert any(c["id"] == first_card["id"] for c in lib_cards)

    # 8. Start & complete quiz session
    quiz_res = client.post("/api/quiz/session", json={"limit": 5})
    assert quiz_res.status_code == 200
    session_id = quiz_res.json()["id"]

    complete_res = client.post(f"/api/quiz/session/{session_id}/complete", json={
        "answers": [
            {"card_id": first_card["id"], "user_answer": "RESTful endpoints", "is_correct": True}
        ]
    })
    assert complete_res.status_code == 200
    assert complete_res.json()["score"] == 1

def test_frontend_spa_serving():
    res = client.get("/")
    assert res.status_code == 200
    assert "Living Study Guide" in res.text or "<div id=\"root\">" in res.text
