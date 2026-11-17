/**
 * Sample Profiles and Matching Job Descriptions
 * Curated for high-precision ATS benchmarking and instant engine testing
 */

const SAMPLE_PROFILES = {
  vishal_aradhya: {
    id: "vishal_aradhya",
    name: "VISHAL ARADHYA JC",
    targetTitle: "Senior Business Analyst – Retail & E-Commerce Analytics",
    email: "vishal.aradhya@example.com",
    phone: "+91 98765 43210",
    location: "Bengaluru, India",
    linkedin: "linkedin.com/in/vishal-aradhya",
    github: "github.com/vishalaradhya-12",
    portfolio: "",
    summary: "Business Analyst with 3+ years of experience in retail and e-commerce analytics at Titan and Amazon, specialising in inventory, merchandising and sales analytics. Skilled in SQL, Python, Power BI and Excel, with hands-on work in sales velocity, stock ageing and sell-through analysis, demand analysis, KPI reporting and dashboard automation. M.Tech in Big Data Analytics and Microsoft PL-300 certified.",
    skills: {
      "Programming & Querying": ["Python", "SQL", "DAX", "VBA", "Pandas", "NumPy"],
      "Data Visualization Tools": ["Power BI", "Tableau", "AWS QuickSight", "Advanced Excel (Pivot Tables)"],
      "Data Infrastructure and Engineering": ["AWS (Redshift, S3)", "Azure (Data Lake, SQL)", "MySQL", "Data modeling", "ETL"],
      "Analytics & ML Skills": ["Predictive modeling", "scikit-learn", "XGBoost", "NLP", "Root cause analysis", "KPI reporting"],
      "Domain & GenAI": ["Inventory analytics", "Retail analytics", "Merchandising", "LangChain", "OpenAI API", "LLM analytics"]
    },
    experience: [
      {
        id: "exp-v-1",
        title: "Senior Executive – Analytics",
        company: "Titan Company Ltd (Jewellery Division)",
        location: "Bengaluru, India",
        period: "November 2025 - Present",
        bullets: [
          "Identified ₹1.2 Cr of excess inventory and working capital opportunities through SKU-level sales velocity, ageing and stock-cover analysis across 25K+ SKUs, helping merchandising teams prioritise liquidation and stock redistribution.",
          "Improved inventory turnover by 12% by identifying slow-moving jewellery designs, analysing demand patterns and recommending data-driven replenishment and stock allocation strategies.",
          "Uncovered ₹2 Cr in potential sales by identifying high-demand designs with recurring stock shortages and assortment gaps, helping merchandising teams prioritise replenishment and lift top-design availability by 10%.",
          "Reduced excess inventory exposure by 15% through product-level sell-through and ageing analysis, supporting assortment rationalisation and better alignment between inventory investment and customer demand."
        ]
      },
      {
        id: "exp-v-2",
        title: "Data Analyst",
        company: "Amazon",
        location: "Bengaluru, India",
        period: "November 2023 - November 2025",
        bullets: [
          "Analysed Repeat Defect Rate (RDR) trends to identify inefficiencies in business hours and SOPs, driving a 15% improvement in operational efficiency.",
          "Built predictive models using scikit-learn and XGBoost to forecast repeat delivery failures, reducing delays by proactively flagging high-risk routes.",
          "Designed and deployed Amazon QuickSight dashboards on AWS Redshift and S3 for real-time monitoring of Last Mile delivery quality and audit outcomes.",
          "Automated SQL-based data validation and anomaly detection checks, improving data accuracy, consistency and reporting reliability by 25%."
        ]
      },
      {
        id: "exp-v-3",
        title: "Data Science Intern",
        company: "Altair Engineering",
        location: "Bengaluru, India",
        period: "August 2022 - July 2023",
        bullets: [
          "Performed sentiment analysis on 200K+ customer reviews using NLP (NLTK, spaCy, LSTM) and built word-cloud dashboards to surface pain points, helping reduce negative feedback by 10%.",
          "Ran root cause analysis and correlation modeling using statistical methods, leading to a 15% increase in customer satisfaction scores.",
          "Built Python (pandas, NumPy) and Power BI analytics pipelines for reliable, repeatable reporting."
        ]
      }
    ],
    projects: [
      {
        id: "proj-v-1",
        name: "GenAI Retail Analytics & Autonomous Demand Forecasting Engine",
        role: "Lead Architect & Developer",
        tech: "Python, LangChain, OpenAI API, SQL, AWS (Redshift, S3), Power BI, XGBoost",
        link: "github.com/vishalaradhya-12/retail-intelligence-copilot",
        bullets: [
          "Architected an LLM-powered analytics copilot using LangChain and OpenAI API to convert executive natural language prompts into optimized SQL over 500K+ transactions, reducing ad-hoc reporting turnaround by 65%.",
          "Engineered predictive demand forecasting models with XGBoost and dynamic replenishment triggers, improving stock availability by 14% across 30K+ SKUs."
        ]
      }
    ],
    education: [
      {
        id: "edu-v-1",
        degree: "M.Tech in Big Data Analytics",
        institution: "Manipal Institute of Technology",
        location: "Manipal, India",
        year: "2021 - 2023",
        details: ""
      },
      {
        id: "edu-v-2",
        degree: "B.E. in Information Science and Engineering",
        institution: "JNN College of Engineering",
        location: "Shivamogga, India",
        year: "2016 - 2020",
        details: ""
      }
    ],
    certifications: [
      "Microsoft Certified: Power BI Data Analyst Associate (PL-300)"
    ],
    matchingJD: {
      company: "Target / Amazon Retail",
      title: "Senior Business Analyst – Retail, Inventory & Supply Chain Analytics",
      location: "Bengaluru, India / Hybrid",
      department: "Merchandising & Supply Chain Analytics",
      salary: "Competitive + Performance Bonus",
      text: `Role Overview:
We are seeking an experienced Senior Business Analyst to drive inventory optimization, sales velocity modeling, and merchandising strategy across our e-commerce and retail networks. You will leverage SQL, Python, Power BI, and cloud data warehouses to deliver actionable insights that maximize stock turnover and customer availability.

Key Responsibilities:
- Conduct SKU-level sales velocity, stock ageing, sell-through, and inventory turnover analysis across large retail catalogs (20K+ SKUs).
- Build automated executive dashboards and KPI reporting suites in Power BI and AWS QuickSight for merchandising and supply chain leadership.
- Partner with category and merchandising teams to identify excess inventory, reduce working capital exposure, and eliminate stock shortages.
- Query and model large-scale transactional datasets across AWS Redshift, S3, and Azure data platforms using advanced SQL and DAX.
- Develop predictive machine learning models (scikit-learn, XGBoost) and statistical root cause analyses to forecast demand anomalies and operational defects.
- Automate data validation pipelines using Python (Pandas, NumPy) and explore GenAI / LLM analytics for automated reporting insights.

Required Qualifications:
- 3+ years of proven analytics experience in retail, e-commerce, or supply chain domains.
- Expert proficiency in SQL (complex joins, window functions, CTEs) and Power BI (DAX, data modeling, PL-300 certification preferred).
- Hands-on Python data manipulation (Pandas, NumPy) and predictive modeling experience (scikit-learn, XGBoost).
- Deep domain knowledge of retail KPIs: sell-through rate, inventory turnover, stock-cover, SKU rationalization, and assortment planning.
- Experience with cloud data warehouses (AWS Redshift, S3, Azure) and BI tools (QuickSight, Tableau).
- Bachelor's or Master's degree in Data Analytics, Computer Science, Engineering, or related quantitative field.`
    }
  },

  software_engineer: {
    id: "software_engineer",
    name: "Alex Morgan",
    targetTitle: "Lead Full Stack & Cloud Systems Engineer",
    email: "alex.morgan@techlead.dev",
    phone: "+1 (555) 382-9014",
    location: "San Francisco, CA (Open to Remote)",
    linkedin: "linkedin.com/in/alexmorgan-lead",
    github: "github.com/alexmorgan-dev",
    portfolio: "alexmorgan.tech",
    summary: "High-impact Lead Full Stack & Cloud Architect with 8+ years building enterprise distributed systems, fault-tolerant microservices, and reactive web applications. Proven track record scaling platforms to 15M+ active users, optimizing AWS/Kubernetes infrastructure for 99.99% availability, and driving 38% latency reductions. Passionate mentor and champion of CI/CD automation, event-driven architecture, and engineering excellence.",
    skills: {
      "Core Languages": ["TypeScript", "JavaScript (ESNext)", "Python", "Go", "SQL", "HTML5/CSS3"],
      "Frameworks & UI": ["React", "Next.js", "Node.js", "Express", "TailwindCSS", "Redux Toolkit", "GraphQL"],
      "Cloud & DevOps": ["AWS (ECS, EKS, Lambda, S3, RDS)", "Docker", "Kubernetes", "Terraform", "CI/CD (GitHub Actions)", "Prometheus", "Datadog"],
      "Databases & Queues": ["PostgreSQL", "Redis", "Kafka", "MongoDB", "DynamoDB", "Elasticsearch"],
      "Architecture & Practices": ["Microservices", "Event-Driven Systems", "RESTful APIs", "System Design", "Agile/Scrum", "TDD"]
    },
    experience: [
      {
        id: "exp-1",
        title: "Lead Full Stack Engineer",
        company: "Apex Cloud Technologies",
        location: "San Francisco, CA",
        period: "2022 - Present",
        bullets: [
          "Architected and deployed a multi-tenant distributed streaming pipeline using Go, Apache Kafka, and AWS EKS, processing 45M+ daily events with sub-50ms p99 latency.",
          "Spearheaded the migration of legacy monolithic web tier to Next.js and TypeScript micro-frontends, reducing initial page load times by 42% and boosting mobile conversion by 18%.",
          "Automated infrastructure provisioning using Terraform and GitHub Actions CI/CD pipelines, eliminating 90% of manual release steps and shrinking deployment cycles from 4 days to 25 minutes.",
          "Mentored a team of 9 senior and mid-level engineers across 3 geographic zones, conducting code reviews and driving architectural decision records (ADRs)."
        ]
      },
      {
        id: "exp-2",
        title: "Senior Software Engineer",
        company: "HyperScale Networks",
        location: "San Jose, CA",
        period: "2019 - 2022",
        bullets: [
          "Engineered high-throughput REST and GraphQL APIs using Node.js and PostgreSQL, serving 12M monthly active users with 99.99% service availability.",
          "Designed an intelligent Redis distributed caching layer with cache invalidation webhooks, decreasing primary database read load by 63% during peak traffic spikes.",
          "Partnered with cybersecurity and compliance teams to enforce SOC2 Type II controls, implement OAuth2/OIDC SSO, and remediate critical vulnerability disclosures.",
          "Authored automated integration and unit test suites reaching 88% branch coverage, reducing production defect escape rate by 31% over 18 months."
        ]
      },
      {
        id: "exp-3",
        title: "Software Engineer",
        company: "Vanguard Digital Media",
        location: "Oakland, CA",
        period: "2017 - 2019",
        bullets: [
          "Developed core features for real-time collaborative video analytics dashboard using React, WebSockets, and D3.js visualization charts.",
          "Refactored relational database schemas and indexed slow queries in PostgreSQL, cutting query execution times by an average of 45%.",
          "Collaborated with product managers and UX designers to iterate through weekly agile sprints, delivering 24+ customer-facing roadmap features on schedule."
        ]
      }
    ],
    projects: [
      {
        id: "proj-1",
        name: "OmniFlow Distributed Task Queue",
        role: "Creator & Lead Maintainer",
        tech: "Go, Redis Streams, Docker, Prometheus",
        link: "github.com/alexmorgan-dev/omniflow",
        bullets: [
          "Engineered an open-source lightweight distributed priority job queue supporting persistent retry strategies, dead-letter queues, and real-time Prometheus telemetry.",
          "Achieved 1,200+ GitHub stars with 15k+ Docker pulls and production adoption by 8 tech startups."
        ]
      },
      {
        id: "proj-2",
        name: "CloudGuard Observability Dashboard",
        role: "Full Stack Developer",
        tech: "React, Next.js, TypeScript, AWS CloudWatch API",
        link: "cloudguard-demo.tech",
        bullets: [
          "Constructed real-time cost anomaly detector alerting DevOps teams via Slack when cloud spending deviates beyond standard variance, saving early testers an avg $4.2k/mo."
        ]
      }
    ],
    education: [
      {
        id: "edu-1",
        degree: "B.S. in Computer Science",
        institution: "University of California, Berkeley",
        location: "Berkeley, CA",
        year: "2017",
        details: "Graduated with Honors. Coursework in Distributed Systems, Algorithms, Database Internals, and Computer Networking."
      }
    ],
    certifications: [
      "AWS Certified Solutions Architect – Professional (2024)",
      "Certified Kubernetes Application Developer (CKAD) – Linux Foundation (2023)"
    ],
    matchingJD: {
      company: "CloudScale Systems",
      title: "Staff Full Stack Infrastructure Engineer",
      location: "San Francisco, CA / Remote",
      department: "Platform Engineering",
      salary: "$185,000 - $225,000 + Equity",
      text: `About the Role:
CloudScale is looking for an exceptional Staff Full Stack Engineer to lead our next-generation cloud infrastructure and developer platform. In this role, you will architect resilient distributed systems, build developer-facing micro-frontends, and drive our enterprise cloud modernization roadmap.

Responsibilities:
- Architect, build, and scale mission-critical distributed systems and event-driven architectures capable of handling 50M+ requests per day.
- Design modern web applications and developer consoles utilizing React, TypeScript, and modern state management.
- Spearhead cloud-native infrastructure automation using Kubernetes (EKS), Docker, Terraform, and AWS cloud services.
- Optimize database performance and caching strategies across PostgreSQL, Redis, and Apache Kafka message streams.
- Champion engineering best practices, CI/CD pipeline automation, observability with Datadog/Prometheus, and robust code quality standards.
- Partner with Product and Security teams to ensure SOC2 compliance, data privacy, and zero-trust security postures.
- Mentor senior engineers, lead architectural design reviews, and establish standard engineering patterns across the organization.

Requirements:
- 7+ years of experience in full stack software engineering and cloud systems architecture.
- Deep expertise in TypeScript, React, Go or Node.js, and modern asynchronous programming patterns.
- Proven track record scaling AWS or cloud-native infrastructure with Kubernetes, Docker, and Terraform.
- Hands-on experience with high-throughput data pipelines using Apache Kafka, Redis caching, and PostgreSQL optimization.
- Strong knowledge of microservices, RESTful and GraphQL APIs, and event-driven architecture design.
- Demonstrated success leading technical initiatives, establishing CI/CD automation, and improving developer velocity.
- B.S. or M.S. in Computer Science or equivalent practical experience.`
    }
  },

  ai_ml_engineer: {
    id: "ai_ml_engineer",
    name: "Dr. Elena Rostova",
    targetTitle: "Senior Machine Learning & Generative AI Systems Engineer",
    email: "elena.rostova@ailabs.io",
    phone: "+1 (555) 749-2180",
    location: "New York, NY (Hybrid)",
    linkedin: "linkedin.com/in/elena-rostova-ai",
    github: "github.com/elena-ai-systems",
    portfolio: "elenarostova.dev",
    summary: "Machine Learning Systems Engineer with Ph.D. in Computer Science and 6+ years deploying scalable ML, LLM pipelines, and deep neural networks in production. Specialized in LLM fine-tuning (LoRA/QLoRA), RAG architectures, model quantization, and distributed inference optimization. Accelerated inference throughput by 3.4x while lowering cloud compute expenses by 44%.",
    skills: {
      "AI/ML Frameworks": ["PyTorch", "TensorFlow", "Hugging Face", "vLLM", "DeepSpeed", "LangChain", "LlamaIndex"],
      "Languages": ["Python", "C++", "SQL", "Bash", "R"],
      "MLOps & Cloud": ["Kubeflow", "MLflow", "Docker", "Kubernetes", "AWS SageMaker", "GCP Vertex AI", "Ray Distributed"],
      "Data & Storage": ["Vector DBs (Pinecone, Weaviate, Qdrant)", "PostgreSQL (pgvector)", "BigQuery", "Apache Spark"],
      "Specializations": ["RAG Architecture", "LLM Fine-Tuning", "Transformer Optimization", "Model Quantization", "NLP"]
    },
    experience: [
      {
        id: "exp-ml-1",
        title: "Senior AI/ML Systems Engineer",
        company: "Synthetix AI Laboratories",
        location: "New York, NY",
        period: "2022 - Present",
        bullets: [
          "Architected production Retrieval-Augmented Generation (RAG) pipeline utilizing Pinecone vector database and hybrid dense-sparse retrieval, cutting retrieval hallucination rates by 68%.",
          "Fine-tuned 7B and 13B open-source LLMs using LoRA/QLoRA on proprietary enterprise datasets, surpassing baseline GPT-4 benchmark accuracy in domain QA tasks by 9.4%.",
          "Optimized distributed inference serving with vLLM, TensorRT-LLM, and dynamic batching, boosting GPU throughput by 3.8x and slashing monthly inference AWS costs by $28,000.",
          "Established automated model evaluation and hallucination detection test suites integrated into GitLab CI/CD pipelines."
        ]
      },
      {
        id: "exp-ml-2",
        title: "Machine Learning Engineer",
        company: "Cognitive Data Solutions",
        location: "Boston, MA",
        period: "2019 - 2022",
        bullets: [
          "Developed computer vision and NLP models in PyTorch for automated document extraction and classification, processing 1.8M documents weekly with 98.2% F1-score.",
          "Built end-to-end MLOps pipelines using MLflow, Kubeflow, and Docker on GCP Vertex AI, cutting model training-to-deployment time from 3 weeks to 2 days.",
          "Collaborated with data engineering team to optimize distributed Spark feature extraction jobs, reducing feature store refresh latency by 55%."
        ]
      },
      {
        id: "exp-ml-3",
        title: "AI Research Scientist Intern",
        company: "Google Research (Brain Team)",
        location: "Mountain View, CA",
        period: "2018 - 2019",
        bullets: [
          "Researched sparse attention mechanisms for large-scale transformer architectures, improving training throughput by 22% on TPU v3 clusters.",
          "Co-authored 2 peer-reviewed papers on neural quantization and gradient compression presented at NeurIPS and ICML conferences.",
          "Prototyped model compression pipelines in TensorFlow, cutting memory footprint by 40% with under 0.4% loss in validation accuracy."
        ]
      }
    ],
    projects: [
      {
        id: "proj-ml-1",
        name: "FastRAG: Low-Latency Semantic Search Engine",
        role: "Creator",
        tech: "Python, PyTorch, Qdrant, FastChat, FastAPI",
        link: "github.com/elena-ai-systems/fastrag",
        bullets: [
          "Open-source sub-15ms embedding search and reranking engine with cross-encoder support, downloaded 40k+ times on PyPI."
        ]
      },
      {
        id: "proj-ml-2",
        name: "TensorQuant: 4-Bit LLM Inference Acceleration Engine",
        role: "Lead Researcher",
        tech: "PyTorch, CUDA, AWQ Quantization, Triton, vLLM",
        link: "github.com/elena-ai-systems/tensorquant",
        bullets: [
          "Engineered kernel optimizations for activation-aware 4-bit weight quantization (AWQ), doubling generation throughput across Nvidia A100 GPUs."
        ]
      }
    ],
    education: [
      {
        id: "edu-ml-1",
        degree: "Ph.D. in Computer Science (Artificial Intelligence)",
        institution: "Massachusetts Institute of Technology (MIT)",
        location: "Cambridge, MA",
        year: "2019",
        details: "Dissertation: Efficient Distributed Training and Inference for High-Dimensional Neural Architectures."
      }
    ],
    certifications: [
      "AWS Certified Machine Learning – Specialty",
      "Google Cloud Professional Machine Learning Engineer"
    ],
    matchingJD: {
      company: "Aether AI Research",
      title: "Senior Machine Learning Engineer – Generative AI & Inference Systems",
      location: "New York, NY / Remote",
      department: "Applied AI Core",
      salary: "$195,000 - $240,000 + Equity",
      text: `Role Overview:
Aether AI is seeking a Senior Machine Learning Engineer to build our enterprise-grade Generative AI platform. You will spearhead our LLM inference optimization, RAG pipelines, model quantization, and distributed MLOps architecture.

Key Responsibilities:
- Design and scale production RAG (Retrieval-Augmented Generation) systems utilizing vector databases (Pinecone, Qdrant, or Weaviate) and semantic re-ranking.
- Fine-tune and evaluate large foundation models using PyTorch, Hugging Face, DeepSpeed, and parameter-efficient techniques (PEFT, LoRA).
- Build high-throughput, low-latency LLM inference services leveraging vLLM, TensorRT-LLM, and Triton Inference Server on Kubernetes.
- Engineer automated MLOps pipelines for model tracking, drift detection, and continuous evaluation with MLflow or Kubeflow.
- Collaborate with cloud platform teams to optimize GPU cluster utilization, spot instance orchestration, and cloud compute cost efficiency.

Qualifications:
- 5+ years building and deploying deep learning and ML systems into high-scale production environments.
- Strong mastery of Python, PyTorch, Hugging Face ecosystem, and modern transformer architectures.
- Demonstrated experience with Vector DBs, embedding search, semantic chunking, and production RAG systems.
- Proven expertise in LLM inference acceleration, quantization (AWQ, GPTQ), and GPU memory optimization.
- Experience with Kubernetes, Docker, and distributed computing frameworks (Ray).
- M.S. or Ph.D. in Computer Science, Machine Learning, Mathematics, or equivalent field.`
    }
  },

  product_manager: {
    id: "product_manager",
    name: "Marcus Vance",
    targetTitle: "Principal Technical Product Manager",
    email: "marcus.vance@techpm.co",
    phone: "+1 (555) 491-3029",
    location: "Austin, TX (Remote)",
    linkedin: "linkedin.com/in/marcusvance-pm",
    github: "github.com/marcusvance",
    portfolio: "marcusvance.me",
    summary: "Visionary Technical Product Leader with 9+ years managing cloud B2B enterprise software, API-first developer platforms, and data infrastructure. Led cross-functional squads of 25+ engineers, designers, and marketers to take 4 flagship products from 0 to 1, generating $32M in net new ARR. Expert in product-led growth (PLG), customer discovery, roadmap prioritization, and data-driven product decisions.",
    skills: {
      "Product Strategy": ["0-to-1 Product Discovery", "Roadmap Prioritization", "Product-Led Growth (PLG)", "Pricing & Packaging", "Go-To-Market (GTM)"],
      "Technical Depth": ["API-First Architecture", "Cloud Platforms (AWS/GCP)", "Data Analytics & SQL", "System Architecture", "Security & Compliance"],
      "Processes & Tools": ["Agile / Scrum / Kanban", "Jira / Linear", "Mixpanel / Amplitude", "Figma", "UserTesting", "A/B Testing Methodologies"],
      "Leadership": ["Cross-Functional Alignment", "Executive Stakeholder Management", "Team Mentorship", "Customer Advisory Boards"]
    },
    experience: [
      {
        id: "exp-pm-1",
        title: "Principal Product Manager – Cloud Platform",
        company: "Stratos Cloud Services",
        location: "Austin, TX",
        period: "2021 - Present",
        bullets: [
          "Spearheaded product strategy and GTM for enterprise developer portal and API gateway, driving adoption from 40k to 220k monthly active developers and achieving $18M ARR in year two.",
          "Conducted 80+ customer interviews with Fortune 500 CTOs and lead architects, synthesizing user pain points into a prioritized multi-year platform roadmap.",
          "Introduced self-serve onboarding and interactive API playground, shortening time-to-first-API-call from 48 hours to 12 minutes and lifting self-serve conversion by 34%.",
          "Managed roadmap delivery across 4 cross-functional engineering pods (28 engineers), maintaining 94% on-time release predictability across 8 quarterly releases."
        ]
      },
      {
        id: "exp-pm-2",
        title: "Senior Product Manager",
        company: "MetricScale Analytics",
        location: "Seattle, WA",
        period: "2018 - 2021",
        bullets: [
          "Owned core real-time analytics product suite, growing ARR from $6M to $19M through tiered enterprise pricing and automated feature add-ons.",
          "Ran iterative A/B testing programs analyzing product funnel metrics via Amplitude and SQL, improving user 30-day retention by 22%.",
          "Partnered closely with enterprise sales to close 14 key Fortune 1000 accounts representing $5.6M in contract value."
        ]
      },
      {
        id: "exp-pm-3",
        title: "Associate Product Manager – Developer Tools",
        company: "Atlassian",
        location: "San Francisco, CA",
        period: "2015 - 2018",
        bullets: [
          "Owned integrations ecosystem for developer CLI tools and webhooks, expanding active 3rd-party marketplace plugins from 120 to 580+.",
          "Collaborated with engineering to overhaul developer documentation and interactive API sandbox, decreasing developer onboarding churn by 28%.",
          "Drove product telemetry migration to Segment and Amplitude, enabling real-time cohort retention tracking across 400K+ weekly developers."
        ]
      }
    ],
    projects: [
      {
        id: "proj-pm-1",
        name: "OpenAPI Spec Builder & Validator",
        role: "Product Creator",
        tech: "Product Discovery, REST Spec, Figma, Open Source",
        link: "openapispecbuilder.io",
        bullets: [
          "Conceived and launched community developer tool helping teams generate clean OpenAPI 3.1 schemas, adopted by over 20,000 developers worldwide."
        ]
      },
      {
        id: "proj-pm-2",
        name: "CloudPulse: Multi-Cloud SLA Analytics Console",
        role: "Product Lead",
        tech: "DataDog API, GraphQL, Product Strategy, Amplitude",
        link: "cloudpulse-demo.dev",
        bullets: [
          "Defined product roadmap for real-time SLA degradation alerting, adopted by 40+ enterprise cloud customers to monitor 99.99% uptime compliance."
        ]
      }
    ],
    education: [
      {
        id: "edu-pm-1",
        degree: "B.S. in Management Information Systems & Business",
        institution: "University of Texas at Austin",
        location: "Austin, TX",
        year: "2015",
        details: "Dean's List. Concentration in Enterprise Software Systems and Product Strategy."
      }
    ],
    certifications: [
      "Pragmatic Institute Certified (PMC-III) – Product Strategy & Management",
      "Certified Scrum Product Owner (CSPO)"
    ],
    matchingJD: {
      company: "DataVantage Cloud",
      title: "Director of Product – Developer Platforms & Cloud APIs",
      location: "Austin, TX / Remote",
      department: "Platform Product",
      salary: "$210,000 - $250,000 + Equity",
      text: `About the Role:
DataVantage Cloud is seeking a seasoned Director of Product / Principal Product Manager to own our flagship Developer Platform and Cloud API suite. You will define the global product roadmap, drive product-led growth (PLG), and create frictionless developer experiences for over 500,000 cloud developers.

What You'll Do:
- Formulate vision, product strategy, and multi-quarter roadmaps for developer tools, SDKs, and REST/GraphQL APIs.
- Lead product-led growth (PLG) initiatives, self-serve onboarding funnels, and monetization strategies to accelerate expansion ARR.
- Partner with engineering leads and platform architects to build resilient, high-performance API ecosystems.
- Deep dive into product telemetry using Amplitude, Mixpanel, and SQL to identify churn drivers and feature opportunities.
- Champion voice-of-the-customer through customer advisory boards, executive briefings, and developer community forums.
- Lead and coach product managers, fostering an outcome-driven product culture focused on measurable business metrics.

What You Bring:
- 8+ years of product management experience with B2B SaaS, developer tooling, or cloud infrastructure platforms.
- Proven success owning API-first products, developer portals, or cloud platform offerings at scale.
- Strong technical fluency: able to discuss system architecture, API specifications, and cloud services (AWS/GCP) with senior engineers.
- Masterful command of data analysis, SQL queries, metric funnels, and A/B experimentation.
- Exceptional executive communication, stakeholder leadership, and cross-functional orchestration skills.
- Degree in Computer Science, Engineering, or relevant technical field/experience.`
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SAMPLE_PROFILES };
}
