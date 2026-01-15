"""
Semantic similarity testing utilities for LLM output validation.

This module provides functions and classes for comparing text outputs
semantically rather than through exact string matching. This is essential
for LLM output validation where the exact wording may vary but the
meaning should remain consistent.

Usage:
    from tests.helpers.semantic_similarity import semantic_similarity

    # Simple boolean check
    assert semantic_similarity(
        "UCT requires an APS score of 30",
        "The University of Cape Town needs an APS of at least 30 points",
        threshold=0.7
    )

    # Get actual similarity score
    score = cosine_similarity(text1, text2)
    assert score >= 0.8
"""

from typing import Optional, List, Tuple
import numpy as np


def cosine_similarity(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
    """
    Calculate cosine similarity between two embeddings.

    Args:
        embedding1: First embedding vector
        embedding2: Second embedding vector

    Returns:
        float: Cosine similarity score between -1 and 1
    """
    norm1 = np.linalg.norm(embedding1)
    norm2 = np.linalg.norm(embedding2)

    if norm1 == 0 or norm2 == 0:
        return 0.0

    return float(np.dot(embedding1, embedding2) / (norm1 * norm2))


def semantic_similarity(
    text1: str,
    text2: str,
    threshold: float = 0.8,
    model_name: str = "all-MiniLM-L6-v2"
) -> bool:
    """
    Check if two texts are semantically similar above a threshold.

    This function uses sentence-transformers to generate embeddings
    and compares them using cosine similarity. If sentence-transformers
    is not available, falls back to simple substring matching.

    Args:
        text1: First text to compare
        text2: Second text to compare
        threshold: Minimum similarity score (0-1) to return True
        model_name: Sentence transformer model to use

    Returns:
        bool: True if similarity >= threshold, False otherwise

    Example:
        >>> semantic_similarity(
        ...     "The admission requirements include a minimum APS of 30",
        ...     "You need at least 30 APS points for admission",
        ...     threshold=0.7
        ... )
        True
    """
    try:
        from sentence_transformers import SentenceTransformer

        model = SentenceTransformer(model_name)
        embeddings = model.encode([text1, text2])
        similarity = cosine_similarity(embeddings[0], embeddings[1])
        return similarity >= threshold

    except ImportError:
        # Fallback to simple substring matching if sentence-transformers not available
        text1_lower = text1.lower()
        text2_lower = text2.lower()
        return text1_lower in text2_lower or text2_lower in text1_lower


class SemanticSimilarityChecker:
    """
    Reusable semantic similarity checker with cached model.

    This class is useful when you need to perform many similarity
    checks, as it loads the model once and reuses it.

    Usage:
        checker = SemanticSimilarityChecker()
        assert checker.is_similar("text1", "text2", threshold=0.8)
        score = checker.get_score("text1", "text2")
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize the checker with a sentence transformer model.

        Args:
            model_name: Sentence transformer model to use
        """
        self.model_name = model_name
        self._model = None
        self._available = None

    @property
    def model(self):
        """Lazy-load the sentence transformer model."""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.model_name)
                self._available = True
            except ImportError:
                self._available = False
        return self._model

    @property
    def is_available(self) -> bool:
        """Check if sentence-transformers is available."""
        if self._available is None:
            _ = self.model  # Trigger lazy load
        return self._available

    def get_embedding(self, text: str) -> Optional[np.ndarray]:
        """
        Get the embedding for a text.

        Args:
            text: Text to embed

        Returns:
            numpy array embedding or None if not available
        """
        if not self.is_available:
            return None
        return self.model.encode(text)

    def get_embeddings(self, texts: List[str]) -> Optional[np.ndarray]:
        """
        Get embeddings for multiple texts.

        Args:
            texts: List of texts to embed

        Returns:
            numpy array of embeddings or None if not available
        """
        if not self.is_available:
            return None
        return self.model.encode(texts)

    def get_score(self, text1: str, text2: str) -> float:
        """
        Get the semantic similarity score between two texts.

        Args:
            text1: First text
            text2: Second text

        Returns:
            float: Similarity score between 0 and 1
        """
        if not self.is_available:
            # Fallback: return 1.0 if substring match, 0.0 otherwise
            text1_lower = text1.lower()
            text2_lower = text2.lower()
            if text1_lower in text2_lower or text2_lower in text1_lower:
                return 1.0
            return 0.0

        embeddings = self.model.encode([text1, text2])
        return cosine_similarity(embeddings[0], embeddings[1])

    def is_similar(
        self,
        text1: str,
        text2: str,
        threshold: float = 0.8
    ) -> bool:
        """
        Check if two texts are semantically similar.

        Args:
            text1: First text
            text2: Second text
            threshold: Minimum similarity score

        Returns:
            bool: True if similarity >= threshold
        """
        return self.get_score(text1, text2) >= threshold

    def find_most_similar(
        self,
        query: str,
        candidates: List[str]
    ) -> Tuple[int, str, float]:
        """
        Find the most similar text from a list of candidates.

        Args:
            query: Query text to match
            candidates: List of candidate texts

        Returns:
            Tuple of (index, text, score) for the most similar candidate
        """
        if not candidates:
            raise ValueError("candidates list cannot be empty")

        if not self.is_available:
            # Fallback: simple substring matching
            for i, candidate in enumerate(candidates):
                if query.lower() in candidate.lower():
                    return (i, candidate, 1.0)
            return (0, candidates[0], 0.0)

        query_embedding = self.model.encode(query)
        candidate_embeddings = self.model.encode(candidates)

        best_idx = 0
        best_score = -1.0

        for i, emb in enumerate(candidate_embeddings):
            score = cosine_similarity(query_embedding, emb)
            if score > best_score:
                best_score = score
                best_idx = i

        return (best_idx, candidates[best_idx], best_score)

    def batch_similarity(
        self,
        pairs: List[Tuple[str, str]]
    ) -> List[float]:
        """
        Calculate similarity scores for multiple text pairs.

        Args:
            pairs: List of (text1, text2) tuples

        Returns:
            List of similarity scores
        """
        return [self.get_score(t1, t2) for t1, t2 in pairs]
