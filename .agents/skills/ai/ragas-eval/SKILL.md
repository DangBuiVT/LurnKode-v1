---
name: ragas-eval
description: Hướng dẫn setup và chạy RAGAS evaluation framework cho DevVerse AI Tutor (5.1). Đo lường Faithfulness và Answer Relevance, so sánh RAG vs Vanilla LLM, và tạo evaluation report.
---

# RAGAS Evaluation Skill — DevVerse AI Tutor (5.1)

## RAGAS là gì?

RAGAS (RAG Assessment) là framework đánh giá chất lượng RAG systems.
Đề bài yêu cầu đo: **Faithfulness** và **Answer Relevance**.

## Metrics giải thích

| Metric | Định nghĩa | Thang điểm |
|---|---|---|
| **Faithfulness** | Answer có facts nào không có trong retrieved context không? | 0-1 (1 = hoàn toàn trung thực với context) |
| **Answer Relevance** | Answer có trả lời đúng câu hỏi không? | 0-1 (1 = hoàn toàn relevant) |

## 1. Setup

```bash
pip install ragas langchain-openai pandas
```

## 2. Chuẩn bị Evaluation Dataset

```python
# Tạo test dataset thủ công hoặc semi-automatically
evaluation_dataset = [
    {
        "question": "Hàm hash là gì?",
        "answer": "...",              # RAG answer (cần fill từ pipeline)
        "contexts": ["..."],          # Retrieved chunks (cần fill từ pipeline)
        "ground_truth": "Hàm hash là một hàm ánh xạ dữ liệu có kích thước tùy ý sang giá trị có kích thước cố định..."
    },
    # ... thêm 20-50 câu hỏi
]
```

## 3. Run RAGAS Evaluation

```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy
from datasets import Dataset
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

def run_ragas_evaluation(rag_results: list[dict]) -> dict:
    """
    rag_results: list of {question, answer, contexts, ground_truth}
    """
    dataset = Dataset.from_list(rag_results)

    # Specify models
    llm = ChatOpenAI(model="gpt-4o-mini")
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    result = evaluate(
        dataset=dataset,
        metrics=[faithfulness, answer_relevancy],
        llm=llm,
        embeddings=embeddings,
    )

    return {
        "faithfulness": result["faithfulness"],
        "answer_relevancy": result["answer_relevancy"],
        "details": result.to_pandas().to_dict(orient="records")
    }
```

## 4. Full Evaluation Script

```python
import asyncio
import json
from datetime import datetime

async def run_full_evaluation():
    """So sánh RAG vs Vanilla LLM"""

    # Load test questions (tự tạo hoặc từ instructors)
    test_questions = [
        {
            "question": "Giải thích thuật toán QuickSort",
            "ground_truth": "QuickSort là thuật toán sắp xếp dựa trên phân hoạch (partition)..."
        },
        # ... thêm câu hỏi
    ]

    course_id = "your-test-course-id"
    rag_results = []
    vanilla_results = []

    for q in test_questions:
        # RAG pipeline
        rag_response = await rag_query(
            question=q["question"],
            course_id=course_id,
            user_id="eval-system"
        )

        # Vanilla LLM baseline
        vanilla_response = await vanilla_llm_query(
            question=q["question"],
            course_id=course_id
        )

        rag_results.append({
            "question": q["question"],
            "answer": rag_response["answer"],
            "contexts": [c["excerpt"] for c in rag_response["citations"]],
            "ground_truth": q["ground_truth"]
        })

        vanilla_results.append({
            "question": q["question"],
            "answer": vanilla_response["answer"],
            "contexts": [""],  # No context for vanilla
            "ground_truth": q["ground_truth"]
        })

    # Evaluate both
    rag_metrics = run_ragas_evaluation(rag_results)
    vanilla_metrics = run_ragas_evaluation(vanilla_results)

    # Report
    report = {
        "timestamp": datetime.utcnow().isoformat(),
        "num_questions": len(test_questions),
        "rag_pipeline": {
            "faithfulness": rag_metrics["faithfulness"],
            "answer_relevancy": rag_metrics["answer_relevancy"]
        },
        "vanilla_llm_baseline": {
            "faithfulness": vanilla_metrics["faithfulness"],
            "answer_relevancy": vanilla_metrics["answer_relevancy"]
        },
        "improvement": {
            "faithfulness": rag_metrics["faithfulness"] - vanilla_metrics["faithfulness"],
            "answer_relevancy": rag_metrics["answer_relevancy"] - vanilla_metrics["answer_relevancy"]
        }
    }

    # Save report
    with open(f"ragas_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json", "w") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"=== RAGAS EVALUATION REPORT ===")
    print(f"RAG    Faithfulness: {rag_metrics['faithfulness']:.3f}")
    print(f"RAG    Answer Relevancy: {rag_metrics['answer_relevancy']:.3f}")
    print(f"Vanilla Faithfulness: {vanilla_metrics['faithfulness']:.3f}")
    print(f"Vanilla Answer Relevancy: {vanilla_metrics['answer_relevancy']:.3f}")

    return report
```

## 5. Expected Results (benchmark)

| System | Faithfulness | Answer Relevancy |
|---|---|---|
| RAG với pgvector | > 0.80 | > 0.75 |
| Vanilla LLM baseline | ~0.40 | ~0.60 |
| **Improvement** | **+40%** | **+15%** |

## Khi nào activate skill này

- Setup RAGAS evaluation cho component 5.1
- Run so sánh RAG vs Vanilla LLM
- Debug bad faithfulness scores (hallucination)
- Debug bad relevancy scores (wrong topic)
- Tạo evaluation report cho báo cáo đồ án
