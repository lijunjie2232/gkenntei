from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import json
from typing import Optional
from pydantic import BaseModel

from . import __version__ as VERSION

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnswerRequest(BaseModel):
    id: int

data_file = Path(__file__).parent.parent.parent / "data" / "q_a_clean_qw.json"

qa_data = []
if data_file.is_file():
    with open(data_file, "r", encoding="utf-8") as f:
        qa_data = json.load(f)

@app.get("/q")
def get_question(id: Optional[int] = 1):
    if not qa_data:
        return {"error": "No data available"}
    if id < 1 or id > len(qa_data):
        id = 1
    item = qa_data[id - 1]
    return {
        "question": item.get("question", ""),
        "options": item.get("options", []),
        "total": len(qa_data),
    }

@app.post("/a")
def get_answer(req: AnswerRequest):
    if not qa_data:
        return {"error": "No data available"}
    id = req.id
    if id < 1 or id > len(qa_data):
        id = 1
    item = qa_data[id - 1]
    answer = item.get("answer", {})
    return {
        "answer": answer.get("explain", ""),
        "correct_id": answer.get("id", -1),
    }

@app.get("/v")
def get_version():
    return {"version": VERSION}

frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

@app.exception_handler(404)
async def not_found(request: Request, exc):
    if frontend_dist.is_dir():
        index = frontend_dist / "index.html"
        if index.is_file():
            from starlette.responses import FileResponse
            return FileResponse(str(index))
    from fastapi.responses import JSONResponse
    return JSONResponse({"detail": "Not Found"}, status_code=404)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
