---
name: ast-plagiarism
description: Hướng dẫn triển khai AST-based structural plagiarism detection cho DevVerse Anti-cheat system (5.4). Bao gồm AST parsing, tree normalization, structural comparison, similarity scoring, và so sánh với string matching baseline.
---

# AST Plagiarism Detection Skill — DevVerse Anti-cheat (5.4)

## Yêu cầu đề bài

- AST-based structural plagiarism detection (không phải string matching)
- So sánh với String Matching baseline
- Đo AST recall rate
- Evaluation: False positive / False negative

## 1. Tại sao AST thay vì String Matching?

```
String Matching: "abc" == "abc"          → fail với rename variables
AST Comparison:  FunctionDef(body=[...]) → detect rename/reorder/whitespace tricks
```

**Tricks AST detect được mà string matching không detect được:**
- Đổi tên biến: `x` → `my_variable`
- Thay đổi whitespace/comments
- Reorder independent statements
- Thêm dead code (if False: ...)
- Đổi loop form: `for` → `while`

## 2. Python AST Detection

```python
import ast
import hashlib
from typing import Any

class ASTNormalizer(ast.NodeVisitor):
    """Normalize AST bằng cách bỏ tên biến, giữ structure"""

    def normalize(self, tree: ast.AST) -> str:
        """Trả về canonical string representation"""
        return self._visit(tree)

    def _visit(self, node: ast.AST) -> str:
        if isinstance(node, ast.Name):
            return "VAR"  # Normalize tất cả tên biến
        if isinstance(node, ast.Constant):
            return f"CONST({type(node.value).__name__})"  # Giữ type, bỏ value
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            args = [self._visit(a) for a in node.args.args]
            body = [self._visit(s) for s in node.body]
            return f"FuncDef({','.join(args)})[{';'.join(body)}]"
        if isinstance(node, ast.For):
            return f"For({self._visit(node.target)},{self._visit(node.iter)})[{';'.join(self._visit(s) for s in node.body)}]"
        if isinstance(node, ast.If):
            body = ';'.join(self._visit(s) for s in node.body)
            orelse = ';'.join(self._visit(s) for s in node.orelse)
            return f"If({self._visit(node.test)})[{body}][{orelse}]"
        # Generic fallback
        children = [self._visit(child) for child in ast.iter_child_nodes(node)]
        return f"{type(node).__name__}({','.join(children)})"


def compute_ast_similarity(code_a: str, code_b: str) -> float:
    """
    Trả về similarity score [0.0, 1.0]
    1.0 = structurally identical
    """
    try:
        tree_a = ast.parse(code_a)
        tree_b = ast.parse(code_b)
    except SyntaxError:
        return 0.0

    normalizer = ASTNormalizer()
    norm_a = normalizer.normalize(tree_a)
    norm_b = normalizer.normalize(tree_b)

    # Exact match after normalization
    if norm_a == norm_b:
        return 1.0

    # Tree edit distance approximation (Jaccard on subtrees)
    subtrees_a = extract_subtrees(norm_a)
    subtrees_b = extract_subtrees(norm_b)

    intersection = subtrees_a & subtrees_b
    union = subtrees_a | subtrees_b

    return len(intersection) / len(union) if union else 0.0


def extract_subtrees(normalized: str, min_len: int = 10) -> set[str]:
    """Extract all substrings as proxy for subtrees"""
    subs = set()
    for i in range(len(normalized)):
        for j in range(i + min_len, min(i + 100, len(normalized) + 1)):
            subs.add(normalized[i:j])
    return subs
```

## 3. JavaScript/TypeScript AST (nếu cần)

```typescript
import * as parser from '@babel/parser'
import traverse from '@babel/traverse'

function normalizeJSAST(code: string): string {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript']
  })

  const structure: string[] = []
  traverse(ast, {
    FunctionDeclaration(path) {
      structure.push(`FuncDecl(${path.node.params.length}params)`)
    },
    VariableDeclaration(path) {
      structure.push(`VarDecl(${path.node.kind})`)
    },
    ForStatement(path) {
      structure.push('ForLoop')
    },
    IfStatement(path) {
      structure.push('If')
    },
    // ... thêm node types
  })

  return structure.join('|')
}
```

## 4. Plagiarism Detection Pipeline

```python
from supabase import create_client
from datetime import datetime

PLAGIARISM_THRESHOLD = 0.85  # 85% similarity = likely plagiarism

async def check_plagiarism(
    submission_id: str,
    code: str,
    language: str,
    problem_id: str
) -> dict:
    # Lấy tất cả submissions khác cho cùng problem
    existing = supabase.from_('submissions').select(
        'id, user_id, code'
    ).eq('problem_id', problem_id).neq('id', submission_id).execute()

    results = []
    for other in existing.data:
        if language == 'python':
            similarity = compute_ast_similarity(code, other['code'])
        else:
            similarity = compute_string_similarity(code, other['code'])  # fallback

        if similarity >= PLAGIARISM_THRESHOLD:
            results.append({
                'compared_submission_id': other['id'],
                'compared_user_id': other['user_id'],
                'similarity': similarity,
                'method': 'AST'
            })

    # Lưu kết quả
    if results:
        supabase.from_('plagiarism_reports').insert({
            'submission_id': submission_id,
            'matches': results,
            'detected_at': datetime.utcnow().isoformat()
        }).execute()

    return {
        'is_plagiarized': len(results) > 0,
        'matches': results
    }
```

## 5. String Matching Baseline (để so sánh)

```python
from difflib import SequenceMatcher

def compute_string_similarity(code_a: str, code_b: str) -> float:
    """Baseline: pure string similarity"""
    # Normalize: remove whitespace, comments, lowercase
    def normalize(code: str) -> str:
        import re
        code = re.sub(r'#.*', '', code)        # Remove comments
        code = re.sub(r'\s+', ' ', code)       # Normalize whitespace
        return code.strip().lower()

    a = normalize(code_a)
    b = normalize(code_b)
    return SequenceMatcher(None, a, b).ratio()
```

## 6. Evaluation Metrics (yêu cầu đề bài)

```python
def evaluate_detector(test_cases: list[dict]) -> dict:
    """
    test_cases: [{code_a, code_b, is_plagiarized_ground_truth}]
    """
    tp = fp = tn = fn = 0

    for tc in test_cases:
        ast_score = compute_ast_similarity(tc['code_a'], tc['code_b'])
        predicted = ast_score >= PLAGIARISM_THRESHOLD
        actual = tc['is_plagiarized_ground_truth']

        if predicted and actual: tp += 1
        elif predicted and not actual: fp += 1
        elif not predicted and not actual: tn += 1
        else: fn += 1

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0    # AST Recall Rate
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    return {
        'precision': precision,
        'recall': recall,     # ← đây là "AST recall rate" trong đề bài
        'f1': f1,
        'tp': tp, 'fp': fp, 'tn': tn, 'fn': fn
    }
```

## Khi nào activate skill này

- Build anti-cheat feature (5.4)
- Implement plagiarism detection API endpoint
- Evaluate AST vs String Matching
- Debug false positives/negatives
- Add support cho ngôn ngữ mới
