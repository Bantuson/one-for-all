# Attack Surface Mapping for AI Systems

## Overview

Attack surface mapping identifies all potential entry points where an adversary could interact with or compromise an AI system.

## AI System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI System Attack Surface                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   INPUTS                    PROCESSING              OUTPUTS      │
│   ──────                    ──────────              ───────      │
│   ┌─────────┐              ┌─────────┐            ┌─────────┐  │
│   │User Text│──────────────▶│  LLM    │───────────▶│Response │  │
│   └─────────┘              └─────────┘            └─────────┘  │
│                                  │                              │
│   ┌─────────┐              ┌─────────┐            ┌─────────┐  │
│   │ Files   │──────────────▶│ RAG     │───────────▶│ Actions │  │
│   └─────────┘              │ Index   │            └─────────┘  │
│                            └─────────┘                          │
│   ┌─────────┐              ┌─────────┐            ┌─────────┐  │
│   │  APIs   │──────────────▶│ Tools   │───────────▶│  Data   │  │
│   └─────────┘              └─────────┘            └─────────┘  │
│                                                                  │
│   ATTACK VECTORS:                                                │
│   • Direct prompt injection    • Model extraction               │
│   • Indirect injection         • Data exfiltration              │
│   • Jailbreaking              • Denial of service               │
│   • Training data poisoning   • Tool misuse                     │
└─────────────────────────────────────────────────────────────────┘
```

## Entry Points Analysis

### User Input Layer

```python
"""
User input attack surface analysis.
"""

USER_INPUT_VECTORS = {
    "direct_text": {
        "description": "Text directly entered by users",
        "attack_types": [
            "Prompt injection",
            "Jailbreaking attempts",
            "Social engineering",
            "Encoding attacks"
        ],
        "risk_level": "High",
        "mitigations": [
            "Input validation",
            "Content filtering",
            "Rate limiting",
            "Session management"
        ]
    },

    "file_uploads": {
        "description": "Documents, images, or other files",
        "attack_types": [
            "Malicious file content",
            "Hidden instructions in metadata",
            "Steganography",
            "Format exploitation"
        ],
        "risk_level": "High",
        "mitigations": [
            "File type validation",
            "Content scanning",
            "Size limits",
            "Sandboxed processing"
        ]
    },

    "api_parameters": {
        "description": "API request parameters",
        "attack_types": [
            "Parameter injection",
            "Type confusion",
            "Overflow attacks"
        ],
        "risk_level": "Medium",
        "mitigations": [
            "Schema validation",
            "Type checking",
            "Input sanitization"
        ]
    },

    "conversation_history": {
        "description": "Multi-turn conversation context",
        "attack_types": [
            "Context manipulation",
            "History injection",
            "Gradual prompt extraction"
        ],
        "risk_level": "Medium",
        "mitigations": [
            "Context validation",
            "History limits",
            "Session isolation"
        ]
    }
}
```

### Data Layer

```python
"""
Data layer attack surface.
"""

DATA_VECTORS = {
    "training_data": {
        "description": "Data used to train/fine-tune models",
        "attack_types": [
            "Data poisoning",
            "Backdoor injection",
            "Label manipulation"
        ],
        "risk_level": "Critical",
        "mitigations": [
            "Data provenance tracking",
            "Anomaly detection",
            "Data validation",
            "Diverse data sources"
        ]
    },

    "rag_documents": {
        "description": "Documents in retrieval index",
        "attack_types": [
            "Indirect injection via documents",
            "Poisoned knowledge base",
            "Relevance manipulation"
        ],
        "risk_level": "High",
        "mitigations": [
            "Document scanning",
            "Source verification",
            "Content isolation",
            "Retrieval filtering"
        ]
    },

    "vector_embeddings": {
        "description": "Stored vector representations",
        "attack_types": [
            "Embedding inversion",
            "Similarity attacks",
            "Index poisoning"
        ],
        "risk_level": "Medium",
        "mitigations": [
            "Embedding encryption",
            "Access controls",
            "Anomaly detection"
        ]
    },

    "user_data": {
        "description": "Personal and sensitive user information",
        "attack_types": [
            "Data extraction",
            "Privacy leakage",
            "Cross-user contamination"
        ],
        "risk_level": "Critical",
        "mitigations": [
            "Data isolation",
            "Encryption",
            "Access logging",
            "PII detection"
        ]
    }
}
```

### Model Layer

```python
"""
Model layer attack surface.
"""

MODEL_VECTORS = {
    "model_weights": {
        "description": "Trained model parameters",
        "attack_types": [
            "Model extraction",
            "Weight stealing",
            "Adversarial model updates"
        ],
        "risk_level": "High",
        "mitigations": [
            "Access controls",
            "Model watermarking",
            "Query monitoring"
        ]
    },

    "inference_endpoint": {
        "description": "Model serving API",
        "attack_types": [
            "Denial of service",
            "Resource exhaustion",
            "Timing attacks"
        ],
        "risk_level": "High",
        "mitigations": [
            "Rate limiting",
            "Resource quotas",
            "Response time limits"
        ]
    },

    "system_prompts": {
        "description": "Hidden instructions configuring behavior",
        "attack_types": [
            "Prompt extraction",
            "Instruction override",
            "Behavior manipulation"
        ],
        "risk_level": "High",
        "mitigations": [
            "Prompt protection",
            "Instruction reinforcement",
            "Output filtering"
        ]
    }
}
```

### Tool/Action Layer

```python
"""
Tool and action layer attack surface.
"""

TOOL_VECTORS = {
    "code_execution": {
        "description": "Ability to run code",
        "attack_types": [
            "Code injection",
            "Command execution",
            "Sandbox escape"
        ],
        "risk_level": "Critical",
        "mitigations": [
            "Sandboxing",
            "Code review",
            "Execution limits",
            "Allowlists"
        ]
    },

    "api_calls": {
        "description": "External API integrations",
        "attack_types": [
            "SSRF attacks",
            "Credential theft",
            "Data exfiltration"
        ],
        "risk_level": "High",
        "mitigations": [
            "API allowlists",
            "Credential isolation",
            "Request validation"
        ]
    },

    "database_access": {
        "description": "Database queries and updates",
        "attack_types": [
            "SQL injection",
            "Data manipulation",
            "Unauthorized access"
        ],
        "risk_level": "Critical",
        "mitigations": [
            "Parameterized queries",
            "Access controls",
            "Query logging"
        ]
    },

    "file_system": {
        "description": "File read/write operations",
        "attack_types": [
            "Path traversal",
            "Unauthorized file access",
            "Malicious file creation"
        ],
        "risk_level": "High",
        "mitigations": [
            "Path validation",
            "Chroot jails",
            "File type restrictions"
        ]
    }
}
```

## Attack Surface Mapping Process

### Step 1: System Inventory

```python
"""
Create inventory of system components.
"""

def create_system_inventory():
    """Document all components of AI system."""
    return {
        "inputs": [
            {"name": "User chat interface", "type": "text", "public": True},
            {"name": "File upload", "type": "file", "public": True},
            {"name": "Admin API", "type": "api", "public": False},
        ],
        "processing": [
            {"name": "GPT-4 API", "type": "llm", "external": True},
            {"name": "RAG pipeline", "type": "retrieval", "external": False},
            {"name": "Tool executor", "type": "actions", "external": False},
        ],
        "outputs": [
            {"name": "Chat responses", "type": "text", "filtered": True},
            {"name": "Generated files", "type": "file", "filtered": False},
            {"name": "API responses", "type": "json", "filtered": True},
        ],
        "data_stores": [
            {"name": "Vector DB", "type": "embeddings", "sensitive": False},
            {"name": "User DB", "type": "relational", "sensitive": True},
            {"name": "Document store", "type": "files", "sensitive": True},
        ]
    }
```

### Step 2: Data Flow Mapping

```python
"""
Map data flows through the system.
"""

def map_data_flows():
    """Document how data moves through system."""
    return [
        {
            "flow": "User Query Processing",
            "steps": [
                {"step": 1, "action": "User enters query", "data": "raw text"},
                {"step": 2, "action": "Input validation", "data": "sanitized text"},
                {"step": 3, "action": "Context retrieval", "data": "query + documents"},
                {"step": 4, "action": "LLM inference", "data": "prompt + context"},
                {"step": 5, "action": "Output filtering", "data": "response"},
                {"step": 6, "action": "Return to user", "data": "filtered response"},
            ],
            "trust_boundaries": [1, 3, 4],  # Steps crossing trust boundaries
            "sensitive_data": [3, 4],  # Steps handling sensitive data
        },
        {
            "flow": "Document Ingestion",
            "steps": [
                {"step": 1, "action": "User uploads file", "data": "file bytes"},
                {"step": 2, "action": "File validation", "data": "validated file"},
                {"step": 3, "action": "Content extraction", "data": "text content"},
                {"step": 4, "action": "Embedding generation", "data": "vectors"},
                {"step": 5, "action": "Index storage", "data": "indexed vectors"},
            ],
            "trust_boundaries": [1, 2],
            "sensitive_data": [3, 5],
        }
    ]
```

### Step 3: Threat Identification

```python
"""
Identify threats for each component.
"""

STRIDE_THREATS = {
    "Spoofing": "Impersonating users or components",
    "Tampering": "Modifying data or code",
    "Repudiation": "Denying actions taken",
    "Information Disclosure": "Exposing sensitive data",
    "Denial of Service": "Making system unavailable",
    "Elevation of Privilege": "Gaining unauthorized access"
}


def identify_threats(component):
    """Identify STRIDE threats for component."""
    threats = []

    if component["type"] in ["text", "file"]:
        threats.extend([
            {"type": "Tampering", "threat": "Malicious input injection"},
            {"type": "Denial of Service", "threat": "Input flooding"},
        ])

    if component.get("public", False):
        threats.extend([
            {"type": "Spoofing", "threat": "Unauthenticated access"},
            {"type": "Information Disclosure", "threat": "Data extraction"},
        ])

    if component.get("sensitive", False):
        threats.extend([
            {"type": "Information Disclosure", "threat": "PII leakage"},
            {"type": "Tampering", "threat": "Data modification"},
        ])

    return threats
```

### Step 4: Risk Assessment

```python
"""
Assess risk for identified threats.
"""

def assess_risk(threat, component):
    """Calculate risk score."""

    # Likelihood factors
    likelihood_factors = {
        "public_facing": 1.5 if component.get("public") else 1.0,
        "external_data": 1.3 if component.get("external") else 1.0,
        "sensitive_data": 1.4 if component.get("sensitive") else 1.0,
    }

    # Impact factors
    impact_factors = {
        "Spoofing": 3,
        "Tampering": 4,
        "Repudiation": 2,
        "Information Disclosure": 4,
        "Denial of Service": 3,
        "Elevation of Privilege": 5,
    }

    likelihood = 3  # Base likelihood
    for factor, multiplier in likelihood_factors.items():
        likelihood *= multiplier

    impact = impact_factors.get(threat["type"], 3)

    risk_score = min(likelihood * impact, 25)  # Cap at 25

    risk_level = "Low"
    if risk_score >= 15:
        risk_level = "Critical"
    elif risk_score >= 10:
        risk_level = "High"
    elif risk_score >= 5:
        risk_level = "Medium"

    return {
        "threat": threat,
        "likelihood": likelihood,
        "impact": impact,
        "risk_score": risk_score,
        "risk_level": risk_level
    }
```

## Attack Surface Reduction

### Minimization Strategies

```python
"""
Attack surface reduction strategies.
"""

REDUCTION_STRATEGIES = {
    "input_minimization": {
        "principle": "Accept only necessary input types",
        "actions": [
            "Disable file uploads if not needed",
            "Limit input length",
            "Restrict character sets",
            "Disable multi-modal if text-only needed"
        ]
    },

    "tool_minimization": {
        "principle": "Enable only required tools",
        "actions": [
            "Disable code execution by default",
            "Use allowlists for APIs",
            "Remove unused integrations",
            "Limit database operations"
        ]
    },

    "data_minimization": {
        "principle": "Store and process minimum data",
        "actions": [
            "Don't persist conversation history",
            "Anonymize training data",
            "Limit RAG context window",
            "Regular data cleanup"
        ]
    },

    "access_minimization": {
        "principle": "Least privilege access",
        "actions": [
            "Role-based access control",
            "Time-limited sessions",
            "IP restrictions",
            "Multi-factor authentication"
        ]
    }
}
```

## Documentation Template

### Attack Surface Report

```markdown
# Attack Surface Report: [System Name]

## Executive Summary

- Total entry points: X
- Critical risks: Y
- Recommended priority fixes: Z

## Component Inventory

| Component | Type | Public | Sensitive | Risk Level |
| --------- | ---- | ------ | --------- | ---------- |
| ...       | ...  | ...    | ...       | ...        |

## Data Flows

[Diagram of data flows with trust boundaries marked]

## Identified Threats

| Threat | Component | STRIDE Type | Risk Score |
| ------ | --------- | ----------- | ---------- |
| ...    | ...       | ...         | ...        |

## Recommended Mitigations

1. [High priority mitigation]
2. [Medium priority mitigation]
3. [Low priority mitigation]

## Residual Risks

- Risks accepted and why
- Monitoring strategy for accepted risks
```

## Best Practices

1. **Regular updates** - Review attack surface quarterly
2. **Automated scanning** - Use tools to detect exposed endpoints
3. **Principle of least privilege** - Minimize permissions
4. **Defense in depth** - Multiple layers of protection
5. **Assume breach** - Design for resilience

## Next Steps

- [../02-prompt-injection/](../02-prompt-injection/) - Deep dive on injection attacks
- [../03-jailbreaking/](../03-jailbreaking/) - Jailbreak techniques
- [../05-defense-strategies/](../05-defense-strategies/) - Defensive measures
