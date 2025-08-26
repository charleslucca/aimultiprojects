// Utility functions for optimized OpenAI API calls in Edge Functions

export interface OpenAIRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;
  temperature?: number;
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export const makeOptimizedOpenAICall = async (
  apiKey: string,
  request: OpenAIRequest,
  timeoutMs: number = 20000
): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        // Use faster models when possible
        model: request.model === 'gpt-4o-mini' ? 'gpt-4o-mini' : request.model,
        // Optimize for speed
        temperature: request.temperature ?? 0.3,
        max_tokens: Math.min(request.max_tokens ?? 1500, 1500), // Limit tokens for speed
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const aiResponse: OpenAIResponse = await response.json();
    let content = aiResponse.choices[0].message.content;

    // Remove markdown formatting if present
    if (content.includes('```json')) {
      content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    }

    return content;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`OpenAI request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
};

export const createBatchAnalysisPrompt = (issues: any[], analysisType: 'sla_risk' | 'sentiment') => {
  if (analysisType === 'sla_risk') {
    return `
    Analyze these Jira issues for SLA breach risk in batch. Respond with a JSON array where each object has an "issue_id" and analysis:

    Issues:
    ${issues.map(issue => `
    ID: ${issue.id}
    Key: ${issue.jira_key}
    Summary: ${issue.summary}
    Type: ${issue.issue_type}
    Priority: ${issue.priority}
    Status: ${issue.status}
    Created: ${issue.created_date}
    Story Points: ${issue.story_points}
    `).join('\n---\n')}

    For each issue provide: risk_score (0-1), risk_factors (array), recommendations (array), estimated_completion_days.
    
    Response format: [{"issue_id": "id", "risk_score": 0.7, "risk_factors": ["..."], "recommendations": ["..."], "estimated_completion_days": 3}]
    `;
  }

  return ''; // Add other batch analysis types as needed
};