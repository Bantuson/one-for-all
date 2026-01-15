"""
Reviewer Assistant Crew

A CrewAI Crew for answering reviewer questions about applications,
policies, and eligibility using RAG-powered context retrieval.
"""

import json
import logging
from datetime import datetime
from typing import Any, Optional

from crewai import Agent, Crew, Process, Task

from one_for_all.tools.policy_rag import (
    search_policies,
    get_admission_criteria,
    search_similar_courses,
)
from one_for_all.tools.comparative_analysis import (
    compare_applicant,
    get_application_summary,
    check_eligibility,
    get_missing_documents,
)

logger = logging.getLogger(__name__)


class ReviewerAssistantCrew:
    """
    A specialized crew for assisting admissions reviewers with Q&A.

    This crew uses RAG to find relevant policies and provides structured
    answers with citations. It can answer questions about:
    - Application eligibility
    - Course requirements
    - Document status
    - Comparative analysis with other applicants
    - Admission policies
    """

    def __init__(
        self,
        institution_id: Optional[str] = None,
        application_id: Optional[str] = None,
        course_id: Optional[str] = None,
    ):
        """
        Initialize the Reviewer Assistant Crew.

        Args:
            institution_id: Optional institution UUID for policy filtering
            application_id: Optional application UUID for context
            course_id: Optional course UUID for context
        """
        self.institution_id = institution_id
        self.application_id = application_id
        self.course_id = course_id

        # Configure agents
        self.policy_researcher = self._create_policy_researcher()
        self.application_analyst = self._create_application_analyst()
        self.response_synthesizer = self._create_response_synthesizer()

    def _create_policy_researcher(self) -> Agent:
        """Create the policy research agent."""
        return Agent(
            role="Policy Research Specialist",
            goal=(
                "Find and retrieve relevant admission policies, requirements, "
                "and guidelines to answer reviewer questions accurately."
            ),
            backstory=(
                "You are an expert at searching through policy documents and "
                "institutional guidelines. You use semantic search to find the "
                "most relevant information and always cite your sources."
            ),
            llm="deepseek/deepseek-chat",
            tools=[search_policies, get_admission_criteria, search_similar_courses],
            verbose=True,
            memory=False,
        )

    def _create_application_analyst(self) -> Agent:
        """Create the application analysis agent."""
        return Agent(
            role="Application Analysis Specialist",
            goal=(
                "Analyze application data, compare applicants, check eligibility, "
                "and provide data-driven insights for review decisions."
            ),
            backstory=(
                "You are skilled at analyzing student applications, comparing "
                "academic profiles, and determining eligibility. You provide "
                "clear, actionable recommendations based on data."
            ),
            llm="deepseek/deepseek-chat",
            tools=[
                compare_applicant,
                get_application_summary,
                check_eligibility,
                get_missing_documents,
            ],
            verbose=True,
            memory=False,
        )

    def _create_response_synthesizer(self) -> Agent:
        """Create the response synthesis agent."""
        return Agent(
            role="Response Synthesis Specialist",
            goal=(
                "Combine research and analysis results into clear, well-structured "
                "responses with proper citations and actionable recommendations."
            ),
            backstory=(
                "You excel at synthesizing information from multiple sources into "
                "coherent, professional responses. You ensure all claims are "
                "properly cited and recommendations are clear."
            ),
            llm="deepseek/deepseek-chat",
            tools=[],  # This agent synthesizes, doesn't need tools
            verbose=True,
            memory=False,
        )

    def _determine_question_type(self, question: str) -> str:
        """
        Determine the type of question being asked.

        Returns one of:
        - eligibility: Questions about whether an applicant qualifies
        - documents: Questions about missing or flagged documents
        - comparison: Questions about how an applicant compares
        - requirements: Questions about course requirements
        - policy: General policy questions
        - summary: Questions requesting application overview
        """
        question_lower = question.lower()

        if any(word in question_lower for word in ["eligible", "qualify", "meet", "conditional"]):
            return "eligibility"
        if any(word in question_lower for word in ["document", "missing", "upload", "flagged"]):
            return "documents"
        if any(word in question_lower for word in ["compare", "similar", "other applicants", "average"]):
            return "comparison"
        if any(word in question_lower for word in ["requirement", "aps", "minimum", "need", "subjects"]):
            return "requirements"
        if any(word in question_lower for word in ["summary", "overview", "status", "review"]):
            return "summary"

        return "policy"

    def _create_research_task(self, question: str, question_type: str) -> Task:
        """Create the research task based on question type."""
        context_info = []
        if self.institution_id:
            context_info.append(f"Institution ID: {self.institution_id}")
        if self.application_id:
            context_info.append(f"Application ID: {self.application_id}")
        if self.course_id:
            context_info.append(f"Course ID: {self.course_id}")

        context_str = "\n".join(context_info) if context_info else "No specific context provided"

        if question_type == "policy":
            description = f"""
            Search for relevant admission policies to answer this question:

            Question: {question}

            Context:
            {context_str}

            Use the search_policies tool to find relevant policy documents.
            If a course is specified, also use get_admission_criteria.

            Return the relevant policy information with source citations.
            """
        else:
            description = f"""
            Research admission requirements and policies related to:

            Question: {question}

            Context:
            {context_str}

            Use search_policies and get_admission_criteria to find relevant information.
            Focus on finding official requirements and guidelines.

            Return findings with proper source citations.
            """

        return Task(
            description=description,
            expected_output="JSON with relevant policies, requirements, and source citations",
            agent=self.policy_researcher,
        )

    def _create_analysis_task(self, question: str, question_type: str) -> Task:
        """Create the analysis task based on question type."""
        if question_type == "eligibility" and self.application_id and self.course_id:
            description = f"""
            Check eligibility for this application:

            Application ID: {self.application_id}
            Course ID: {self.course_id}

            Use check_eligibility to verify if the applicant meets requirements.
            Also use get_missing_documents to check document status.

            Provide a clear eligibility assessment.
            """
        elif question_type == "documents" and self.application_id:
            description = f"""
            Analyze document status for application: {self.application_id}

            Use get_missing_documents to identify:
            - Required documents
            - Missing documents
            - Flagged documents needing resubmission

            Provide a clear summary of document status.
            """
        elif question_type == "comparison" and self.application_id and self.course_id:
            description = f"""
            Compare this applicant to other accepted students:

            Application ID: {self.application_id}
            Course ID: {self.course_id}

            Use compare_applicant to analyze how this applicant's profile
            compares to previously accepted students.

            Provide comparison metrics and a recommendation.
            """
        elif question_type == "summary" and self.application_id:
            description = f"""
            Generate a comprehensive summary for application: {self.application_id}

            Use get_application_summary to retrieve all relevant details.
            Include applicant info, academic profile, course choices, and documents.

            Present a clear, organized overview.
            """
        else:
            description = f"""
            Analyze application data related to the question:

            Question: {question}
            Application ID: {self.application_id or 'Not specified'}
            Course ID: {self.course_id or 'Not specified'}

            Use available tools to gather relevant application data.
            If application/course IDs are missing, note what additional
            information would be needed.
            """

        return Task(
            description=description,
            expected_output="JSON with analysis results and recommendations",
            agent=self.application_analyst,
        )

    def _create_synthesis_task(self, question: str) -> Task:
        """Create the response synthesis task."""
        return Task(
            description=f"""
            Synthesize the research and analysis into a clear answer:

            Original Question: {question}

            Using the context from previous tasks:
            1. Combine policy information with application analysis
            2. Provide a direct answer to the question
            3. Include relevant citations and sources
            4. Add actionable recommendations where appropriate

            Format your response as a JSON object with:
            - answer: The main response text
            - citations: List of sources used
            - recommendations: List of suggested actions (if applicable)
            - confidence: High/Medium/Low based on available data
            """,
            expected_output="JSON with answer, citations, recommendations, and confidence",
            agent=self.response_synthesizer,
        )

    def answer_question(self, question: str) -> dict[str, Any]:
        """
        Answer a reviewer's question using RAG and analysis.

        Args:
            question: The question to answer

        Returns:
            Dictionary with:
            - answer: The response text
            - citations: Sources used
            - recommendations: Suggested actions
            - metadata: Processing information
        """
        logger.info(f"Processing question: {question[:100]}...")

        # Determine question type
        question_type = self._determine_question_type(question)
        logger.info(f"Question type: {question_type}")

        # Create tasks based on question type
        tasks = []

        # Always do research
        research_task = self._create_research_task(question, question_type)
        tasks.append(research_task)

        # Add analysis if we have context
        if self.application_id or self.course_id:
            analysis_task = self._create_analysis_task(question, question_type)
            tasks.append(analysis_task)

        # Always synthesize
        synthesis_task = self._create_synthesis_task(question)
        tasks.append(synthesis_task)

        # Create and run crew
        crew = Crew(
            agents=[
                self.policy_researcher,
                self.application_analyst,
                self.response_synthesizer,
            ],
            tasks=tasks,
            process=Process.sequential,
            verbose=True,
        )

        try:
            result = crew.kickoff()

            # Parse the result
            if isinstance(result, str):
                try:
                    parsed = json.loads(result)
                except json.JSONDecodeError:
                    parsed = {
                        "answer": result,
                        "citations": [],
                        "recommendations": [],
                        "confidence": "Medium",
                    }
            else:
                parsed = result if isinstance(result, dict) else {"answer": str(result)}

            return {
                "answer": parsed.get("answer", str(result)),
                "citations": parsed.get("citations", []),
                "recommendations": parsed.get("recommendations", []),
                "confidence": parsed.get("confidence", "Medium"),
                "metadata": {
                    "question_type": question_type,
                    "institution_id": self.institution_id,
                    "application_id": self.application_id,
                    "course_id": self.course_id,
                    "processed_at": datetime.now().isoformat(),
                },
            }

        except Exception as e:
            logger.error(f"Error processing question: {e}")
            return {
                "answer": f"I encountered an error while processing your question: {str(e)}",
                "citations": [],
                "recommendations": ["Please try rephrasing your question or provide more context."],
                "confidence": "Low",
                "metadata": {
                    "question_type": question_type,
                    "error": str(e),
                    "processed_at": datetime.now().isoformat(),
                },
            }


def run_reviewer_assistant(
    question: str,
    institution_id: Optional[str] = None,
    application_id: Optional[str] = None,
    course_id: Optional[str] = None,
) -> dict[str, Any]:
    """
    Convenience function to run the reviewer assistant.

    Args:
        question: The question to answer
        institution_id: Optional institution UUID
        application_id: Optional application UUID
        course_id: Optional course UUID

    Returns:
        Response dictionary with answer, citations, and recommendations
    """
    crew = ReviewerAssistantCrew(
        institution_id=institution_id,
        application_id=application_id,
        course_id=course_id,
    )
    return crew.answer_question(question)
