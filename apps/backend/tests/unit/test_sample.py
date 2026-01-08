"""Sample unit test to demonstrate test structure."""
import pytest


@pytest.mark.unit
def test_sample_unit():
    """Sample unit test that always passes."""
    assert True


@pytest.mark.unit
def test_string_operations():
    """Test basic string operations."""
    text = "One For All"
    assert text.lower() == "one for all"
    assert text.upper() == "ONE FOR ALL"
    assert len(text) == 11
