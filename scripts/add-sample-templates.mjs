import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const { Client } = pg;

async function addSampleTemplates() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Get a user to be the author
    const { rows: users } = await client.query(`
      SELECT id, email FROM auth.users LIMIT 1
    `);

    if (users.length === 0) {
      console.log('No users found. Please create a user first.');
      return;
    }

    const authorId = users[0].id;
    console.log(`Using author: ${users[0].email}`);

    // Sample templates data
    const templates = [
      {
        title: 'SEO Blog Post Writer',
        description: 'Generate SEO-optimized blog posts with proper heading structure, meta description, and keyword integration',
        content: `Write a comprehensive, SEO-optimized blog post about {{topic}}.

Requirements:
- Target keyword: {{keyword}}
- Word count: {{word_count}} words
- Include an engaging meta description (155-160 characters)
- Use proper H1, H2, H3 heading structure
- Include {{number_of_sections}} main sections
- Natural keyword density (1-2%)
- Write in {{tone}} tone
- Include a compelling introduction and conclusion
- Add a call-to-action at the end

Format the output with clear headings and paragraphs.`,
        category: 'writing',
        tags: ['seo', 'blog', 'content', 'marketing'],
        use_case: 'Perfect for content marketers and bloggers who need to create search-engine optimized content quickly',
        recommended_models: ['gpt-4', 'claude-3-opus'],
        model_settings: { temperature: 0.7, max_tokens: 3000 }
      },
      {
        title: 'Product Description Generator',
        description: 'Create compelling e-commerce product descriptions that convert',
        content: `Create a compelling product description for {{product_name}}.

Product Details:
{{product_details}}

Target Audience: {{target_audience}}

Requirements:
- Highlight key features and benefits
- Use persuasive language
- Include technical specifications
- Address common customer concerns
- Add emotional appeal
- Keep it scannable with bullet points
- Include a strong call-to-action
- Optimize for {{platform}} (Amazon/Shopify/etc.)

Tone: {{tone}}
Length: {{length}} words`,
        category: 'sales',
        tags: ['e-commerce', 'product', 'copywriting', 'conversion'],
        use_case: 'Ideal for e-commerce businesses looking to improve product page conversions',
        recommended_models: ['gpt-4-turbo', 'claude-3-sonnet'],
        model_settings: { temperature: 0.8, max_tokens: 1500 }
      },
      {
        title: 'Code Review Assistant',
        description: 'Perform thorough code reviews with security, performance, and best practices analysis',
        content: `Please review the following code and provide detailed feedback.

Code:
\`\`\`{{language}}
{{code}}
\`\`\`

Review the code for:
1. Security vulnerabilities
2. Performance issues
3. Code quality and readability
4. Best practices for {{language}}
5. Potential bugs
6. Error handling
7. Documentation quality
8. Test coverage suggestions

Provide:
- Severity level for each issue (Critical/High/Medium/Low)
- Specific line numbers where applicable
- Suggested fixes with code examples
- Overall code quality score (1-10)

Focus area: {{focus_area}}`,
        category: 'code',
        tags: ['development', 'review', 'security', 'quality'],
        use_case: 'Essential for development teams doing code reviews and maintaining code quality',
        recommended_models: ['gpt-4', 'claude-3-opus'],
        model_settings: { temperature: 0.3, max_tokens: 2500 }
      },
      {
        title: 'Data Analysis Report',
        description: 'Transform raw data into insightful analysis reports with visualizations recommendations',
        content: `Analyze the following data and create a comprehensive report.

Dataset: {{dataset_description}}

Data:
{{data}}

Analysis Requirements:
1. Identify key trends and patterns
2. Calculate relevant statistics (mean, median, std dev, etc.)
3. Find correlations between variables
4. Detect any anomalies or outliers
5. Provide business insights
6. Suggest visualization types for each finding
7. Make data-driven recommendations

Output Format:
- Executive Summary
- Key Findings (with statistics)
- Detailed Analysis
- Visualization Recommendations
- Actionable Insights
- Next Steps

Industry Context: {{industry}}
Business Goal: {{goal}}`,
        category: 'data',
        tags: ['analysis', 'statistics', 'reporting', 'business-intelligence'],
        use_case: 'Perfect for data analysts and business intelligence professionals',
        recommended_models: ['gpt-4', 'claude-3-opus'],
        model_settings: { temperature: 0.5, max_tokens: 3000 }
      },
      {
        title: 'Email Campaign Creator',
        description: 'Design complete email marketing campaigns with subject lines, preview text, and CTAs',
        content: `Create a complete email marketing campaign for {{campaign_purpose}}.

Target Audience: {{audience}}
Brand Voice: {{brand_voice}}
Goal: {{campaign_goal}}

Create:
1. Subject Line (3 variations)
   - A/B test options
   - 30-50 characters
   - Include urgency/curiosity

2. Preview Text (2 variations)
   - 35-90 characters
   - Complement subject line

3. Email Body
   - Attention-grabbing opening
   - Value proposition
   - Social proof/testimonials
   - Clear benefits
   - Single clear CTA
   - P.S. section

4. CTA Button Text (2 variations)

5. Follow-up Email (sent 3 days later)

Include personalization tokens: [FirstName], [Company], [LastProduct]`,
        category: 'marketing',
        tags: ['email', 'campaign', 'marketing', 'conversion'],
        use_case: 'Essential for email marketers creating high-converting campaigns',
        recommended_models: ['gpt-4-turbo', 'claude-3-sonnet'],
        model_settings: { temperature: 0.8, max_tokens: 2000 }
      },
      {
        title: 'Customer Support Response',
        description: 'Generate professional, empathetic customer support responses',
        content: `Craft a professional customer support response.

Customer Issue: {{issue_description}}
Customer Sentiment: {{sentiment}} (angry/frustrated/neutral/happy)
Product/Service: {{product_service}}
Previous Interactions: {{previous_context}}

Response Requirements:
- Acknowledge the customer's concern
- Show empathy and understanding
- Provide a clear solution or next steps
- Include timeline if applicable
- Offer additional assistance
- Maintain {{brand_tone}} brand voice
- Keep it concise but thorough

Include:
- Personalized greeting
- Solution steps (numbered if multiple)
- Alternative options if available
- Follow-up commitment
- Professional closing

Special Instructions: {{special_instructions}}`,
        category: 'customer-service',
        tags: ['support', 'customer-service', 'communication'],
        use_case: 'Helps support teams maintain consistent, high-quality responses',
        recommended_models: ['gpt-3.5-turbo', 'claude-3-haiku'],
        model_settings: { temperature: 0.6, max_tokens: 1000 }
      },
      {
        title: 'Social Media Content Calendar',
        description: 'Plan a month of engaging social media content across multiple platforms',
        content: `Create a social media content calendar for {{brand_name}}.

Brand Description: {{brand_description}}
Target Audience: {{target_audience}}
Platforms: {{platforms}} (Instagram/Twitter/LinkedIn/TikTok)
Month: {{month}}

Generate 30 days of content including:
- Post caption/copy
- Hashtag sets (5-10 relevant hashtags)
- Content type (image/video/carousel/story)
- Best posting time
- Engagement strategy
- Visual description/requirements

Content Mix:
- 40% Value content (tips, how-tos)
- 30% Promotional
- 20% Community engagement
- 10% Behind-the-scenes

Include:
- Weekly themes
- Special days/holidays
- Trending topics integration
- Cross-platform adaptations

Brand Guidelines: {{guidelines}}`,
        category: 'marketing',
        tags: ['social-media', 'content-planning', 'marketing'],
        use_case: 'Perfect for social media managers planning content in advance',
        recommended_models: ['gpt-4', 'claude-3-sonnet'],
        model_settings: { temperature: 0.9, max_tokens: 4000 }
      },
      {
        title: 'Business Plan Generator',
        description: 'Create comprehensive business plans with market analysis and financial projections',
        content: `Create a comprehensive business plan for {{business_name}}.

Business Type: {{business_type}}
Industry: {{industry}}
Target Market: {{target_market}}
Initial Investment: {{investment}}

Include the following sections:

1. Executive Summary
   - Business concept
   - Mission statement
   - Key success factors
   - Financial highlights

2. Company Description
   - Legal structure
   - History and ownership
   - Products/services
   - Unique value proposition

3. Market Analysis
   - Industry overview
   - Target market demographics
   - Market size and growth
   - Competitive analysis
   - Market trends

4. Marketing & Sales Strategy
   - Marketing mix (4Ps)
   - Sales strategy
   - Pricing strategy
   - Promotion strategy

5. Operations Plan
   - Location and facilities
   - Technology requirements
   - Supply chain
   - Quality control

6. Management Team
   - Organizational structure
   - Key personnel
   - Advisory board

7. Financial Projections (3 years)
   - Revenue forecast
   - Expense budget
   - Cash flow statement
   - Break-even analysis
   - ROI projections

Additional Context: {{additional_context}}`,
        category: 'business',
        tags: ['business-plan', 'strategy', 'startup', 'planning'],
        use_case: 'Essential for entrepreneurs and business owners seeking funding or strategic planning',
        recommended_models: ['gpt-4', 'claude-3-opus'],
        model_settings: { temperature: 0.6, max_tokens: 5000 }
      },
      {
        title: 'Lesson Plan Creator',
        description: 'Design engaging lesson plans with learning objectives and assessment strategies',
        content: `Create a detailed lesson plan for {{subject}}.

Grade Level: {{grade_level}}
Topic: {{topic}}
Duration: {{duration}} minutes
Class Size: {{class_size}} students

Learning Objectives (3-4 specific, measurable goals):
{{learning_objectives}}

Include:

1. Introduction ({{intro_time}} minutes)
   - Hook/attention grabber
   - Connect to prior knowledge
   - State learning objectives

2. Main Activity ({{main_time}} minutes)
   - Step-by-step instructions
   - Interactive elements
   - Differentiation strategies
   - Group work components

3. Guided Practice
   - Examples with scaffolding
   - Check for understanding

4. Independent Practice
   - Individual tasks
   - Extension activities for fast finishers

5. Conclusion ({{conclusion_time}} minutes)
   - Summary of key points
   - Exit ticket questions
   - Preview next lesson

6. Assessment Methods
   - Formative assessment strategies
   - Summative assessment ideas
   - Success criteria

7. Materials Needed
   - Resources list
   - Technology requirements
   - Handouts/worksheets

8. Homework Assignment

Accommodation for: {{special_needs}}`,
        category: 'education',
        tags: ['education', 'teaching', 'lesson-planning'],
        use_case: 'Helps teachers create structured, engaging lessons efficiently',
        recommended_models: ['gpt-4', 'claude-3-sonnet'],
        model_settings: { temperature: 0.7, max_tokens: 2500 }
      },
      {
        title: 'API Documentation Writer',
        description: 'Generate clear, comprehensive API documentation with examples',
        content: `Create comprehensive API documentation for {{api_name}}.

Base URL: {{base_url}}
Authentication: {{auth_type}}

Endpoint Details:
{{endpoint_details}}

For each endpoint, document:

1. Endpoint Overview
   - HTTP Method
   - Path
   - Brief description
   - Authentication requirements

2. Request
   - Headers (required/optional)
   - Path parameters
   - Query parameters
   - Request body schema (JSON)
   - Validation rules

3. Response
   - Success response (200/201)
   - Response schema
   - Error responses (4xx/5xx)
   - Error codes and messages

4. Code Examples
   - cURL
   - JavaScript (fetch)
   - Python (requests)
   - {{additional_language}}

5. Rate Limiting
   - Limits per endpoint
   - Headers returned

6. Best Practices
   - Pagination handling
   - Error handling
   - Retry strategy

7. Changelog
   - Version history
   - Breaking changes
   - Deprecation notices

Additional Notes: {{additional_notes}}`,
        category: 'code',
        tags: ['api', 'documentation', 'technical-writing', 'development'],
        use_case: 'Critical for developers creating or maintaining API documentation',
        recommended_models: ['gpt-4', 'claude-3-opus'],
        model_settings: { temperature: 0.3, max_tokens: 3500 }
      }
    ];

    console.log(`\nAdding ${templates.length} sample templates...`);

    for (const template of templates) {
      // Generate slug
      const slug = `${template.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;

      try {
        const { rows } = await client.query(`
          INSERT INTO prompt_templates (
            title, description, content, category, tags, use_case,
            author_id, author_name, slug, visibility,
            recommended_models, model_settings, version,
            variables, is_featured
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
          ) RETURNING id
        `, [
          template.title,
          template.description,
          template.content,
          template.category,
          template.tags,
          template.use_case,
          authorId,
          'ROCQET Team',
          slug,
          'public',
          template.recommended_models,
          JSON.stringify(template.model_settings),
          '1.0.0',
          JSON.stringify(extractVariables(template.content)),
          Math.random() > 0.7 // 30% chance to be featured
        ]);

        console.log(`✓ Added template: ${template.title}`);

        // Add some initial likes and uses for popular templates
        if (Math.random() > 0.5) {
          const likes = Math.floor(Math.random() * 50) + 10;
          const uses = Math.floor(Math.random() * 100) + 20;
          
          await client.query(`
            UPDATE prompt_templates 
            SET likes_count = $1, uses_count = $2, views_count = $3
            WHERE id = $4
          `, [likes, uses, uses * 3, rows[0].id]);
        }
      } catch (error) {
        console.error(`Failed to add template "${template.title}":`, error.message);
      }
    }

    // Get statistics
    const { rows: stats } = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE is_featured = true) as featured
      FROM prompt_templates
    `);

    console.log(`\n✅ Template library populated!`);
    console.log(`   Total templates: ${stats[0].total}`);
    console.log(`   Featured templates: ${stats[0].featured}`);
    console.log(`\n🚀 Visit http://localhost:3000/templates to browse the template library!`);

  } catch (error) {
    console.error('Failed to add templates:', error);
  } finally {
    await client.end();
    console.log('✓ Database connection closed');
  }
}

function extractVariables(content) {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = [...content.matchAll(regex)];
  return [...new Set(matches.map(match => match[1].trim()))].map(name => ({
    name,
    description: '',
    default_value: ''
  }));
}

addSampleTemplates();