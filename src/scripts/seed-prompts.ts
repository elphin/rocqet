import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Use anon key since we don't have service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const promptTemplates = [
  // Personal Productivity
  {
    name: "Daily Planning Assistant",
    slug: "daily-planning-assistant",
    description: "Help me plan my day effectively based on priorities and energy levels",
    content: "I need help planning my day. Here are my tasks:\n{{tasks}}\n\nMy energy is typically highest at: {{peak_hours}}\n\nPlease organize these tasks by priority and suggest an optimal schedule, considering:\n1. Task dependencies\n2. Energy requirements\n3. Buffer time between tasks\n4. Breaks for sustainability",
    is_public: true,
    usage_count: 145
  },
  {
    name: "Weekly Review Template",
    slug: "weekly-review-template",
    description: "Conduct a comprehensive weekly review to track progress and plan ahead",
    content: "Help me conduct my weekly review:\n\nAccomplishments this week:\n{{accomplishments}}\n\nChallenges faced:\n{{challenges}}\n\nGoals for next week:\n{{next_week_goals}}\n\nPlease provide:\n1. Analysis of my accomplishments vs planned goals\n2. Lessons learned from challenges\n3. Suggestions for next week's priorities\n4. Areas for improvement",
    is_public: true,
    usage_count: 89
  },
  {
    name: "Habit Tracker Analysis",
    slug: "habit-tracker-analysis",
    description: "Analyze habit tracking data and provide insights for improvement",
    content: "Analyze my habit tracking data:\n\nHabit: {{habit_name}}\nGoal: {{habit_goal}}\nActual performance: {{performance_data}}\nDuration: {{tracking_period}}\n\nProvide:\n1. Success rate analysis\n2. Pattern identification\n3. Obstacles and solutions\n4. Recommendations for improvement",
    category: "personal",
    tags: ["habits", "tracking", "self-improvement", "analysis"],
    is_public: true,
    usage_count: 67
  },

  // Business & Marketing
  {
    name: "LinkedIn Post Generator",
    slug: "linkedin-post-generator",
    description: "Create engaging LinkedIn posts that drive professional engagement",
    content: "Create a LinkedIn post about:\n\nTopic: {{topic}}\nKey message: {{key_message}}\nTarget audience: {{audience}}\nTone: {{tone}}\n\nThe post should:\n1. Start with a hook\n2. Provide value or insights\n3. Include a clear call-to-action\n4. Use appropriate hashtags\n5. Be optimized for LinkedIn's algorithm",
    category: "marketing",
    tags: ["linkedin", "social-media", "content", "professional"],
    is_public: true,
    usage_count: 234
  },
  {
    name: "Email Campaign Optimizer",
    slug: "email-campaign-optimizer",
    description: "Optimize email campaigns for better open rates and conversions",
    content: "Optimize this email campaign:\n\nSubject line: {{subject_line}}\nTarget audience: {{audience}}\nGoal: {{campaign_goal}}\nCurrent metrics: {{current_metrics}}\n\nProvide:\n1. 3 alternative subject lines with predicted open rates\n2. Email structure improvements\n3. CTA optimization suggestions\n4. A/B testing recommendations\n5. Personalization opportunities",
    category: "marketing",
    tags: ["email", "marketing", "optimization", "campaigns"],
    is_public: true,
    usage_count: 156
  },
  {
    name: "Product Launch Strategy",
    slug: "product-launch-strategy",
    description: "Develop a comprehensive product launch strategy",
    content: "Create a product launch strategy for:\n\nProduct: {{product_name}}\nTarget market: {{target_market}}\nUnique value proposition: {{uvp}}\nBudget: {{budget}}\nTimeline: {{timeline}}\n\nInclude:\n1. Pre-launch activities\n2. Launch day plan\n3. Marketing channels and tactics\n4. Success metrics\n5. Post-launch follow-up strategy",
    category: "business",
    tags: ["product", "launch", "strategy", "marketing"],
    is_public: true,
    usage_count: 98
  },
  {
    name: "Competitive Analysis Framework",
    slug: "competitive-analysis-framework",
    description: "Conduct thorough competitive analysis for strategic planning",
    content: "Conduct a competitive analysis:\n\nOur company: {{company_name}}\nMain competitors: {{competitors}}\nIndustry: {{industry}}\nKey metrics to analyze: {{metrics}}\n\nProvide:\n1. SWOT analysis for each competitor\n2. Market positioning map\n3. Competitive advantages and gaps\n4. Strategic recommendations\n5. Potential partnership or acquisition targets",
    category: "business",
    tags: ["analysis", "competition", "strategy", "business"],
    is_public: true,
    usage_count: 112
  },

  // Technical & Development
  {
    name: "Code Review Checklist",
    slug: "code-review-checklist",
    description: "Comprehensive code review with best practices and security checks",
    content: "Review this code:\n\n```{{programming_language}}\n{{code}}\n```\n\nProject context: {{context}}\n\nPlease check for:\n1. Code quality and readability\n2. Performance optimizations\n3. Security vulnerabilities\n4. Best practices adherence\n5. Test coverage recommendations\n6. Documentation needs\n7. Potential edge cases",
    category: "technical",
    tags: ["code-review", "development", "quality", "technical"],
    is_public: true,
    usage_count: 287
  },
  {
    name: "API Documentation Generator",
    slug: "api-documentation-generator",
    description: "Generate comprehensive API documentation from endpoints",
    content: "Generate API documentation for:\n\nEndpoint: {{endpoint}}\nMethod: {{http_method}}\nRequest body: {{request_body}}\nResponse format: {{response_format}}\nAuthentication: {{auth_type}}\n\nInclude:\n1. Clear endpoint description\n2. Request/response examples\n3. Error codes and handling\n4. Rate limiting information\n5. SDK code examples in multiple languages",
    category: "technical",
    tags: ["api", "documentation", "technical", "development"],
    is_public: true,
    usage_count: 203
  },
  {
    name: "Database Schema Designer",
    slug: "database-schema-designer",
    description: "Design optimal database schemas with relationships and indexes",
    content: "Design a database schema for:\n\nApplication type: {{app_type}}\nMain entities: {{entities}}\nExpected scale: {{scale}}\nDatabase type: {{db_type}}\n\nProvide:\n1. Complete schema with tables and relationships\n2. Index recommendations\n3. Normalization analysis\n4. Performance considerations\n5. Migration strategy from current setup",
    category: "technical",
    tags: ["database", "schema", "architecture", "technical"],
    is_public: true,
    usage_count: 145
  },
  {
    name: "Bug Report Analyzer",
    slug: "bug-report-analyzer",
    description: "Analyze bug reports and suggest fixes with priority ranking",
    content: "Analyze this bug report:\n\nTitle: {{bug_title}}\nDescription: {{bug_description}}\nSteps to reproduce: {{reproduction_steps}}\nExpected behavior: {{expected}}\nActual behavior: {{actual}}\nEnvironment: {{environment}}\n\nProvide:\n1. Root cause analysis\n2. Severity assessment\n3. Potential fixes\n4. Testing recommendations\n5. Prevention strategies",
    category: "technical",
    tags: ["bugs", "debugging", "analysis", "technical"],
    is_public: true,
    usage_count: 167
  },

  // Creative & Content
  {
    name: "Blog Post Outline Creator",
    slug: "blog-post-outline-creator",
    description: "Create detailed blog post outlines with SEO optimization",
    content: "Create a blog post outline for:\n\nTopic: {{topic}}\nTarget audience: {{audience}}\nPrimary keyword: {{primary_keyword}}\nSecondary keywords: {{secondary_keywords}}\nDesired word count: {{word_count}}\n\nInclude:\n1. Compelling title options\n2. Introduction hook\n3. Main sections with subheadings\n4. Key points for each section\n5. Conclusion with CTA\n6. Meta description\n7. Internal linking opportunities",
    category: "content",
    tags: ["blog", "content", "seo", "writing"],
    is_public: true,
    usage_count: 312
  },
  {
    name: "Video Script Writer",
    slug: "video-script-writer",
    description: "Write engaging video scripts for YouTube, TikTok, or presentations",
    content: "Write a video script for:\n\nPlatform: {{platform}}\nTopic: {{topic}}\nDuration: {{duration}}\nTone: {{tone}}\nKey points: {{key_points}}\n\nInclude:\n1. Attention-grabbing hook (first 3 seconds)\n2. Clear structure with timestamps\n3. Engaging transitions\n4. Call-to-action placement\n5. B-roll suggestions\n6. Caption/text overlay notes",
    category: "creative",
    tags: ["video", "script", "content", "creative"],
    is_public: true,
    usage_count: 198
  },
  {
    name: "Podcast Episode Planner",
    slug: "podcast-episode-planner",
    description: "Plan engaging podcast episodes with detailed show notes",
    content: "Plan a podcast episode:\n\nEpisode title: {{title}}\nGuest (if any): {{guest}}\nMain topic: {{topic}}\nEpisode length: {{length}}\nTarget audience: {{audience}}\n\nCreate:\n1. Episode outline with timestamps\n2. Interview questions (if applicable)\n3. Key talking points\n4. Show notes with resources\n5. Social media promotion snippets\n6. SEO-optimized description",
    category: "creative",
    tags: ["podcast", "content", "planning", "media"],
    is_public: true,
    usage_count: 89
  },

  // Corporate & Enterprise
  {
    name: "Executive Summary Generator",
    slug: "executive-summary-generator",
    description: "Create concise executive summaries for reports and proposals",
    content: "Create an executive summary for:\n\nDocument type: {{doc_type}}\nMain topic: {{topic}}\nKey findings: {{findings}}\nRecommendations: {{recommendations}}\nTarget audience: {{audience}}\n\nThe summary should:\n1. Be under 2 pages\n2. Highlight critical insights\n3. Include actionable recommendations\n4. Use clear, C-suite appropriate language\n5. Include key metrics and ROI",
    category: "corporate",
    tags: ["executive", "summary", "business", "reports"],
    is_public: true,
    usage_count: 234
  },
  {
    name: "Meeting Minutes Formatter",
    slug: "meeting-minutes-formatter",
    description: "Transform meeting notes into professional minutes with action items",
    content: "Format these meeting notes:\n\nMeeting date: {{date}}\nAttendees: {{attendees}}\nAgenda: {{agenda}}\nRaw notes: {{notes}}\n\nCreate:\n1. Professional meeting minutes\n2. Clear action items with owners and deadlines\n3. Key decisions made\n4. Topics for follow-up\n5. Next meeting agenda items",
    category: "corporate",
    tags: ["meetings", "minutes", "documentation", "corporate"],
    is_public: true,
    usage_count: 178
  },
  {
    name: "Quarterly Business Review",
    slug: "quarterly-business-review",
    description: "Prepare comprehensive QBR presentations with insights and strategy",
    content: "Prepare a QBR for:\n\nQuarter: {{quarter}}\nKey metrics: {{metrics}}\nGoals achieved: {{achievements}}\nChallenges: {{challenges}}\nNext quarter targets: {{targets}}\n\nInclude:\n1. Performance dashboard\n2. Wins and learnings\n3. Competitive landscape update\n4. Strategic initiatives progress\n5. Resource requirements\n6. Risk assessment\n7. Q&A preparation",
    category: "corporate",
    tags: ["qbr", "review", "corporate", "strategy"],
    is_public: true,
    usage_count: 145
  },
  {
    name: "Change Management Plan",
    slug: "change-management-plan",
    description: "Develop change management strategies for organizational transformation",
    content: "Create a change management plan for:\n\nChange initiative: {{initiative}}\nAffected departments: {{departments}}\nTimeline: {{timeline}}\nKey stakeholders: {{stakeholders}}\nCurrent state: {{current_state}}\nDesired state: {{desired_state}}\n\nInclude:\n1. Impact assessment\n2. Communication strategy\n3. Training requirements\n4. Resistance mitigation\n5. Success metrics\n6. Rollout phases",
    category: "corporate",
    tags: ["change-management", "strategy", "corporate", "transformation"],
    is_public: true,
    usage_count: 98
  },

  // Sales & Customer Success
  {
    name: "Sales Pitch Customizer",
    slug: "sales-pitch-customizer",
    description: "Customize sales pitches for specific prospects and industries",
    content: "Customize a sales pitch for:\n\nProspect company: {{company}}\nIndustry: {{industry}}\nPain points: {{pain_points}}\nOur solution: {{solution}}\nCompetitors they use: {{competitors}}\nBudget range: {{budget}}\n\nCreate:\n1. Personalized opening\n2. Problem-solution fit\n3. ROI calculation\n4. Competitive differentiation\n5. Social proof relevant to their industry\n6. Clear next steps",
    category: "sales",
    tags: ["sales", "pitch", "b2b", "customization"],
    is_public: true,
    usage_count: 256
  },
  {
    name: "Customer Success Playbook",
    slug: "customer-success-playbook",
    description: "Create customer success strategies for different lifecycle stages",
    content: "Create a customer success playbook for:\n\nCustomer segment: {{segment}}\nProduct/Service: {{product}}\nCustomer lifecycle stage: {{stage}}\nCommon challenges: {{challenges}}\nSuccess metrics: {{metrics}}\n\nInclude:\n1. Onboarding checklist\n2. Success milestones\n3. Engagement strategies\n4. Upsell opportunities\n5. Churn prevention tactics\n6. Quarterly review templates",
    category: "sales",
    tags: ["customer-success", "retention", "strategy", "b2b"],
    is_public: true,
    usage_count: 167
  },
  {
    name: "Win/Loss Analysis",
    slug: "win-loss-analysis",
    description: "Analyze sales wins and losses to improve conversion rates",
    content: "Analyze this sales outcome:\n\nDeal status: {{status}}\nCompany: {{company}}\nDeal size: {{deal_size}}\nSales cycle length: {{cycle_length}}\nKey interactions: {{interactions}}\nCompetitors involved: {{competitors}}\nDecision factors: {{factors}}\n\nProvide:\n1. Root cause analysis\n2. Improvement recommendations\n3. Competitive insights\n4. Process optimization suggestions\n5. Team training needs",
    category: "sales",
    tags: ["analysis", "sales", "improvement", "strategy"],
    is_public: true,
    usage_count: 134
  },

  // HR & Recruitment
  {
    name: "Job Description Optimizer",
    slug: "job-description-optimizer",
    description: "Create compelling job descriptions that attract top talent",
    content: "Optimize this job description:\n\nRole: {{role_title}}\nDepartment: {{department}}\nKey responsibilities: {{responsibilities}}\nRequired skills: {{required_skills}}\nNice-to-have skills: {{nice_to_have}}\nCompany culture: {{culture}}\n\nCreate:\n1. Engaging job title\n2. Compelling company introduction\n3. Clear role description\n4. Structured requirements\n5. Benefits and perks highlight\n6. Inclusive language check\n7. SEO optimization for job boards",
    category: "hr",
    tags: ["recruitment", "hr", "job-description", "hiring"],
    is_public: true,
    usage_count: 189
  },
  {
    name: "Performance Review Template",
    slug: "performance-review-template",
    description: "Structure comprehensive and fair performance reviews",
    content: "Create a performance review for:\n\nEmployee role: {{role}}\nReview period: {{period}}\nKey achievements: {{achievements}}\nAreas for improvement: {{improvements}}\nGoals for next period: {{goals}}\n\nInclude:\n1. Objective performance assessment\n2. Competency evaluation\n3. Goal achievement analysis\n4. Development recommendations\n5. Career path discussion\n6. Constructive feedback examples",
    category: "hr",
    tags: ["performance", "review", "hr", "management"],
    is_public: true,
    usage_count: 156
  },
  {
    name: "Interview Question Bank",
    slug: "interview-question-bank",
    description: "Generate role-specific interview questions with evaluation criteria",
    content: "Generate interview questions for:\n\nRole: {{role}}\nSeniority level: {{level}}\nKey skills to assess: {{skills}}\nCompany values: {{values}}\nTeam dynamics: {{team_dynamics}}\n\nProvide:\n1. Technical/skill questions\n2. Behavioral questions (STAR format)\n3. Culture fit questions\n4. Situational questions\n5. Evaluation rubric\n6. Red flags to watch for",
    category: "hr",
    tags: ["interview", "recruitment", "hr", "hiring"],
    is_public: true,
    usage_count: 223
  },

  // Finance & Analytics
  {
    name: "Financial Report Narrator",
    slug: "financial-report-narrator",
    description: "Transform financial data into clear narrative reports",
    content: "Create a narrative report from:\n\nPeriod: {{period}}\nRevenue: {{revenue}}\nExpenses: {{expenses}}\nProfit margin: {{margin}}\nKey metrics: {{metrics}}\nYoY comparison: {{yoy_data}}\n\nInclude:\n1. Executive summary\n2. Performance highlights\n3. Trend analysis\n4. Variance explanations\n5. Forward-looking statements\n6. Risk factors\n7. Recommendations",
    category: "finance",
    tags: ["finance", "reporting", "analytics", "business"],
    is_public: true,
    usage_count: 198
  },
  {
    name: "Budget Proposal Builder",
    slug: "budget-proposal-builder",
    description: "Create detailed budget proposals with justifications",
    content: "Build a budget proposal for:\n\nDepartment/Project: {{department}}\nTotal budget requested: {{total_budget}}\nMain categories: {{categories}}\nStrategic objectives: {{objectives}}\nROI expectations: {{roi}}\n\nInclude:\n1. Budget breakdown\n2. Cost justifications\n3. ROI calculations\n4. Risk assessment\n5. Alternative scenarios\n6. Approval criteria\n7. Timeline and milestones",
    category: "finance",
    tags: ["budget", "finance", "planning", "proposal"],
    is_public: true,
    usage_count: 145
  },
  {
    name: "KPI Dashboard Designer",
    slug: "kpi-dashboard-designer",
    description: "Design KPI dashboards with meaningful metrics and visualizations",
    content: "Design a KPI dashboard for:\n\nDepartment: {{department}}\nKey objectives: {{objectives}}\nAvailable data sources: {{data_sources}}\nStakeholders: {{stakeholders}}\nReporting frequency: {{frequency}}\n\nProvide:\n1. Primary KPIs selection\n2. Secondary metrics\n3. Visualization recommendations\n4. Data refresh strategy\n5. Drill-down capabilities\n6. Alert thresholds\n7. Mobile responsiveness considerations",
    category: "analytics",
    tags: ["kpi", "dashboard", "analytics", "metrics"],
    is_public: true,
    usage_count: 178
  },

  // Legal & Compliance
  {
    name: "Contract Review Assistant",
    slug: "contract-review-assistant",
    description: "Review contracts for key terms, risks, and negotiation points",
    content: "Review this contract:\n\nContract type: {{contract_type}}\nParties involved: {{parties}}\nKey terms: {{key_terms}}\nContract value: {{value}}\nDuration: {{duration}}\n\nAnalyze:\n1. Risk assessment\n2. Unfavorable clauses\n3. Missing protections\n4. Negotiation opportunities\n5. Compliance requirements\n6. Termination conditions\n7. Liability limitations",
    category: "legal",
    tags: ["legal", "contract", "review", "compliance"],
    is_public: false,
    usage_count: 234
  },
  {
    name: "Privacy Policy Generator",
    slug: "privacy-policy-generator",
    description: "Generate GDPR and CCPA compliant privacy policies",
    content: "Generate a privacy policy for:\n\nCompany: {{company_name}}\nWebsite: {{website}}\nData collected: {{data_types}}\nThird-party services: {{third_parties}}\nJurisdictions: {{jurisdictions}}\n\nInclude:\n1. Data collection practices\n2. Usage and sharing\n3. User rights\n4. Cookie policy\n5. Data retention\n6. Security measures\n7. Contact information\n8. Update procedures",
    category: "legal",
    tags: ["privacy", "gdpr", "compliance", "legal"],
    is_public: true,
    usage_count: 167
  },
  {
    name: "Compliance Checklist Creator",
    slug: "compliance-checklist-creator",
    description: "Create industry-specific compliance checklists and audit preparations",
    content: "Create a compliance checklist for:\n\nIndustry: {{industry}}\nRegulations: {{regulations}}\nCompany size: {{size}}\nOperating regions: {{regions}}\nAudit type: {{audit_type}}\n\nProvide:\n1. Required documentation\n2. Process requirements\n3. Timeline for compliance\n4. Responsible parties\n5. Common violations\n6. Best practices\n7. Audit preparation tips",
    category: "legal",
    tags: ["compliance", "audit", "regulations", "checklist"],
    is_public: true,
    usage_count: 145
  },

  // Education & Training
  {
    name: "Course Curriculum Designer",
    slug: "course-curriculum-designer",
    description: "Design comprehensive course curricula with learning objectives",
    content: "Design a curriculum for:\n\nCourse title: {{title}}\nTarget audience: {{audience}}\nDuration: {{duration}}\nLearning objectives: {{objectives}}\nPrerequisites: {{prerequisites}}\n\nCreate:\n1. Module breakdown\n2. Learning outcomes per module\n3. Assessment strategies\n4. Resource requirements\n5. Interactive activities\n6. Project assignments\n7. Grading rubric",
    category: "education",
    tags: ["education", "curriculum", "training", "course"],
    is_public: true,
    usage_count: 189
  },
  {
    name: "Workshop Facilitator Guide",
    slug: "workshop-facilitator-guide",
    description: "Create detailed facilitator guides for interactive workshops",
    content: "Create a facilitator guide for:\n\nWorkshop topic: {{topic}}\nDuration: {{duration}}\nGroup size: {{group_size}}\nLearning objectives: {{objectives}}\nMaterials available: {{materials}}\n\nInclude:\n1. Detailed agenda with timings\n2. Icebreaker activities\n3. Main exercises\n4. Discussion prompts\n5. Breakout group instructions\n6. Debrief questions\n7. Follow-up actions",
    category: "education",
    tags: ["workshop", "training", "facilitation", "education"],
    is_public: true,
    usage_count: 156
  },
  {
    name: "Learning Assessment Builder",
    slug: "learning-assessment-builder",
    description: "Create effective assessments to measure learning outcomes",
    content: "Build an assessment for:\n\nSubject: {{subject}}\nLearning level: {{level}}\nAssessment type: {{type}}\nDuration: {{duration}}\nLearning objectives: {{objectives}}\n\nCreate:\n1. Question variety (multiple choice, essay, practical)\n2. Difficulty progression\n3. Answer key with explanations\n4. Grading criteria\n5. Time allocations\n6. Accommodations needed\n7. Retake policy",
    category: "education",
    tags: ["assessment", "testing", "education", "evaluation"],
    is_public: true,
    usage_count: 134
  },

  // Research & Analysis
  {
    name: "Literature Review Synthesizer",
    slug: "literature-review-synthesizer",
    description: "Synthesize research papers into comprehensive literature reviews",
    content: "Synthesize a literature review on:\n\nTopic: {{topic}}\nKey papers: {{papers}}\nResearch question: {{question}}\nScope: {{scope}}\nMethodology focus: {{methodology}}\n\nProvide:\n1. Thematic organization\n2. Key findings summary\n3. Methodological comparisons\n4. Research gaps identified\n5. Contradictions and debates\n6. Future research directions\n7. Theoretical framework",
    category: "research",
    tags: ["research", "literature-review", "academic", "analysis"],
    is_public: true,
    usage_count: 167
  },
  {
    name: "Survey Question Designer",
    slug: "survey-question-designer",
    description: "Design effective survey questions with statistical validity",
    content: "Design survey questions for:\n\nResearch objective: {{objective}}\nTarget population: {{population}}\nSample size: {{sample_size}}\nSurvey method: {{method}}\nKey variables: {{variables}}\n\nCreate:\n1. Demographic questions\n2. Likert scale items\n3. Open-ended questions\n4. Skip logic recommendations\n5. Validity checks\n6. Pilot testing plan\n7. Analysis framework",
    category: "research",
    tags: ["survey", "research", "data-collection", "methodology"],
    is_public: true,
    usage_count: 145
  },
  {
    name: "Data Analysis Interpreter",
    slug: "data-analysis-interpreter",
    description: "Interpret statistical results and create actionable insights",
    content: "Interpret these analysis results:\n\nAnalysis type: {{analysis_type}}\nKey findings: {{findings}}\nStatistical values: {{statistics}}\nSample size: {{sample_size}}\nBusiness context: {{context}}\n\nProvide:\n1. Plain English interpretation\n2. Statistical significance explanation\n3. Practical implications\n4. Limitations and caveats\n5. Visualization recommendations\n6. Next steps for analysis\n7. Executive summary",
    category: "research",
    tags: ["data", "analysis", "statistics", "insights"],
    is_public: true,
    usage_count: 198
  },

  // Project Management
  {
    name: "Project Charter Creator",
    slug: "project-charter-creator",
    description: "Create comprehensive project charters for stakeholder alignment",
    content: "Create a project charter for:\n\nProject name: {{name}}\nBusiness case: {{business_case}}\nScope: {{scope}}\nStakeholders: {{stakeholders}}\nBudget: {{budget}}\nTimeline: {{timeline}}\n\nInclude:\n1. Project objectives\n2. Deliverables and milestones\n3. Success criteria\n4. Roles and responsibilities\n5. Risk assessment\n6. Communication plan\n7. Approval requirements",
    category: "project-management",
    tags: ["project", "charter", "planning", "management"],
    is_public: true,
    usage_count: 234
  },
  {
    name: "Sprint Retrospective Facilitator",
    slug: "sprint-retrospective-facilitator",
    description: "Facilitate effective sprint retrospectives with actionable outcomes",
    content: "Facilitate a retrospective for:\n\nSprint number: {{sprint_number}}\nTeam size: {{team_size}}\nSprint goals: {{goals}}\nCompleted items: {{completed}}\nIncomplete items: {{incomplete}}\n\nStructure:\n1. What went well\n2. What didn't go well\n3. Root cause analysis\n4. Action items with owners\n5. Process improvements\n6. Team health check\n7. Celebration moments",
    category: "project-management",
    tags: ["agile", "retrospective", "scrum", "team"],
    is_public: true,
    usage_count: 189
  },
  {
    name: "Risk Management Matrix",
    slug: "risk-management-matrix",
    description: "Build comprehensive risk management matrices with mitigation strategies",
    content: "Create a risk matrix for:\n\nProject: {{project}}\nProject phase: {{phase}}\nKey dependencies: {{dependencies}}\nConstraints: {{constraints}}\nStakeholder concerns: {{concerns}}\n\nProvide:\n1. Risk identification\n2. Probability assessment\n3. Impact analysis\n4. Risk scoring\n5. Mitigation strategies\n6. Contingency plans\n7. Risk owners\n8. Monitoring approach",
    category: "project-management",
    tags: ["risk", "management", "project", "planning"],
    is_public: true,
    usage_count: 167
  },

  // Customer Service
  {
    name: "Customer Complaint Resolver",
    slug: "customer-complaint-resolver",
    description: "Craft empathetic and solution-focused responses to complaints",
    content: "Resolve this customer complaint:\n\nComplaint: {{complaint}}\nCustomer history: {{history}}\nProduct/Service: {{product}}\nDesired outcome: {{desired_outcome}}\nCompany policy: {{policy}}\n\nCraft:\n1. Empathetic acknowledgment\n2. Clear explanation\n3. Solution options\n4. Compensation (if applicable)\n5. Prevention measures\n6. Follow-up plan\n7. Escalation path",
    category: "customer-service",
    tags: ["customer-service", "complaint", "resolution", "support"],
    is_public: true,
    usage_count: 245
  },
  {
    name: "FAQ Generator",
    slug: "faq-generator",
    description: "Generate comprehensive FAQs from customer support data",
    content: "Generate FAQs for:\n\nProduct/Service: {{product}}\nCommon issues: {{issues}}\nTarget audience: {{audience}}\nSupport ticket themes: {{themes}}\nTone of voice: {{tone}}\n\nCreate:\n1. Top 10-15 questions\n2. Clear, concise answers\n3. Category organization\n4. Related articles links\n5. Contact options\n6. Search optimization\n7. Update schedule",
    category: "customer-service",
    tags: ["faq", "support", "documentation", "customer-service"],
    is_public: true,
    usage_count: 178
  },
  {
    name: "Customer Journey Mapper",
    slug: "customer-journey-mapper",
    description: "Map detailed customer journeys with touchpoints and opportunities",
    content: "Map the customer journey for:\n\nCustomer persona: {{persona}}\nProduct/Service: {{product}}\nEntry point: {{entry_point}}\nGoal: {{customer_goal}}\nCurrent pain points: {{pain_points}}\n\nProvide:\n1. Journey stages\n2. Touchpoints per stage\n3. Emotions and thoughts\n4. Pain points and opportunities\n5. Moments of truth\n6. Improvement recommendations\n7. Success metrics",
    category: "customer-service",
    tags: ["customer-journey", "ux", "mapping", "strategy"],
    is_public: true,
    usage_count: 156
  },

  // Personal Development
  {
    name: "Career Development Planner",
    slug: "career-development-planner",
    description: "Create personalized career development plans with actionable steps",
    content: "Plan career development for:\n\nCurrent role: {{current_role}}\nTarget role: {{target_role}}\nTimeframe: {{timeframe}}\nCurrent skills: {{current_skills}}\nGaps identified: {{skill_gaps}}\n\nCreate:\n1. Skill development roadmap\n2. Learning resources\n3. Networking strategy\n4. Portfolio projects\n5. Milestone markers\n6. Mentor recommendations\n7. Success metrics",
    category: "personal",
    tags: ["career", "development", "planning", "growth"],
    is_public: true,
    usage_count: 223
  },
  {
    name: "Personal Brand Builder",
    slug: "personal-brand-builder",
    description: "Develop a cohesive personal brand across platforms",
    content: "Build a personal brand for:\n\nProfession: {{profession}}\nTarget audience: {{audience}}\nUnique value: {{unique_value}}\nPlatforms: {{platforms}}\nGoals: {{goals}}\n\nDevelop:\n1. Brand positioning statement\n2. Key messaging pillars\n3. Visual identity guidelines\n4. Content themes\n5. Platform-specific strategies\n6. Engagement tactics\n7. Measurement framework",
    category: "personal",
    tags: ["personal-brand", "marketing", "career", "social-media"],
    is_public: true,
    usage_count: 189
  },
  {
    name: "Goal Achievement System",
    slug: "goal-achievement-system",
    description: "Design systematic approaches to achieve personal and professional goals",
    content: "Design a system to achieve:\n\nGoal: {{goal}}\nTimeline: {{timeline}}\nCurrent situation: {{current_situation}}\nResources available: {{resources}}\nPotential obstacles: {{obstacles}}\n\nCreate:\n1. SMART goal refinement\n2. Milestone breakdown\n3. Daily/weekly actions\n4. Accountability measures\n5. Progress tracking method\n6. Obstacle mitigation plan\n7. Celebration milestones",
    category: "personal",
    tags: ["goals", "achievement", "productivity", "planning"],
    is_public: true,
    usage_count: 201
  }
];

async function seedPrompts() {
  try {
    console.log('🚀 Starting to seed prompts...');
    
    // Clean up templates - remove fields that don't exist in database
    const cleanedTemplates = promptTemplates.map(template => {
      const { category, tags, is_public, usage_count, ...cleanTemplate } = template as any;
      return cleanTemplate;
    });
    
    // Get a user to be the creator
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
      
    if (userError || !users || users.length === 0) {
      console.error('Error: No users found. Please create a user first.');
      return;
    }
    
    const userId = users[0].id;
    console.log(`Using user: ${users[0].email}`);
    
    // Get the first workspace (or create one for demo)
    const { data: workspaces, error: wsError } = await supabase
      .from('workspaces')
      .select('*')
      .limit(1);
    
    if (wsError) {
      console.error('Error fetching workspace:', wsError);
      return;
    }
    
    let workspaceId;
    if (workspaces && workspaces.length > 0) {
      workspaceId = workspaces[0].id;
      console.log(`Using existing workspace: ${workspaces[0].name}`);
    } else {
      // Create a demo workspace if none exists
      const { data: newWorkspace, error: createError } = await supabase
        .from('workspaces')
        .insert({
          name: 'Demo Workspace',
          slug: 'demo-workspace',
          tier: 'pro'
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating workspace:', createError);
        return;
      }
      
      workspaceId = newWorkspace.id;
      console.log('Created new demo workspace');
    }
    
    // Insert prompts
    let successCount = 0;
    for (const template of cleanedTemplates) {
      const { error } = await supabase
        .from('prompts')
        .insert({
          ...template,
          workspace_id: workspaceId,
          created_by: userId,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error(`Error inserting prompt "${template.name}":`, error);
      } else {
        successCount++;
        console.log(`✅ Created prompt: ${template.name}`);
      }
    }
    
    console.log(`\n🎉 Successfully seeded ${successCount}/${cleanedTemplates.length} prompts!`);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    process.exit();
  }
}

// Run the seeder
seedPrompts();