import json
from pathlib import Path
from tqdm import tqdm

if __name__ == "__main__":
    path = Path("data")
    q_a_path = path / Path("q_a.json")
    q_a_path.parent.mkdir(parents=True, exist_ok=True)

    q_a_list = []

    for file in tqdm(
        list(path.glob("gemini-conversation*.json")),
        desc="Combining files",
    ):
        with open(file, "r") as f:
            data = json.load(f)
            q_a_list.extend(data["conversation"])

    # unique the question (item: {"question": "xxx", "answer": "xxx"})
    print(f"size of q_a_list: {len(q_a_list)}")
    q_a_list = list(
        {
            item["question"][:108] : item
            for item in q_a_list
        }.values()
    )

    print(f"size of q_a_list after unique: {len(q_a_list)}")

    with open(q_a_path, "w") as f:
        json.dump(q_a_list, f, ensure_ascii=False, indent=4)
    