"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { AlertTriangle, BriefcaseBusiness, CheckCircle2, FileText, Loader2, Sparkles, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

type AnalysisResult = {
  score: number;
  strengths: string[];
  missingSkills: string[];
  suggestions: string[];
  interviewQuestions: string[];
};

type AnalysisStatus = {
  message: string;
  progress: number;
};

const ANALYSIS_STEPS: AnalysisStatus[] = [
  {
    message: "Uploading resume...",
    progress: 15,
  },
  {
    message: "Extracting resume text...",
    progress: 35,
  },
  {
    message: "Analyzing skills...",
    progress: 60,
  },
  {
    message: "Generating interview questions...",
    progress: 85,
  },
];

function getMatchLabel(score: number) {
  if (score >= 80) return "Strong match";
  if (score >= 60) return "Good match";
  if (score >= 40) return "Partial match";

  return "Low match";
}

export default function Home() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  const [analysisStep, setAnalysisStep] = useState("");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const resultRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (result) {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [result]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    setError("");
    setResult(null);

    if (!file) {
      setResumeFile(null);
      return;
    }

    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

    if (!allowedTypes.includes(file.type)) {
      setResumeFile(null);
      setError("Please upload a PDF or DOCX file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setResumeFile(null);
      setError("The file must be smaller than 5 MB.");
      return;
    }

    setResumeFile(file);
  };

  const handleAnalyze = async () => {
    setError("");

    if (!resumeFile) {
      setError("Please upload your resume.");
      return;
    }

    if (jobDescription.trim().length < 50) {
      setError("Please enter a more detailed job description.");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    setAnalysisStep(ANALYSIS_STEPS[0].message);
    setAnalysisProgress(ANALYSIS_STEPS[0].progress);

    const statusTimers: ReturnType<typeof setTimeout>[] = [];

    try {
      /*
       * 백엔드에서 실시간 진행 상태를 보내는 구조가 아니므로,
       * 사용자에게 처리 과정이 보이도록 일정 시간마다 상태를 변경합니다.
       */
      statusTimers.push(
        setTimeout(() => {
          setAnalysisStep(ANALYSIS_STEPS[1].message);
          setAnalysisProgress(ANALYSIS_STEPS[1].progress);
        }, 600),
      );

      statusTimers.push(
        setTimeout(() => {
          setAnalysisStep(ANALYSIS_STEPS[2].message);
          setAnalysisProgress(ANALYSIS_STEPS[2].progress);
        }, 1400),
      );

      statusTimers.push(
        setTimeout(() => {
          setAnalysisStep(ANALYSIS_STEPS[3].message);
          setAnalysisProgress(ANALYSIS_STEPS[3].progress);
        }, 4000),
      );

      const formData = new FormData();

      formData.append("resume", resumeFile);
      formData.append("jobDescription", jobDescription);

      const response = await fetch("http://localhost:5145/api/analyze", {
        method: "POST",
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message ?? responseData.detail ?? "The analysis request failed.");
      }

      statusTimers.forEach((timer) => clearTimeout(timer));

      setAnalysisStep("Analysis complete");
      setAnalysisProgress(100);

      /*
       * 사용자가 완료 상태를 잠깐 볼 수 있도록 짧게 기다린 후
       * 결과 화면을 표시합니다.
       */
      await new Promise((resolve) => setTimeout(resolve, 400));

      setResult(responseData as AnalysisResult);
    } catch (caughtError) {
      console.error(caughtError);

      setError(caughtError instanceof Error ? caughtError.message : "Unable to analyse the resume.");
    } finally {
      statusTimers.forEach((timer) => clearTimeout(timer));

      setIsAnalyzing(false);
      setAnalysisStep("");
      setAnalysisProgress(0);
    }
  };

  const handleReset = () => {
    setResumeFile(null);
    setJobDescription("");
    setResult(null);
    setError("");
    setAnalysisStep("");
    setAnalysisProgress(0);
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-slate-900 p-2 text-white">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <p className="font-semibold text-slate-900">ResumeFit AI</p>
              <p className="text-xs text-slate-500">AI-powered resume analysis</p>
            </div>
          </div>

          <Badge variant="secondary">Portfolio Project</Badge>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <Badge className="mb-4" variant="outline">
            Built with Next.js and ASP.NET Core
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">Tailor your resume to every opportunity</h1>

          <p className="mt-4 text-lg leading-8 text-slate-600">
            Upload your resume and paste a job description to identify matching skills, missing keywords, improvement opportunities, and potential
            interview questions.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-100 p-2">
                  <FileText className="h-5 w-5 text-slate-700" />
                </div>

                <div>
                  <CardTitle>Upload your resume</CardTitle>
                  <CardDescription>PDF or DOCX, up to 5 MB</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <label
                htmlFor="resume"
                className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 text-center transition hover:border-slate-400 hover:bg-slate-100"
              >
                {resumeFile ? (
                  <>
                    <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-600" />

                    <p className="font-medium text-slate-900">{resumeFile.name}</p>

                    <p className="mt-1 text-sm text-slate-500">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB</p>

                    <p className="mt-3 text-sm text-slate-600">Click to choose another file</p>
                  </>
                ) : (
                  <>
                    <Upload className="mb-3 h-10 w-10 text-slate-500" />

                    <p className="font-medium text-slate-900">Click to upload your resume</p>

                    <p className="mt-1 text-sm text-slate-500">Your file is processed for analysis and is not permanently stored</p>
                  </>
                )}

                <input id="resume" type="file" accept=".pdf,.docx" className="hidden" disabled={isAnalyzing} onChange={handleFileChange} />
              </label>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-100 p-2">
                  <BriefcaseBusiness className="h-5 w-5 text-slate-700" />
                </div>

                <div>
                  <CardTitle>Job description</CardTitle>
                  <CardDescription>Paste the full advertisement here</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <Textarea
                value={jobDescription}
                disabled={isAnalyzing}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the responsibilities, required skills, qualifications, and company information..."
                className="min-h-52 resize-none"
              />

              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>Minimum 50 characters</span>
                <span>{jobDescription.length} characters</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" className="min-w-52" onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analysing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze Resume
              </>
            )}
          </Button>

          {(resumeFile || jobDescription || result) && (
            <Button size="lg" variant="outline" onClick={handleReset} disabled={isAnalyzing}>
              Start Over
            </Button>
          )}
        </div>

        {isAnalyzing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
            <Card className="w-full max-w-md border-0 shadow-2xl">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                    <Loader2 className="h-7 w-7 animate-spin text-slate-700" />
                  </div>

                  <h2 className="text-xl font-semibold text-slate-950">Analysing your resume</h2>

                  <p className="mt-2 text-sm text-slate-500">Please keep this page open while we compare your resume with the job description.</p>

                  <div className="mt-6 w-full">
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-slate-700">{analysisStep}</p>

                      <span className="text-sm font-medium text-slate-500">{analysisProgress}%</span>
                    </div>

                    <Progress value={analysisProgress} className="h-3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {result && (
          <section ref={resultRef} className="mt-14 space-y-6">
            <div>
              <Badge variant="secondary">Analysis complete</Badge>

              <h2 className="mt-3 text-3xl font-bold text-slate-950">Your resume analysis</h2>

              <p className="mt-2 text-slate-600">Your resume was compared with the supplied job description using Azure OpenAI.</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Resume match score</CardTitle>

                <CardDescription>Estimated alignment with the supplied job description</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mb-4 flex items-end justify-between">
                  <span className="text-5xl font-bold text-slate-950">{result.score}%</span>

                  <Badge>{getMatchLabel(result.score)}</Badge>
                </div>

                <Progress value={result.score} className="h-3" />
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <ResultCard
                title="Matching strengths"
                description="Relevant experience already shown in your resume"
                items={result.strengths}
                type="success"
              />

              <ResultCard
                title="Missing or unclear skills"
                description="Skills to add only when they reflect your real experience"
                items={result.missingSkills}
                type="warning"
              />

              <ResultCard
                title="Suggested improvements"
                description="Ways to make your resume more relevant and specific"
                items={result.suggestions}
                type="default"
              />

              <ResultCard
                title="Potential interview questions"
                description="Questions based on the role and your background"
                items={result.interviewQuestions}
                type="default"
              />
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

type ResultCardProps = {
  title: string;
  description: string;
  items: string[];
  type: "success" | "warning" | "default";
};

function ResultCard({ title, description, items, type }: ResultCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent>
        {items.length > 0 ? (
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li key={`${item}-${index}`} className="flex gap-3 text-sm text-slate-700">
                {type === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : type === "warning" ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                ) : (
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                )}

                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No items were returned for this section.</p>
        )}
      </CardContent>
    </Card>
  );
}
