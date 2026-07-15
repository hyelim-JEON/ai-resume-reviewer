using System.Text;
using System.Text.Json;
using Azure;
using Azure.AI.OpenAI;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using OpenAI.Chat;
using UglyToad.PdfPig;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var endpoint = builder.Configuration["AzureOpenAI:Endpoint"];
var apiKey = builder.Configuration["AzureOpenAI:ApiKey"];
var deploymentName = builder.Configuration["AzureOpenAI:DeploymentName"];

if (string.IsNullOrWhiteSpace(endpoint))
{
    throw new InvalidOperationException(
        "AzureOpenAI:Endpoint is missing from user secrets."
    );
}

if (string.IsNullOrWhiteSpace(apiKey))
{
    throw new InvalidOperationException(
        "AzureOpenAI:ApiKey is missing from user secrets."
    );
}

if (string.IsNullOrWhiteSpace(deploymentName))
{
    throw new InvalidOperationException(
        "AzureOpenAI:DeploymentName is missing from user secrets."
    );
}

var azureClient = new AzureOpenAIClient(
    new Uri(endpoint),
    new AzureKeyCredential(apiKey)
);

var chatClient = azureClient.GetChatClient(deploymentName);

builder.Services.AddSingleton(chatClient);

var app = builder.Build();

app.UseCors("Frontend");

app.MapGet("/", () => new
{
    message = "ResumeFit AI backend is running.",
    deployment = deploymentName
});

app.MapPost(
    "/api/analyze",
    async (
        HttpRequest request,
        ChatClient client,
        CancellationToken cancellationToken
    ) =>
    {
        try
        {
            if (!request.HasFormContentType)
            {
                return Results.BadRequest(new
                {
                    message = "The request must use multipart/form-data."
                });
            }

            var form = await request.ReadFormAsync(cancellationToken);

            var resume = form.Files.GetFile("resume");
            var jobDescription = form["jobDescription"].ToString();

            if (resume is null || resume.Length == 0)
            {
                return Results.BadRequest(new
                {
                    message = "Please upload a resume."
                });
            }

            if (resume.Length > 5 * 1024 * 1024)
            {
                return Results.BadRequest(new
                {
                    message = "The resume must be smaller than 5 MB."
                });
            }

            if (string.IsNullOrWhiteSpace(jobDescription)
                || jobDescription.Length < 50)
            {
                return Results.BadRequest(new
                {
                    message = "Please provide a detailed job description."
                });
            }

            var extension = Path
                .GetExtension(resume.FileName)
                .ToLowerInvariant();

            if (extension is not ".pdf" and not ".docx")
            {
                return Results.BadRequest(new
                {
                    message = "Only PDF and DOCX resumes are supported."
                });
            }

            string resumeText;

            await using (var resumeStream = resume.OpenReadStream())
            {
                resumeText = extension switch
                {
                    ".pdf" => ExtractPdfText(resumeStream),
                    ".docx" => ExtractDocxText(resumeStream),
                    _ => throw new InvalidOperationException(
                        "Unsupported file type."
                    )
                };
            }

            if (string.IsNullOrWhiteSpace(resumeText))
            {
                return Results.BadRequest(new
                {
                    message =
                        "No readable text was found in the resume. " +
                        "The PDF may be a scanned image."
                });
            }

            // Prevent an unexpectedly large prompt.
            const int maximumResumeCharacters = 30_000;
            const int maximumJobDescriptionCharacters = 20_000;

            resumeText = Truncate(
                resumeText,
                maximumResumeCharacters
            );

            jobDescription = Truncate(
                jobDescription,
                maximumJobDescriptionCharacters
            );

            var systemPrompt = """
            You are an expert technical recruiter and resume reviewer.

            Compare the candidate's resume with the supplied job description.

            Return only valid JSON.
            Do not use Markdown.
            Do not use code fences.
            Do not invent experience, qualifications, achievements or skills.

            Use exactly this JSON structure:

            {
              "score": 0,
              "strengths": [
                "string"
              ],
              "missingSkills": [
                "string"
              ],
              "suggestions": [
                "string"
              ],
              "interviewQuestions": [
                "string"
              ]
            }

            Rules:
            - score must be an integer between 0 and 100.
            - Base the score only on evidence contained in the resume.
            - strengths must identify relevant experience actually shown.
            - missingSkills must identify requirements absent or unclear.
            - Never tell the candidate to claim experience they do not have.
            - suggestions must be truthful and practical.
            - interviewQuestions should reflect the role and resume.
            - Return 3 to 5 items in every array.
            """;

            var userPrompt = $"""
            RESUME:

            {resumeText}

            JOB DESCRIPTION:

            {jobDescription}
            """;

            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(systemPrompt),
                new UserChatMessage(userPrompt)
            };

            ChatCompletion completion =
                await client.CompleteChatAsync(
                    messages,
                    cancellationToken: cancellationToken
                );

            var rawResponse = completion.Content.FirstOrDefault()?.Text;

            if (string.IsNullOrWhiteSpace(rawResponse))
            {
                return Results.Problem(
                    title: "Empty AI response",
                    detail: "Azure OpenAI returned no analysis.",
                    statusCode: StatusCodes.Status502BadGateway
                );
            }

            var result = JsonSerializer.Deserialize<AnalysisResult>(
                rawResponse,
                new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }
            );

            if (result is null)
            {
                return Results.Problem(
                    title: "Invalid AI response",
                    detail:
                        "Azure OpenAI did not return the expected result.",
                    statusCode: StatusCodes.Status502BadGateway
                );
            }

            return Results.Ok(result);
        }
        catch (JsonException exception)
        {
            Console.Error.WriteLine(exception);

            return Results.Problem(
                title: "Unable to read the AI response",
                detail:
                    "Azure OpenAI did not return valid JSON.",
                statusCode: StatusCodes.Status502BadGateway
            );
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine(exception);

            return Results.Problem(
                title: "Resume analysis failed",
                detail: exception.Message,
                statusCode: StatusCodes.Status500InternalServerError
            );
        }
    }
)
.DisableAntiforgery();

app.Run();

static string ExtractPdfText(Stream stream)
{
    var text = new StringBuilder();

    using var document = PdfDocument.Open(stream);

    foreach (var page in document.GetPages())
    {
        text.AppendLine(page.Text);
    }

    return text.ToString();
}

static string ExtractDocxText(Stream stream)
{
    using var document = WordprocessingDocument.Open(
        stream,
        false
    );

    var body = document.MainDocumentPart?
        .Document
        .Body;

    if (body is null)
    {
        return string.Empty;
    }

    var paragraphs = body.Descendants<Paragraph>();

    return string.Join(
        Environment.NewLine,
        paragraphs.Select(paragraph => paragraph.InnerText)
    );
}

static string Truncate(string value, int maximumLength)
{
    return value.Length <= maximumLength
        ? value
        : value[..maximumLength];
}

record AnalysisResult(
    int Score,
    List<string> Strengths,
    List<string> MissingSkills,
    List<string> Suggestions,
    List<string> InterviewQuestions
);