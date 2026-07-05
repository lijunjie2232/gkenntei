from pydantic import BaseModel, Field
from typing import List

from langchain_openai import ChatOpenAI
from deepagents import create_deep_agent
from langchain_core.prompts import ChatPromptTemplate

import json
from tqdm import tqdm
from pathlib import Path


class AnswerSchema(BaseModel):
    id: int = Field(
        description="The 0-based index of the correct option (0, 1, 2, or 3)",
    )
    explain: str = Field(
        description="A concise explanation of the answer",
    )


class ReformattedQA(BaseModel):
    question: str
    options: List[str]
    answer: AnswerSchema


from langchain_core.prompts import ChatPromptTemplate

system_prompt = """**あなたは教育コンテンツの再フォーマットを専門とするデータ変換のエキスパートです。与えられた生の質問と回答のデータを、指定された構造化JSON形式に変換してください。以下のガイドラインに従うこと。**

1. 抽出とクレンジング（マークダウン形式）:
   - 質問文（`question`）および選択肢（`options`）からHTMLタグ、クラス属性、不要な記号を削除し、**すべてマークダウン（Markdown）形式**で出力すること。
   - 選択肢は必ず4つ抽出し、リスト項目のみを格納すること。
   - 回答を分析し、正解となる選択肢のインデックス（0～3）をidフィールドに格納すること。

2. 解説の洗練（重要・マークダウン形式）:
   - 解説（`explain`）内容は「必ず元のテキストの内容をすべて保持」すること。要約や情報の削減は厳禁とし、元の説明に含まれるすべての情報を残したまま再フォーマットすること。
   - 質問や選択肢との整合性を重視し、どの選択肢が正解で、なぜ他の選択肢が誤りなのかという論理的な関係性が明確になるよう構成すること。
   - 不必要なメタデータ（data-path-to-node等）は完全に除去し、読みやすい日本語に整形すること。

3. 数式（LaTeX）とマークダウンの共通ルール:
   - **すべてのテキストフィールド（question, options, explain）において、HTMLタグ（<b>, <br>, <ul> 等）の出力は一切禁止する。** 代わりに太字（**）や改行などの標準的なマークダウン記法を使用すること。
   - **文中に登場するLaTeXマークアップ（例: $...$ や $$...$$ など）は、勝手に削除や平易な表現への変換を行わず、そのままの形で必ず保持すること。**

4. 形式の厳守:
   - 出力は必ず以下のJSONスキーマに従うこと（値となる文字列はすべてマークダウン形式にすること）：
     {{"question": "...", "options": ["...", "...", "...", "..."], "answer": {{"id": integer, "explain": "..."}}}}
   - 選択肢が不足している場合は文脈から推論すること。
   - 出力にはJSONオブジェクトのみを含めること。マークダウンのコードブロック（```json ... ```）、前置き、補足コメントは一切不要。
"""


# 1. Instantiate the model with the local endpoint
llm = ChatOpenAI(
    model="qwen3.6:27b",  # Specify the model name loaded in Ollama
    # model="gemma4:26b",
    base_url="http://127.0.0.1:11434/v1",
    api_key="12321",
    temperature=0.7,
)

# agent = create_deep_agent(
#     model=llm,
#     system_prompt=system_prompt,
#     response_format=ReformattedQA,
# )

# data reading

data_c = []
data = []
qa_path = Path("data/q_a.json")
qa_clean_path = Path("data/q_a_clean_qw.json")

with open(
    qa_path,
    "r",
    encoding="utf-8",
) as f:
    data = json.load(f)

if qa_clean_path.is_file():
    try:
        with open(
            qa_clean_path,
            "r",
            encoding="utf-8",
        ) as f:
            data_c = json.load(f)
    except:
        pass

# skip cleaned q-a pairs
for item in tqdm(
    data[len(data_c) :],
    desc="Cleaning q-a pairs",
    total=len(data) - len(data_c),
):
    agent = create_deep_agent(
        model=llm,
        system_prompt=system_prompt,
        response_format=ReformattedQA,
    )

    message = {
        "messages": [
            {
                "role": "user",
                "content": f"Input Question: \n\n {item['question']}\n\nInput Answer Data: \n\n {item['answer']}",
            }
        ]
    }

    result = agent.invoke(message, think=True)
    if "structured_response" in result and result["structured_response"]:
        structured_result = result["structured_response"]
        data_c.append(structured_result.model_dump())
    else:
        try:
            json_str = result["messages"][-1].content
            if json_str.startswith("```json\n"):
                json_str = json_str[8:]
            if json_str.endswith("```"):
                json_str = json_str[:-3]
            data_c.append(json.loads(json_str))
        except:
            data_c.append({})

    with open(
        qa_clean_path,
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            data_c,
            f,
            ensure_ascii=False,
            indent=4,
        )
        f.flush()


if qa_clean_path.is_file():
    try:
        with open(
            qa_clean_path,
            "r",
            encoding="utf-8",
        ) as f:
            data_c = json.load(f)
        for idx, qac in tqdm(enumerate(data_c), total=len(data_c)):
            # check empty {} and refetch
            if not qac:
                agent = create_deep_agent(
                    model=llm,
                    system_prompt=system_prompt,
                    response_format=ReformattedQA,
                )

                message = {
                    "messages": [
                        {
                            "role": "user",
                            "content": f"Input Question: \n\n {data[idx]['question']}\n\nInput Answer Data: \n\n {data[idx]['answer']}",
                        }
                    ]
                }

                result = agent.invoke(message, think=True)
                if "structured_response" in result and result["structured_response"]:
                    structured_result = result["structured_response"]
                    data_c[idx] = structured_result.model_dump()
                    with open(
                        qa_clean_path,
                        "w",
                        encoding="utf-8",
                    ) as f:
                        json.dump(
                            data_c,
                            f,
                            ensure_ascii=False,
                            indent=4,
                        )
                        f.flush()
    except:
        pass
