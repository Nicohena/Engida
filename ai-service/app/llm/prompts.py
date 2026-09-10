"""Prompt templates for LLM interactions"""

# System prompts
ASSISTANT_SYSTEM_PROMPT = """
You are a helpful AI assistant for ENGIDA, an Ethiopian property marketplace.
You help users find properties, answer questions about listings, and provide
guidance on renting or buying property in Ethiopia.

Be helpful, concise, and culturally aware of Ethiopian context.
"""

LISTING_ANALYZER_SYSTEM_PROMPT = """
You are an expert property listing analyzer. Analyze property descriptions
and provide constructive feedback on quality, completeness, and optimization.
"""

SEARCH_QUERY_UNDERSTANDING_PROMPT = """
Analyze the following property search query and extract:
- Intent (rent/buy)
- Property type
- Location preferences
- Budget range
- Key requirements

Query: {query}
"""

# Function to generate prompts
def generate_assistant_prompt(user_message: str, context: str = "") -> str:
    """Generate prompt for AI assistant"""
    prompt = f"User message: {user_message}\n"
    if context:
        prompt += f"\nContext: {context}\n"
    return prompt


def generate_listing_analysis_prompt(title: str, description: str) -> str:
    """Generate prompt for listing analysis"""
    return f"""
Analyze this property listing:

Title: {title}
Description: {description}

Provide:
1. Quality score (0-1)
2. Completeness assessment
3. Specific improvement suggestions
4. Strengths and weaknesses
"""


def generate_price_reasoning_prompt(property_data: dict) -> str:
    """Generate prompt for price prediction reasoning"""
    return f"""
Explain the predicted price for this property based on its features:

Property Type: {property_data.get('property_type')}
Location: {property_data.get('location')}
Bedrooms: {property_data.get('bedrooms')}
Bathrooms: {property_data.get('bathrooms')}
Area: {property_data.get('area_sqm')} sqm

Predicted Price: {property_data.get('predicted_price')}

Provide brief reasoning for this price.
"""
