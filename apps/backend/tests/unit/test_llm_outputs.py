"""
LLM output tests using DeepEval and semantic similarity.

This module provides example tests for validating LLM outputs from
the One For All agents. Tests use DeepEval metrics for comprehensive
evaluation and semantic similarity helpers for flexible matching.

These tests require:
- DeepEval API key (DEEPEVAL_API_KEY environment variable)
- sentence-transformers package for semantic similarity

Tests will be skipped if dependencies are not available.
"""

import os
import pytest
from typing import Dict, Any

# Import semantic similarity helpers
from tests.helpers.semantic_similarity import (
    semantic_similarity,
    SemanticSimilarityChecker,
)


# =============================================================================
# DeepEval Tests
# =============================================================================

@pytest.mark.llm
@pytest.mark.skipif(
    not os.environ.get("DEEPEVAL_API_KEY"),
    reason="DeepEval API key not configured"
)
class TestLLMOutputsWithDeepEval:
    """
    Test LLM outputs using DeepEval metrics.

    These tests validate that agent responses meet quality standards
    for relevancy, faithfulness, and coherence.
    """

    def test_agent_response_relevancy(self):
        """Test that agent responses are relevant to input queries."""
        try:
            from deepeval import assert_test
            from deepeval.test_case import LLMTestCase
            from deepeval.metrics import AnswerRelevancyMetric
        except ImportError:
            pytest.skip("DeepEval not installed")

        # Example: Test admission requirements response
        test_case = LLMTestCase(
            input="What are the admission requirements for UCT?",
            actual_output=(
                "UCT requires a minimum APS score of 30 for most undergraduate programs. "
                "Specific faculties may have higher requirements. For Engineering, "
                "you need Mathematics and Physical Science at minimum 60%."
            )
        )

        metric = AnswerRelevancyMetric(threshold=0.7)
        assert_test(test_case, [metric])

    def test_nsfas_eligibility_response(self):
        """Test NSFAS eligibility information accuracy."""
        try:
            from deepeval import assert_test
            from deepeval.test_case import LLMTestCase
            from deepeval.metrics import AnswerRelevancyMetric
        except ImportError:
            pytest.skip("DeepEval not installed")

        test_case = LLMTestCase(
            input="Am I eligible for NSFAS if my household income is R200,000?",
            actual_output=(
                "Based on the household income of R200,000 per year, you may be "
                "eligible for NSFAS funding. The current threshold is R350,000 "
                "for families without SASSA grants. You should apply and provide "
                "proof of income documentation."
            )
        )

        metric = AnswerRelevancyMetric(threshold=0.7)
        assert_test(test_case, [metric])

    def test_course_recommendation_coherence(self):
        """Test that course recommendations are coherent and relevant."""
        try:
            from deepeval import assert_test
            from deepeval.test_case import LLMTestCase
            from deepeval.metrics import AnswerRelevancyMetric
        except ImportError:
            pytest.skip("DeepEval not installed")

        test_case = LLMTestCase(
            input=(
                "I have an APS score of 35 with Mathematics at 75% "
                "and Physical Sciences at 70%. What courses can I apply for?"
            ),
            actual_output=(
                "With your APS of 35 and strong STEM subjects, you qualify for: "
                "1) BSc Computer Science (requires APS 32, Maths 60%) "
                "2) BSc Engineering (requires APS 34, Maths 70%, Physics 60%) "
                "3) BSc Actuarial Science (requires APS 35, Maths 80%) - "
                "note your Maths is slightly below. "
                "I recommend applying to options 1 and 2 as primary choices."
            )
        )

        metric = AnswerRelevancyMetric(threshold=0.7)
        assert_test(test_case, [metric])


# =============================================================================
# Semantic Similarity Tests
# =============================================================================

@pytest.mark.semantic
class TestSemanticSimilarity:
    """
    Test LLM outputs using semantic similarity matching.

    These tests validate output meaning without requiring exact
    string matches, making them more robust to variations in
    LLM responses.
    """

    def test_admission_requirements_similarity(self):
        """Test semantic matching of admission requirements."""
        expected = "UCT requires a minimum APS score of 30 points"
        actual = "The University of Cape Town needs at least thirty APS for admission"

        assert semantic_similarity(expected, actual, threshold=0.6), (
            f"Expected semantic similarity >= 0.6 between:\n"
            f"Expected: {expected}\n"
            f"Actual: {actual}"
        )

    def test_nsfas_threshold_similarity(self):
        """Test semantic matching of NSFAS threshold information."""
        expected = "NSFAS eligibility requires household income under R350,000"
        actual = (
            "To qualify for NSFAS, your family's combined income "
            "must be below three hundred and fifty thousand rand"
        )

        assert semantic_similarity(expected, actual, threshold=0.5), (
            "NSFAS threshold information should match semantically"
        )

    def test_document_requirements_similarity(self):
        """Test semantic matching of document requirements."""
        expected = "You need to submit your ID, matric certificate, and proof of residence"
        actual = (
            "Required documents include: identity document, "
            "matric results, and address verification"
        )

        assert semantic_similarity(expected, actual, threshold=0.5), (
            "Document requirements should match semantically"
        )


@pytest.mark.semantic
class TestSemanticSimilarityChecker:
    """
    Test the SemanticSimilarityChecker class for batch operations.
    """

    @pytest.fixture
    def checker(self):
        """Create a SemanticSimilarityChecker instance."""
        return SemanticSimilarityChecker()

    def test_find_most_similar_response(self, checker):
        """Test finding the most relevant response from candidates."""
        query = "What is the APS requirement for medicine?"

        candidates = [
            "The cafeteria serves lunch from 12pm to 2pm",
            "MBChB (Medicine) requires a minimum APS of 42",
            "The library is open 24 hours during exam period",
            "Student accommodation applications open in August",
        ]

        idx, text, score = checker.find_most_similar(query, candidates)

        assert idx == 1, f"Expected medicine-related response at index 1, got {idx}"
        assert "MBChB" in text or "Medicine" in text or "APS" in text
        assert score > 0.3, f"Expected similarity > 0.3, got {score}"

    def test_batch_similarity_scores(self, checker):
        """Test batch similarity calculation."""
        pairs = [
            ("UCT requires APS 30", "University of Cape Town needs 30 APS points"),
            ("Hello world", "Goodbye universe"),
            ("NSFAS provides funding", "National Student Financial Aid Scheme offers money"),
        ]

        scores = checker.batch_similarity(pairs)

        assert len(scores) == 3
        # First pair should be highly similar
        assert scores[0] > 0.5, f"Similar texts should score > 0.5, got {scores[0]}"
        # Second pair should be less similar
        assert scores[1] < scores[0], "Dissimilar texts should score lower"


# =============================================================================
# Combined Tests (DeepEval + Semantic Similarity)
# =============================================================================

@pytest.mark.llm
@pytest.mark.semantic
class TestAgentOutputValidation:
    """
    Combined validation tests using both DeepEval and semantic similarity.

    These tests demonstrate how to use both approaches together
    for comprehensive LLM output validation.
    """

    def test_response_contains_expected_info(self):
        """
        Validate that agent response contains semantically similar information.

        This test pattern is useful when you know what information should
        be in the response but the exact wording may vary.
        """
        # Simulated agent response
        agent_response = (
            "Based on your profile, you qualify for NSFAS funding. "
            "Your household income of R150,000 is well below the R350,000 threshold. "
            "Required documents include your ID, proof of income, and consent form."
        )

        expected_facts = [
            "eligible for NSFAS",
            "income below threshold",
            "ID document required",
        ]

        checker = SemanticSimilarityChecker()

        for fact in expected_facts:
            # Check if any sentence in the response is similar to the fact
            sentences = agent_response.split(". ")
            similarities = [checker.get_score(fact, s) for s in sentences]
            max_similarity = max(similarities)

            assert max_similarity > 0.3, (
                f"Expected fact '{fact}' not found in response. "
                f"Max similarity: {max_similarity}"
            )

    def test_no_hallucinated_information(self):
        """
        Check that agent response doesn't contain hallucinated info.

        This test verifies that the response doesn't claim things
        that aren't true about the application process.
        """
        agent_response = (
            "To apply to UCT, you need an APS score of at least 30. "
            "Applications open in April and close in September."
        )

        # Known incorrect statements that should NOT appear
        hallucinations = [
            "UCT requires a fee of R5000 to apply",  # False
            "Applications require a personal interview",  # Not always true
            "Only South African citizens can apply",  # False
        ]

        checker = SemanticSimilarityChecker()

        for hallucination in hallucinations:
            similarity = checker.get_score(agent_response, hallucination)
            assert similarity < 0.7, (
                f"Response may contain hallucinated information similar to: "
                f"'{hallucination}' (similarity: {similarity})"
            )
