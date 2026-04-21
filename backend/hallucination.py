from typing import List, Dict
import re


class HallucinationScorer:
    """
    Hallucination scorer using consensus deviation.
    Each model's score = how much its word distribution deviates from consensus.
    High deviation = high hallucination risk.
    """

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r'\b[a-z]{3,}\b', text.lower())

    def _term_freq(self, tokens: List[str]) -> Dict[str, float]:
        if not tokens:
            return {}
        counts: Dict[str, int] = {}
        for t in tokens:
            counts[t] = counts.get(t, 0) + 1
        total = len(tokens)
        return {k: v / total for k, v in counts.items()}

    def _cosine_similarity(self, a: Dict[str, float], b: Dict[str, float]) -> float:
        if not a or not b:
            return 0.0
        shared = set(a.keys()) & set(b.keys())
        dot = sum(a[k] * b[k] for k in shared)
        norm_a = sum(v * v for v in a.values()) ** 0.5
        norm_b = sum(v * v for v in b.values()) ** 0.5
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def score(self, model_names: List[str], texts: List[str]) -> List[Dict]:
        valid_pairs = [(name, text) for name, text in zip(model_names, texts) if text and text.strip()]

        if not valid_pairs:
            return [
                {"model": name, "hallucination_score": 0.5, "consensus_similarity": 0.5}
                for name in model_names
            ]

        all_tokens = []
        for _, text in valid_pairs:
            all_tokens.extend(self._tokenize(text))

        consensus_tf = self._term_freq(all_tokens)

        score_map = {}
        for name, text in valid_pairs:
            tokens = self._tokenize(text)
            if not tokens:
                score_map[name] = {"hallucination_score": 0.5, "consensus_similarity": 0.5}
                continue

            model_tf = self._term_freq(tokens)
            similarity = self._cosine_similarity(model_tf, consensus_tf)
            hallucination = round(1.0 - similarity, 4)
            hallucination = max(0.05, min(hallucination, 0.95))
            similarity = round(similarity, 4)

            score_map[name] = {
                "hallucination_score": hallucination,
                "consensus_similarity": similarity,
            }

        results = []
        for name in model_names:
            if name in score_map:
                results.append({"model": name, **score_map[name]})
            else:
                results.append({
                    "model": name,
                    "hallucination_score": 0.5,
                    "consensus_similarity": 0.5,
                })

        return sorted(results, key=lambda x: x["hallucination_score"], reverse=True)