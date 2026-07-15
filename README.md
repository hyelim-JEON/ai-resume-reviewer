![Next.js](https://img.shields.io/badge/Next.js-15-black)
![ASP.NET Core](https://img.shields.io/badge/ASP.NET%20Core-9.0-blue)
![Azure OpenAI](https://img.shields.io/badge/Azure%20OpenAI-AI-green)

# ResumeFit AI

AI-powered resume analysis platform that compares resumes against job descriptions using Azure OpenAI and provides match scores, skill gap analysis, and interview preparation insights.

## Features

- Upload resumes in PDF and DOCX formats
- Analyze resumes against job descriptions
- Generate resume match scores
- Identify missing skills and qualification gaps
- Generate tailored interview questions
- Privacy-first processing with secure file handling

## Tech Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS

### Backend

- ASP.NET Core Web API
- Azure OpenAI
- PDFPig
- Open XML SDK

### AI & Analysis

- Azure OpenAI GPT Models
- Resume-to-job matching
- Skill gap analysis
- Interview question generation

## Architecture

```text
Frontend (Next.js)
        │
        ▼
ASP.NET Core Web API
        │
        ▼
Azure OpenAI
```

## How It Works

1. Upload a resume (PDF or DOCX)
2. Paste a job description
3. Resume content is extracted and processed
4. Azure OpenAI analyzes the resume against the job requirements
5. Users receive:
   - Resume Match Score
   - Matching Strengths
   - Missing Skills
   - Suggested Interview Questions

## Key Learning Outcomes

- Built a full-stack application using Next.js and ASP.NET Core
- Integrated Azure OpenAI for real-world AI-powered analysis
- Implemented PDF and DOCX document parsing
- Designed RESTful APIs for frontend-backend communication
- Applied prompt engineering techniques to improve analysis quality

## Future Improvements

- PDF report export
- Resume improvement suggestions
- User authentication and saved reports
- Multi-language support
- Historical analysis tracking
