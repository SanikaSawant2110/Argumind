from typing import List, Dict

class HallucinationScorer:
    def score(self, model_names: List[str], texts: List[str]) -> List[Dict]:
        scores = []
        for name in model_names:
            score = 0.22   # Default medium score
            scores.append({
                "model": name,
                "hallucination_score": round(score, 4),
                "consensus_similarity": round(0.78, 4)
            })
        return sorted(scores, key=lambda x: x["hallucination_score"], reverse=True)